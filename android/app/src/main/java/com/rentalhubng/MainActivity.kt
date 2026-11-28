package com.rentalhubng
import android.os.Bundle
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import expo.modules.ReactActivityDelegateWrapper
import com.swmansion.rnscreens.fragment.restoration.RNScreensFragmentFactory

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "RentalHubMobile"

  override fun onCreate(savedInstanceState: Bundle?) {
    installSplashScreen()
    supportFragmentManager.fragmentFactory = RNScreensFragmentFactory()
    super.onCreate(savedInstanceState)
  }

  override fun onResume() {
    super.onResume()
    IncomingCalls.setActivityResumed(this, true)
  }

  override fun onPause() {
    IncomingCalls.setActivityResumed(this, false)
    super.onPause()
  }

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      ReactActivityDelegateWrapper(this, BuildConfig.IS_NEW_ARCHITECTURE_ENABLED, DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled))
}
