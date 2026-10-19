import java.util.Properties

plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

// Release signing credentials are supplied OUTSIDE version control, in
// android/key.properties (git-ignored). See apps/mobile/android/key.properties.example.
// When that file is absent — a fresh clone, or CI without secrets — the release
// build falls back to the debug key so `flutter build apk --release` still runs,
// and the app prints a warning at build time instead of failing silently.
//
// Note: `Properties` is imported rather than written as `java.util.Properties()`
// — in a project build script the qualified form fails to resolve ("Unresolved
// reference: util"), which broke every release build.
val keystorePropertiesFile = rootProject.file("key.properties")
val keystoreProperties = Properties()
val hasReleaseSigning = keystorePropertiesFile.exists().also { exists ->
    if (exists) keystorePropertiesFile.inputStream().use { keystoreProperties.load(it) }
}

android {
    namespace = "in.gov.dmis.dmis_mobile"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_11.toString()
    }

    defaultConfig {
        applicationId = "in.gov.dmis.dmis_mobile"
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        if (hasReleaseSigning) {
            create("release") {
                keyAlias = keystoreProperties.getProperty("keyAlias") as String
                keyPassword = keystoreProperties.getProperty("keyPassword") as String
                storeFile = keystoreProperties.getProperty("storeFile")?.let { file(it) }
                storePassword = keystoreProperties.getProperty("storePassword") as String
            }
        }
    }

    buildTypes {
        release {
            signingConfig =
                if (hasReleaseSigning) {
                    signingConfigs.getByName("release")
                } else {
                    logger.warn(
                        "DMIS: android/key.properties not found — building release with the DEBUG signing key. " +
                            "Do not distribute this APK/AAB."
                    )
                    signingConfigs.getByName("debug")
                }
        }
    }
}

flutter {
    source = "../.."
}
