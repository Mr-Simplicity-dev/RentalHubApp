package com.rentalhubng

import android.app.DownloadManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.Settings
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
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
      if (destinationFile.exists()) {
        destinationFile.delete()
      }

      val request = DownloadManager.Request(Uri.parse(apkUrl))
        .setTitle("RentalHub update")
        .setDescription("Downloading the latest RentalHub app.")
        .setMimeType(APK_MIME_TYPE)
        .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
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

      val receiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
          val completedId = intent?.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1L)
          if (completedId != downloadId) return

          try {
            reactContext.unregisterReceiver(this)
          } catch (_: Exception) {
            // Receiver may already be unregistered if Android delivers duplicate events.
          }

          val query = DownloadManager.Query().setFilterById(downloadId)
          downloadManager.query(query).use { cursor ->
            if (cursor == null || !cursor.moveToFirst()) {
              promise.reject("APK_DOWNLOAD_MISSING", "RentalHub update download could not be found.")
              return
            }

            val statusIndex = cursor.getColumnIndex(DownloadManager.COLUMN_STATUS)
            val reasonIndex = cursor.getColumnIndex(DownloadManager.COLUMN_REASON)
            val status = cursor.getInt(statusIndex)
            if (status != DownloadManager.STATUS_SUCCESSFUL) {
              val reason = if (reasonIndex >= 0) cursor.getInt(reasonIndex) else 0
              promise.reject(
                "APK_DOWNLOAD_FAILED",
                "RentalHub update download failed. Android reason code: $reason."
              )
              return
            }
          }

          try {
            openInstaller(destinationFile)
            promise.resolve(true)
          } catch (error: Exception) {
            promise.reject("APK_INSTALLER_FAILED", error.message, error)
          }
        }
      }

      val filter = IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        reactContext.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
      } else {
        reactContext.registerReceiver(receiver, filter)
      }
    } catch (error: Exception) {
      promise.reject("APK_UPDATE_FAILED", error.message, error)
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
  }
}
