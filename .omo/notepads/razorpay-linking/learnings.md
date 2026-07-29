# Razorpay Native Module Manual Linking - Learnings

## Key Finding
 `react-native-razorpay@2.3.1` has empty autolinking config (`"react-native": {}`) in package.json
 Expo's autolinking skips it entirely, so `RazorpayPackage` never gets registered
 This means `com.razorpay.CheckoutActivity` is absent from the merged AndroidManifest.xml

## Fix Applied (3 files)
1. **android/settings.gradle**: Added `include ':react-native-razorpay'` + `project().projectDir` pointing to `node_modules/react-native-razorpay/android`
2. **android/app/build.gradle**: Added `implementation project(':react-native-razorpay')` in dependencies block
3. **android/app/src/main/java/com/fitai/app/MainApplication.kt**: Added `packages.add(com.razorpay.rn.RazorpayPackage())` in getPackages()

## Build Notes
 APK output is `app-arm64-v8a-debug.apk` (NOT `app-debug.apk`) due to ABI splits config in build.gradle
 Build takes ~4m 23s
 Namespace warning about `com.razorpay` being used in multiple modules is expected (standard-core vs core)
 `RazorpayModule.java` has deprecated API warnings - harmless
