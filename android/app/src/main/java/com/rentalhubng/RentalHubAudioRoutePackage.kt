package com.rentalhubng

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.media.AudioDeviceCallback
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.os.Build
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.uimanager.ViewManager

class RentalHubAudioRouteModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  private val audio = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
  private var listening = false

  private val audioDeviceCallback = object : AudioDeviceCallback() {
    override fun onAudioDevicesAdded(addedDevices: Array<out AudioDeviceInfo>?) {
      emitState()
    }

    override fun onAudioDevicesRemoved(removedDevices: Array<out AudioDeviceInfo>?) {
      emitState()
    }
  }

  private val scoReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
      emitState()
    }
  }

  init {
    try {
      audio.registerAudioDeviceCallback(audioDeviceCallback, null)
      context.registerReceiver(scoReceiver, IntentFilter(AudioManager.ACTION_SCO_AUDIO_STATE_UPDATED))
      listening = true
    } catch (_: Exception) {
      listening = false
    }
  }

  override fun getName() = "RentalHubAudioRoute"

  private fun outputDevices(): Array<AudioDeviceInfo> {
    return try {
      audio.getDevices(AudioManager.GET_DEVICES_OUTPUTS)
    } catch (_: Exception) {
      emptyArray()
    }
  }

  private fun isBluetoothAvailable(): Boolean {
    if (audio.isBluetoothScoOn) return true
    return outputDevices().any { device ->
      device.type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO ||
        device.type == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP ||
        (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && device.type == AudioDeviceInfo.TYPE_BLUETOOTH_LE)
    }
  }

  private fun isWiredAvailable(): Boolean {
    return outputDevices().any { device ->
      device.type == AudioDeviceInfo.TYPE_WIRED_HEADSET ||
        device.type == AudioDeviceInfo.TYPE_WIRED_HEADPHONES ||
        device.type == AudioDeviceInfo.TYPE_USB_HEADSET ||
        device.type == AudioDeviceInfo.TYPE_USB_DEVICE
    }
  }

  private fun routeState(supported: Boolean = true): WritableMap {
    val available = Arguments.createArray()
    available.pushString("earpiece")
    available.pushString("speaker")
    if (isBluetoothAvailable()) available.pushString("bluetooth")
    if (isWiredAvailable()) available.pushString("wired")

    val route = when {
      audio.isBluetoothScoOn || outputDevices().any { it.type == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP } -> "bluetooth"
      isWiredAvailable() -> "wired"
      audio.isSpeakerphoneOn -> "speaker"
      else -> "earpiece"
    }

    return Arguments.createMap().apply {
      putString("route", route)
      putArray("available", available)
      putBoolean("supported", supported)
    }
  }

  private fun emitState() {
    try {
      reactApplicationContext.runOnUiQueueThread {
        try {
          reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("RentalHubAudioRouteChanged", routeState())
        } catch (_: Exception) {}
      }
    } catch (_: Exception) {}
  }

  @ReactMethod
  fun getState(promise: Promise) {
    promise.resolve(routeState(listening))
  }

  @ReactMethod
  fun setRoute(route: String, promise: Promise) {
    try {
      when (route) {
        "speaker" -> {
          try { audio.stopBluetoothSco() } catch (_: Exception) {}
          audio.isBluetoothScoOn = false
          audio.isSpeakerphoneOn = true
        }
        "earpiece", "wired" -> {
          audio.isSpeakerphoneOn = false
          audio.isBluetoothScoOn = false
          try { audio.stopBluetoothSco() } catch (_: Exception) {}
        }
        "bluetooth" -> {
          if (!isBluetoothAvailable()) {
            promise.reject("NO_BLUETOOTH_DEVICE", "Connect a Bluetooth audio device first.")
            return
          }
          audio.isSpeakerphoneOn = false
          try { audio.startBluetoothSco() } catch (_: Exception) {}
          audio.isBluetoothScoOn = true
        }
        else -> {
          promise.reject("UNKNOWN_ROUTE", "Unsupported audio route.")
          return
        }
      }
      emitState()
      promise.resolve(routeState())
    } catch (error: Exception) {
      promise.reject("AUDIO_ROUTE_FAILED", error.message)
    }
  }

  @ReactMethod
  fun restore(promise: Promise) {
    try {
      audio.isSpeakerphoneOn = false
      audio.isBluetoothScoOn = false
      try { audio.stopBluetoothSco() } catch (_: Exception) {}
      if (audio.mode == AudioManager.MODE_IN_CALL) audio.mode = AudioManager.MODE_NORMAL
      promise.resolve(routeState())
    } catch (error: Exception) {
      promise.reject("AUDIO_ROUTE_FAILED", error.message)
    }
  }

  override fun onCatalystInstanceDestroy() {
    try {
      if (listening) {
        audio.unregisterAudioDeviceCallback(audioDeviceCallback)
        reactApplicationContext.unregisterReceiver(scoReceiver)
        listening = false
      }
    } catch (_: Exception) {}
    super.onCatalystInstanceDestroy()
  }
}

class RentalHubAudioRoutePackage : ReactPackage {
  override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> =
    listOf(RentalHubAudioRouteModule(context))

  override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}
