package com.rentalhubng

import androidx.activity.ComponentActivity
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.bridge.WritableMap
import com.paystack.android.ui.paymentsheet.PaymentSheet
import com.paystack.android.ui.paymentsheet.PaymentSheetResult
import com.paystack.android.ui.paymentsheet.PaymentSheetResultCallback

class RentalHubPaystackModule(
  reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext), PaymentSheetResultCallback {
  private var pendingPromise: Promise? = null
  private var pendingReference: String = ""

  override fun getName(): String = "RentalHubPaystack"

  @ReactMethod
  fun isAvailable(promise: Promise) {
    promise.resolve(getCurrentActivity() is ComponentActivity)
  }

  @ReactMethod
  fun launch(accessCode: String?, fallbackReference: String?, promise: Promise) {
    val sanitizedAccessCode = accessCode?.trim().orEmpty()
    if (sanitizedAccessCode.isEmpty()) {
      promise.reject("E_PAYSTACK_ACCESS_CODE", "Paystack access code is required.")
      return
    }

    val activity = getCurrentActivity() as? ComponentActivity
    if (activity == null) {
      promise.reject("E_PAYSTACK_ACTIVITY", "Paystack checkout requires an active Android activity.")
      return
    }

    if (pendingPromise != null) {
      promise.reject("E_PAYSTACK_IN_PROGRESS", "A Paystack checkout is already in progress.")
      return
    }

    pendingPromise = promise
    pendingReference = fallbackReference?.trim().orEmpty()

    UiThreadUtil.runOnUiThread {
      try {
        PaymentSheet(activity, this).launch(sanitizedAccessCode)
      } catch (error: Throwable) {
        rejectAndClear("E_PAYSTACK_LAUNCH", error.message ?: "Could not launch Paystack checkout.", error)
      }
    }
  }

  override fun onPaymentResult(paymentSheetResult: PaymentSheetResult) {
    val promise = pendingPromise ?: return
    val result: WritableMap = Arguments.createMap()

    when (paymentSheetResult) {
      is PaymentSheetResult.Completed -> {
        result.putString("status", "completed")
        result.putString(
          "reference",
          paymentSheetResult.paymentCompletionDetails.reference.ifBlank { pendingReference }
        )
        promise.resolve(result)
      }

      is PaymentSheetResult.Failed -> {
        result.putString("status", "failed")
        result.putString("reference", paymentSheetResult.reference ?: pendingReference)
        result.putString(
          "message",
          paymentSheetResult.error.message ?: "Paystack payment failed."
        )
        promise.resolve(result)
      }

      is PaymentSheetResult.Cancelled -> {
        result.putString("status", "cancelled")
        result.putString("reference", pendingReference)
        result.putString("message", "Payment was cancelled.")
        promise.resolve(result)
      }
    }

    clearPending()
  }

  private fun rejectAndClear(code: String, message: String, throwable: Throwable? = null) {
    pendingPromise?.reject(code, message, throwable)
    clearPending()
  }

  private fun clearPending() {
    pendingPromise = null
    pendingReference = ""
  }
}
