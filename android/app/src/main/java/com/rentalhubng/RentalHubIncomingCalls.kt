package com.rentalhubng

import android.app.*
import android.content.*
import android.media.AudioAttributes
import android.net.Uri
import android.os.*
import android.view.Gravity
import android.widget.*
import androidx.core.app.NotificationCompat
import androidx.core.app.Person
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.*
import com.facebook.react.uimanager.ViewManager
import com.google.firebase.messaging.RemoteMessage
import expo.modules.notifications.service.ExpoFirebaseMessagingService
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

object IncomingCalls {
  private const val PREFS = "rentalhub_incoming_calls"
  private val worker = Executors.newSingleThreadExecutor()
  @Volatile private var active = false
  private fun prefs(c: Context) = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
  private fun manager(c: Context) = c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
  private fun identifier(id: String) = "call:$id".hashCode()
  private fun validId(id: String) = id.matches(Regex("[0-9a-fA-F-]{36}"))
  fun expiry(data: JSONObject): Long = try { java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US).apply { timeZone = java.util.TimeZone.getTimeZone("UTC"); isLenient = false }.parse(data.optString("expiresAt"))?.time ?: 0L } catch (_: Exception) { 0L }
  fun foreground(c: Context) = active
  fun current(c: Context): JSONObject? = try {
    val data = JSONObject(prefs(c).getString("call", "") ?: "")
    if (valid(c, data)) data else null
  } catch (_: Exception) { null }
  fun owns(c: Context, data: JSONObject) = data.optString("receiverId") == prefs(c).getString("user", "") && data.optString("receiverId").isNotEmpty()
  private fun valid(c: Context, data: JSONObject): Boolean {
    val remaining = expiry(data) - System.currentTimeMillis()
    return owns(c, data) && validId(data.optString("callId")) && remaining in 1..90000 && data.optString("alertToken").isNotEmpty() && prefs(c).getLong("closed:${data.optString("callId")}", 0) < System.currentTimeMillis()
  }
  fun configure(c: Context, user: String, active: Boolean) {
    if (prefs(c).getString("user", "") != user) {
      current(c)?.let { manager(c).cancel(identifier(it.optString("callId"))) }
      prefs(c).edit().clear().putString("user", user).apply()
    }
    setForeground(c, active)
  }
  @Synchronized fun setForeground(c: Context, active: Boolean) {
    this.active = active
    val data = current(c) ?: return
    if (active) manager(c).cancel(identifier(data.optString("callId"))) else present(c, data)
  }
  fun receive(c: Context, data: JSONObject) {
    if (!owns(c, data) || !validId(data.optString("callId"))) return
    if (data.optString("type") == "call_cancelled") { close(c, data.optString("callId")); return }
    if (!valid(c, data)) return
    val old = current(c)
    if (old != null && old.optString("callId") != data.optString("callId") && valid(c, old)) return
    prefs(c).edit().putString("call", data.toString()).apply()
    if (!foreground(c)) try { present(c, data).get(9, java.util.concurrent.TimeUnit.SECONDS) } catch (_: Exception) {}
  }
  private fun request(data: JSONObject, decline: Boolean): Boolean {
    val url = "https://rentalhub.com.ng/api/voice/calls/${data.optString("callId")}/notification-${if (decline) "decline" else "status"}"
    val connection = URL(url).openConnection() as HttpURLConnection
    try {
      connection.connectTimeout = 4000; connection.readTimeout = 4000
      connection.instanceFollowRedirects = false
      connection.requestMethod = if (decline) "POST" else "GET"
      connection.setRequestProperty("Authorization", "Bearer ${data.optString("alertToken")}")
      connection.setRequestProperty("X-RentalHub-Client", "native")
      if (connection.responseCode != 200) return false
      val result = JSONObject(connection.inputStream.bufferedReader().use { it.readText() })
      return result.optBoolean("success") && (decline || result.optBoolean("ringing"))
    } finally { connection.disconnect() }
  }
  private fun pending(c: Context, id: String, action: String, activity: Boolean): PendingIntent {
    val intent = Intent(c, if (activity) IncomingCallActivity::class.java else IncomingCallDeclineReceiver::class.java)
      .setAction(action).setData(Uri.parse("rentalhub-internal://call/$id/$action")).putExtra("callId", id)
    return if (activity) PendingIntent.getActivity(c, identifier(id + action), intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
      else PendingIntent.getBroadcast(c, identifier(id + action), intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }
  private fun present(c: Context, data: JSONObject): java.util.concurrent.Future<*> {
    return worker.submit {
      try {
        if (!valid(c, data) || !request(data, false) || foreground(c) || current(c)?.optString("callId") != data.optString("callId")) return@submit
        val sound = data.optString("sound").let { if (it in listOf("normal", "greeting", "silent")) it else "normal" }
        val channelId = "incoming-$sound-v2"
        val nm = manager(c)
        if (Build.VERSION.SDK_INT >= 26) {
          val channel = NotificationChannel(channelId, "Incoming calls: $sound", NotificationManager.IMPORTANCE_HIGH)
          channel.setShowBadge(false); channel.enableVibration(sound != "silent")
          val uri = if (sound == "silent") null else Uri.parse("android.resource://${c.packageName}/raw/call_$sound")
          channel.setSound(uri, AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE).build())
          nm.createNotificationChannel(channel)
        }
        val id = data.optString("callId")
        val answer = pending(c, id, "answer", true)
        val decline = pending(c, id, "decline", false)
        val fullScreen = pending(c, id, "show", true)
        val person = Person.Builder().setName(data.optString("callerName", "RentalHub caller").take(120)).setImportant(true).build()
        val notification = NotificationCompat.Builder(c, channelId)
          .setSmallIcon(R.mipmap.ic_launcher).setContentTitle("Incoming RentalHub call")
          .setContentText(person.name).setCategory(NotificationCompat.CATEGORY_CALL)
          .setPriority(NotificationCompat.PRIORITY_MAX).setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
          .setOngoing(true).setAutoCancel(false).setOnlyAlertOnce(true).setNumber(0)
          .setTimeoutAfter((expiry(data) - System.currentTimeMillis()).coerceAtLeast(1))
          .setContentIntent(fullScreen).setFullScreenIntent(fullScreen, true)
          .setStyle(NotificationCompat.CallStyle.forIncomingCall(person, decline, answer))
          .setDeleteIntent(decline)
        if (Build.VERSION.SDK_INT < 26 && sound != "silent") notification.setSound(Uri.parse("android.resource://${c.packageName}/raw/call_$sound"))
        val built = notification.build()
        if (sound != "silent") built.flags = built.flags or Notification.FLAG_INSISTENT
        synchronized(this@IncomingCalls) { if (valid(c, data) && !foreground(c)) nm.notify(identifier(id), built) }
      } catch (_: Exception) { /* Notification permission or network failure must not crash startup. */ }
    }
  }
  @Synchronized fun close(c: Context, id: String) {
    if (!validId(id)) return
    manager(c).cancel(identifier(id))
    val edit = prefs(c).edit().putLong("closed:$id", System.currentTimeMillis() + 90000)
    for ((key, value) in prefs(c).all) if (key.startsWith("closed:") && value is Long && value < System.currentTimeMillis()) edit.remove(key)
    if (current(c)?.optString("callId") == id) edit.remove("call")
    edit.apply()
  }
  fun decline(c: Context, id: String, finished: () -> Unit) {
    val data = current(c)
    val authorized = data != null && data.optString("callId") == id && valid(c, data)
    close(c, id)
    worker.execute { try { if (authorized) request(data!!, true) } catch (_: Exception) {} finally { finished() } }
  }
  fun answer(c: Context, id: String) {
    val data = current(c) ?: return
    if (data.optString("callId") != id || !valid(c, data)) return
    manager(c).cancel(identifier(id))
    prefs(c).edit().putString("answer", data.toString()).apply()
    c.startActivity(Intent(c, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP))
  }
  fun consumeAnswer(c: Context): String? {
    val raw = prefs(c).getString("answer", null) ?: return null
    prefs(c).edit().remove("answer").apply()
    val data = try { JSONObject(raw) } catch (_: Exception) { return null }
    return if (valid(c, data)) JSONObject().put("callId", data.optString("callId")).put("receiverId", data.optString("receiverId")).put("expiresAt", data.optString("expiresAt")).toString() else null
  }
}

class RentalHubMessagingService : ExpoFirebaseMessagingService() {
  override fun onMessageReceived(message: RemoteMessage) {
    val data = try { JSONObject(message.data["body"] ?: "{}") } catch (_: Exception) { JSONObject() }
    if (data.has("receiverId") && !IncomingCalls.owns(this, data)) return
    if (data.optString("type") in listOf("incoming_call", "call_cancelled")) {
      IncomingCalls.receive(this, data)
      if (IncomingCalls.foreground(this) && data.optString("type") == "incoming_call") super.onMessageReceived(message)
    } else super.onMessageReceived(message)
  }
}

class IncomingCallDeclineReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val result = goAsync()
    IncomingCalls.decline(context, intent.getStringExtra("callId") ?: "") { result.finish() }
  }
}

class IncomingCallActivity : Activity() {
  private val handler = Handler(Looper.getMainLooper())
  private val check = object : Runnable { override fun run() {
    val call = IncomingCalls.current(this@IncomingCallActivity)
    if (call == null || call.optString("callId") != intent.getStringExtra("callId")) finish() else handler.postDelayed(this, 500)
  } }
  override fun onCreate(state: Bundle?) {
    super.onCreate(state)
    if (Build.VERSION.SDK_INT >= 27) { setShowWhenLocked(true); setTurnScreenOn(true) }
    else window.addFlags(android.view.WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or android.view.WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON)
    val data = IncomingCalls.current(this) ?: run { finish(); return }
    if (data.optString("callId") != intent.getStringExtra("callId")) { finish(); return }
    val remaining = IncomingCalls.expiry(data) - System.currentTimeMillis()
    if (remaining <= 0) { finish(); return }
    val id = data.optString("callId")
    val keyguard = getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
    fun accept() {
      if (Build.VERSION.SDK_INT >= 26 && keyguard.isKeyguardLocked) keyguard.requestDismissKeyguard(this, object : KeyguardManager.KeyguardDismissCallback() { override fun onDismissSucceeded() { IncomingCalls.answer(this@IncomingCallActivity, id); finish() } })
      else { IncomingCalls.answer(this, id); finish() }
    }
    val layout = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER; setPadding(32, 32, 32, 32); setBackgroundColor(0xff071a3d.toInt()) }
    layout.addView(TextView(this).apply { text = "Amana RentalHub NG"; textSize = 25f; gravity = Gravity.CENTER; setTextColor(-1) })
    layout.addView(TextView(this).apply { text = if (keyguard.isKeyguardLocked) "Incoming call" else "${data.optString("callerName", "RentalHub caller")} is calling"; textSize = 21f; gravity = Gravity.CENTER; setTextColor(-1); setPadding(0, 32, 0, 40) })
    layout.addView(Button(this).apply { text = "Answer"; setOnClickListener { accept() } }, LinearLayout.LayoutParams(-1, -2))
    layout.addView(Button(this).apply { text = "Decline"; setOnClickListener { IncomingCalls.decline(this@IncomingCallActivity, id) {}; finish() } }, LinearLayout.LayoutParams(-1, -2))
    setContentView(layout)
    handler.postDelayed({ finish() }, remaining.coerceAtMost(90000))
    handler.post(check)
    if (intent.action == "answer") accept()
  }
  override fun onDestroy() { handler.removeCallbacksAndMessages(null); super.onDestroy() }
}

class RentalHubIncomingCallsModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName() = "RentalHubIncomingCalls"
  @ReactMethod fun configure(userId: String, foreground: Boolean) = IncomingCalls.configure(reactApplicationContext, userId, foreground)
  @ReactMethod fun setForeground(active: Boolean) = IncomingCalls.setForeground(reactApplicationContext, active)
  @ReactMethod fun dismiss(callId: String) = IncomingCalls.close(reactApplicationContext, callId)
  @ReactMethod fun consumeAnswer(promise: Promise) = promise.resolve(IncomingCalls.consumeAnswer(reactApplicationContext))
  @ReactMethod fun canUseFullScreen(promise: Promise) {
    val manager = reactApplicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    promise.resolve(Build.VERSION.SDK_INT < 34 || manager.canUseFullScreenIntent())
  }
  @ReactMethod fun openCallSettings() {
    val action = if (Build.VERSION.SDK_INT >= 34) "android.settings.MANAGE_APP_USE_FULL_SCREEN_INTENT" else android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS
    try { reactApplicationContext.startActivity(Intent(action, Uri.parse("package:${reactApplicationContext.packageName}")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) } catch (_: Exception) {}
  }
}

class RentalHubIncomingCallsPackage : ReactPackage {
  override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> = listOf(RentalHubIncomingCallsModule(context))
  override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}
