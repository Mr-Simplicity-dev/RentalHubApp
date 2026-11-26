package com.rentalhubng

import android.app.NotificationManager
import android.content.Context
import android.media.AudioManager
import android.os.Build
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.uimanager.ViewManager

class RentalHubCallSoundModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName() = "RentalHubCallSound"

  @ReactMethod
  fun canPlay(sound: String, promise: Promise) {
    try {
      val audio = reactApplicationContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
      val notifications = reactApplicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      var allowed = audio.ringerMode == AudioManager.RINGER_MODE_NORMAL && audio.getStreamVolume(AudioManager.STREAM_RING) > 0
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        allowed = allowed && notifications.currentInterruptionFilter == NotificationManager.INTERRUPTION_FILTER_ALL
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val incomingChannel = notifications.getNotificationChannel("incoming-${if (sound == "greeting") "greeting" else "normal"}-v2")
        val channel = incomingChannel ?: notifications.getNotificationChannel("calls-${if (sound == "greeting") "greeting" else "normal"}-v1")
        if (channel != null) allowed = allowed && channel.importance != NotificationManager.IMPORTANCE_NONE && channel.sound != null
      }
      promise.resolve(allowed)
    } catch (_: Exception) {
      promise.resolve(false)
    }
  }
}

class RentalHubCallSoundPackage : ReactPackage {
  override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> = listOf(RentalHubCallSoundModule(context))
  override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}
