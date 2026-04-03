# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# ============================================================
# React Native core
# ============================================================
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-dontwarn com.facebook.react.**
-dontwarn com.facebook.hermes.**

# ============================================================
# react-native-reanimated + worklets
# ============================================================
-keep class com.swmansion.reanimated.** { *; }
-keep class com.swmansion.worklets.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# ============================================================
# react-native-nitro-modules
# ============================================================
-keep class com.margelo.nitro.** { *; }
-dontwarn com.margelo.nitro.**

# ============================================================
# react-native-health-connect
# ============================================================
-keep class dev.matinzd.healthconnect.** { *; }
-dontwarn dev.matinzd.healthconnect.**
-keep class androidx.health.connect.** { *; }
-dontwarn androidx.health.connect.**

# ============================================================
# Google Play Services Wearable (WearSyncModule)
# ============================================================
-keep class com.google.android.gms.wearable.** { *; }
-dontwarn com.google.android.gms.wearable.**

# ============================================================
# react-native-maps
# ============================================================
-keep class com.airbnb.android.react.maps.** { *; }
-dontwarn com.airbnb.android.react.maps.**

# ============================================================
# Expo modules
# ============================================================
-keep class expo.modules.** { *; }
-dontwarn expo.modules.**

# ============================================================
# react-native-gesture-handler
# ============================================================
-keep class com.swmansion.gesturehandler.** { *; }

# ============================================================
# react-native-screens
# ============================================================
-keep class com.swmansion.rnscreens.** { *; }

# ============================================================
# react-native-svg
# ============================================================
-keep class com.horcrux.svg.** { *; }

# ============================================================
# Lottie
# ============================================================
-keep class com.airbnb.lottie.** { *; }
-dontwarn com.airbnb.lottie.**

# ============================================================
# Modules natifs Yoroi (widgets + wear)
# ============================================================
-keep class com.houari.yoroi.** { *; }

# ============================================================
# Kotlin reflection (needed by various libraries)
# ============================================================
-keep class kotlin.** { *; }
-dontwarn kotlin.**

# Add any project specific keep options here:
