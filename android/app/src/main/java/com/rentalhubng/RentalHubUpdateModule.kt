package com.rentalhubng

import android.app.DownloadManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import androidx.core.app.NotificationCompat
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.File
import java.util.Locale

class RentalHubUpdateModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "RentalHubUpdate"

  @ReactMethod
  fun canInstallUnknownApps(promise: Promise) {
    try {
      val canInstall = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        reactContext.packageManager.canRequestPackageInstalls()
      } else {
        true
      }
      promise.resolve(canInstall)
    } catch (error: Exception) {
      promise.reject("INSTALL_PERMISSION_CHECK_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun openInstallPermissionSettings(promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val intent = Intent(
          Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
          Uri.parse("package:${reactContext.packageName}")
        )
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        reactContext.startActivity(intent)
      } else {
        val intent = Intent(Settings.ACTION_SECURITY_SETTINGS)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        reactContext.startActivity(intent)
      }
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("INSTALL_PERMISSION_SETTINGS_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun downloadAndInstallApk(url: String, requestedFileName: String?, promise: Promise) {
    try {
      val apkUrl = url.trim()
      if (apkUrl.isBlank()) {
        promise.reject("MISSING_APK_URL", "No APK download URL was provided.")
        return
      }

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
        !reactContext.packageManager.canRequestPackageInstalls()
      ) {
        promise.reject(
          "INSTALL_PERMISSION_REQUIRED",
          "Allow RentalHub to install app updates from this device first."
        )
        return
      }

      val fileName = safeFileName(requestedFileName)
      val destinationDirectory = reactContext.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS)
      val destinationFile = File(destinationDirectory, fileName)

      // A previous attempt may already have this exact version on disk. Install it
      // instead of deleting a good APK and downloading the whole thing again.
      if (destinationFile.exists() && destinationFile.length() > 0L) {
        postDownloadCompleteNotification(destinationFile)
        try {
          openInstaller(destinationFile)
          promise.resolve(true)
        } catch (error: Exception) {
          promise.reject("APK_INSTALLER_FAILED", error.message, error)
        }
        return
      }

      val request = DownloadManager.Request(Uri.parse(apkUrl))
        .setTitle("RentalHub update")
        .setDescription("Downloading the latest RentalHub app.")
        .setMimeType(APK_MIME_TYPE)
        .setNotificationVisibility(DownloadManager.Request.VISIBILITY_HIDDEN)
        .setAllowedOverMetered(true)
        .setAllowedOverRoaming(false)
        .setDestinationInExternalFilesDir(
          reactContext,
          Environment.DIRECTORY_DOWNLOADS,
          fileName
        )

      val downloadManager =
        reactContext.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
      val downloadId = downloadManager.enqueue(request)

      startProgressPolling(downloadId, downloadManager, destinationFile, promise)

      val receiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
          val completedId = intent?.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1L)
          if (completedId != downloadId) return

          try {
            reactContext.unregisterReceiver(this)
          } catch (_: Exception) {
            // Receiver may already be unregistered if Android delivers duplicate events.
          }

          settleDownload(downloadId, downloadManager, destinationFile, promise)
        }
      }

      val filter = IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        // EXPORTED: DownloadManager delivers this broadcast from another process, and a
        // NOT_EXPORTED receiver silently never receives it — which is what left 1.0.7/1.0.8
        // downloads stuck (no completion notification, no installer, promise never settling).
        reactContext.registerReceiver(receiver, filter, Context.RECEIVER_EXPORTED)
      } else {
        reactContext.registerReceiver(receiver, filter)
      }
    } catch (error: Exception) {
      promise.reject("APK_UPDATE_FAILED", error.message, error)
    }
  }

  private val progressHandler = Handler(Looper.getMainLooper())
  private var progressRunnable: Runnable? = null

  private fun emitProgress(downloaded: Long, total: Long, status: Int) {
    try {
      val map = Arguments.createMap()
      val progress = if (total > 0) ((downloaded * 100) / total).toInt() else 0
      map.putInt("progress", progress.coerceIn(0, 100))
      map.putDouble("downloaded", downloaded.toDouble())
      map.putDouble("total", total.toDouble())
      map.putBoolean("indeterminate", total <= 0)
      map.putString("status", statusName(status))
      reactContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit(UPDATE_PROGRESS_EVENT, map)
    } catch (_: Exception) {
      // The JS context may be gone (app backgrounded/killed) — progress is best-effort.
    }
  }

  private fun statusName(status: Int): String = when (status) {
    DownloadManager.STATUS_PENDING -> "pending"
    DownloadManager.STATUS_RUNNING -> "running"
    DownloadManager.STATUS_PAUSED -> "paused"
    DownloadManager.STATUS_SUCCESSFUL -> "successful"
    DownloadManager.STATUS_FAILED -> "failed"
    else -> "unknown"
  }

  private fun startProgressPolling(
    downloadId: Long,
    downloadManager: DownloadManager,
    destinationFile: File,
    promise: Promise
  ) {
    stopProgressPolling()
    val runnable = object : Runnable {
      override fun run() {
        var finished = false
        try {
          val query = DownloadManager.Query().setFilterById(downloadId)
          downloadManager.query(query).use { cursor ->
            if (cursor != null && cursor.moveToFirst()) {
              val statusIdx = cursor.getColumnIndex(DownloadManager.COLUMN_STATUS)
              val downloadedIdx = cursor.getColumnIndex(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR)
              val totalIdx = cursor.getColumnIndex(DownloadManager.COLUMN_TOTAL_SIZE_BYTES)
              val status = if (statusIdx >= 0) cursor.getInt(statusIdx) else DownloadManager.STATUS_PENDING
              val downloaded = if (downloadedIdx >= 0) cursor.getLong(downloadedIdx) else 0L
              val total = if (totalIdx >= 0) cursor.getLong(totalIdx) else -1L
              emitProgress(downloaded, total, status)
              postUpdateProgressNotification(downloaded, total, status)
              finished = status == DownloadManager.STATUS_SUCCESSFUL || status == DownloadManager.STATUS_FAILED
              // This poller runs in-process, so it is the dependable completion trigger.
              // The ACTION_DOWNLOAD_COMPLETE broadcast is not reliable on its own.
              if (finished) {
                settleDownload(downloadId, downloadManager, destinationFile, promise)
              }
            } else {
              finished = true
            }
          }
        } catch (_: Exception) {
          finished = true
        }
        if (finished) {
          progressRunnable = null
        } else {
          progressHandler.postDelayed(this, PROGRESS_INTERVAL_MS)
        }
      }
    }
    progressRunnable = runnable
    progressHandler.post(runnable)
  }

  private fun stopProgressPolling() {
    progressRunnable?.let { progressHandler.removeCallbacks(it) }
    progressRunnable = null
  }

  private val completionLock = Any()
  private var settledDownloadId = -1L

  // Called from both the progress poller and the download-complete receiver; whichever
  // fires first wins and the other becomes a no-op.
  private fun settleDownload(
    downloadId: Long,
    downloadManager: DownloadManager,
    destinationFile: File,
    promise: Promise
  ) {
    synchronized(completionLock) {
      if (settledDownloadId == downloadId) return
      settledDownloadId = downloadId
    }

    stopProgressPolling()

    var status = DownloadManager.STATUS_FAILED
    var reason = 0
    try {
      val query = DownloadManager.Query().setFilterById(downloadId)
      downloadManager.query(query).use { cursor ->
        if (cursor != null && cursor.moveToFirst()) {
          val statusIndex = cursor.getColumnIndex(DownloadManager.COLUMN_STATUS)
          val reasonIndex = cursor.getColumnIndex(DownloadManager.COLUMN_REASON)
          if (statusIndex >= 0) status = cursor.getInt(statusIndex)
          if (reasonIndex >= 0) reason = cursor.getInt(reasonIndex)
        }
      }
    } catch (error: Exception) {
      promise.reject("APK_DOWNLOAD_MISSING", error.message, error)
      return
    }

    if (status != DownloadManager.STATUS_SUCCESSFUL) {
      postUpdateFailedNotification()
      promise.reject(
        "APK_DOWNLOAD_FAILED",
        "RentalHub update download failed. Android reason code: $reason."
      )
      return
    }

    postDownloadCompleteNotification(destinationFile)

    try {
      openInstaller(destinationFile)
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("APK_INSTALLER_FAILED", error.message, error)
    }
  }

  private fun ensureUpdateChannels() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager =
      reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    // One channel for both the progress and the completion state, so the same
    // notification id can transition without being pinned to a low-importance channel.
    if (manager.getNotificationChannel(UPDATE_CHANNEL_ID) == null) {
      manager.createNotificationChannel(
        NotificationChannel(
          UPDATE_CHANNEL_ID,
          "App updates",
          NotificationManager.IMPORTANCE_HIGH
        ).apply { description = "RentalHub app update downloads" }
      )
    }
  }

  private fun postUpdateProgressNotification(downloaded: Long, total: Long, status: Int) {
    if (status == DownloadManager.STATUS_SUCCESSFUL || status == DownloadManager.STATUS_FAILED) {
      return
    }
    try {
      ensureUpdateChannels()
      val manager =
        reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      val percent = if (total > 0) ((downloaded * 100) / total).toInt().coerceIn(0, 100) else 0
      val builder = NotificationCompat.Builder(reactContext, UPDATE_CHANNEL_ID)
        .setSmallIcon(android.R.drawable.stat_sys_download)
        .setContentTitle("Downloading RentalHub update")
        .setContentText(if (total > 0) "$percent% complete" else "Starting download…")
        .setOngoing(true)
        .setOnlyAlertOnce(true)
        .setSilent(true)
        .setPriority(NotificationCompat.PRIORITY_LOW)
        .setCategory(NotificationCompat.CATEGORY_PROGRESS)
      if (total > 0) {
        builder.setProgress(100, percent, false)
      } else {
        builder.setProgress(0, 0, true)
      }
      manager.notify(UPDATE_NOTIFICATION_ID, builder.build())
    } catch (_: Exception) {
      // Best-effort — in-app progress is unaffected.
    }
  }

  private fun installPendingIntent(apkFile: File): PendingIntent? {
    return try {
      val apkUri = FileProvider.getUriForFile(
        reactContext,
        "${reactContext.packageName}.fileprovider",
        apkFile
      )
      val installIntent = Intent(Intent.ACTION_VIEW)
        .setDataAndType(apkUri, APK_MIME_TYPE)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
      PendingIntent.getActivity(
        reactContext,
        0,
        installIntent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
    } catch (_: Exception) {
      null
    }
  }

  private fun postDownloadCompleteNotification(apkFile: File) {
    try {
      ensureUpdateChannels()
      val manager =
        reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      val pendingIntent = installPendingIntent(apkFile)
      val builder = NotificationCompat.Builder(reactContext, UPDATE_CHANNEL_ID)
        .setSmallIcon(android.R.drawable.stat_sys_download_done)
        .setContentTitle("RentalHub update ready")
        .setContentText("Tap to install the latest version.")
        .setAutoCancel(true)
        .setOngoing(false)
        .setOnlyAlertOnce(false)
        .setPriority(NotificationCompat.PRIORITY_HIGH)
        .setCategory(NotificationCompat.CATEGORY_STATUS)
        .setProgress(0, 0, false)
      if (pendingIntent != null) {
        builder.setContentIntent(pendingIntent)
        builder.addAction(
          android.R.drawable.stat_sys_download_done,
          "Install update",
          pendingIntent
        )
      }
      manager.notify(UPDATE_NOTIFICATION_ID, builder.build())
    } catch (_: Exception) {
      // Best-effort — the in-app installer still opens.
    }
  }

  private fun postUpdateFailedNotification() {
    try {
      ensureUpdateChannels()
      val manager =
        reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      val launchIntent = reactContext.packageManager
        .getLaunchIntentForPackage(reactContext.packageName)
        ?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      val builder = NotificationCompat.Builder(reactContext, UPDATE_CHANNEL_ID)
        .setSmallIcon(android.R.drawable.stat_notify_error)
        .setContentTitle("RentalHub update failed")
        .setContentText("The download did not finish. Open the app to try again.")
        .setAutoCancel(true)
        .setPriority(NotificationCompat.PRIORITY_DEFAULT)
      if (launchIntent != null) {
        builder.setContentIntent(
          PendingIntent.getActivity(
            reactContext,
            1,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
          )
        )
      }
      manager.notify(UPDATE_NOTIFICATION_ID, builder.build())
    } catch (_: Exception) {
      // Best-effort.
    }
  }

  @ReactMethod
  fun cancelUpdateNotification(promise: Promise) {
    try {
      val manager =
        reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      manager.cancel(UPDATE_NOTIFICATION_ID)
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("CANCEL_UPDATE_NOTIFICATION_FAILED", error.message, error)
    }
  }

  private fun openInstaller(apkFile: File) {
    val apkUri = FileProvider.getUriForFile(
      reactContext,
      "${reactContext.packageName}.fileprovider",
      apkFile
    )
    val installIntent = Intent(Intent.ACTION_VIEW)
      .setDataAndType(apkUri, APK_MIME_TYPE)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    reactContext.startActivity(installIntent)
  }

  private fun safeFileName(requestedFileName: String?): String {
    val cleaned = requestedFileName
      ?.trim()
      ?.lowercase(Locale.US)
      ?.replace(Regex("[^a-z0-9._-]"), "-")
      ?.takeIf { it.endsWith(".apk") }
    return cleaned ?: "rentalhub-update.apk"
  }

  companion object {
    private const val APK_MIME_TYPE = "application/vnd.android.package-archive"
    private const val UPDATE_PROGRESS_EVENT = "rentalHubUpdateProgress"
    private const val PROGRESS_INTERVAL_MS = 500L
    private const val UPDATE_CHANNEL_ID = "rentalhub_updates"
    private const val UPDATE_NOTIFICATION_ID = 4301
  }
}
