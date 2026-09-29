/// Runtime configuration.
///
/// The base URL is a compile-time define so the same build can point at a local
/// API, a laptop on the LAN, or a deployed environment:
///
///   flutter run --dart-define=DMIS_API_URL=https://api.dmis.gov.in/api
///
/// The default is deliberately the Android-emulator alias for the host machine's
/// loopback interface, which is the most common case during development.
class AppConfig {
  const AppConfig._();

  static const String apiBaseUrl = String.fromEnvironment(
    'DMIS_API_URL',
    defaultValue: 'http://10.0.2.2:4000/api',
  );

  /// iOS simulators share the host's loopback interface; Android emulators do
  /// not, which is why the default above is `10.0.2.2`.
  static const String iosDefaultApiBaseUrl = 'http://127.0.0.1:4000/api';

  static const Duration requestTimeout = Duration(seconds: 20);

  static const String appName = 'DMIS Field';
  static const String appTagline = 'Disaster Management Information System';
}
