# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# react-native-webrtc
-keep class org.webrtc.** { *; }
-keep class com.oney.WebRTCModule.** { *; }

# react-native-keychain
-keep class com.oblador.keychain.** { *; }

# react-native-image-picker
-keep class com.imagepicker.** { *; }

# react-native-vector-icons
-keep class com.oblador.vectoricons.** { *; }

# react-native-gesture-handler
-keep class com.swmansion.gesturehandler.** { *; }
-keep class com.swmansion.reanimated.** { *; }

# react-native-screens
-keep class com.swmansion.rnscreens.** { *; }

# react-native-safe-area-context
-keep class com.th3rdwave.safeareacontext.** { *; }

# react-native-webview
-keep class com.reactnativecommunity.webview.** { *; }

# react-native-async-storage
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# expo modules
-keep class expo.modules.** { *; }
-keep class host.exp.exponent.** { *; }

# socket.io-client (uses reflection)
-keep class io.socket.** { *; }
-keep class okhttp3.** { *; }
-keep class okio.** { *; }

# react-native-toast-message
-keep class com.tomtom.toastmessage.** { *; }

# react-native-reanimated (if used)
-keep class com.swmansion.reanimated.** { *; }

# Main application
-keep class com.rentalhubng.** { *; }

# Keep all native modules that might be loaded dynamically
-keep class * extends com.facebook.react.ReactPackage { *; }
-keep class * implements com.facebook.react.bridge.NativeModule { *; }

# Keep React Native module interfaces
-keepnames class * implements com.facebook.react.bridge.JavaScriptModule { *; }
-keepnames class * implements com.facebook.react.bridge.NativeModule { *; }
-keepnames class * implements com.facebook.react.bridge.ReactContextBaseJavaModule { *; }

# Keep annotations
-keep class * extends java.lang.annotation.Annotation { *; }

# Keep serialization
-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod *;
}
