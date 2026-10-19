/// Runtime configuration.
///
/// The base URL is a compile-time define so the same build can point at a local
/// API, a laptop on the LAN, or a deployed environment:
///
///   flutter run --dart-define=DMIS_API_URL=https://api.dmis.gov.in/api
///
/// The DEFAULT is the production API, because a plain `flutter run` /
/// `flutter build apk` must work on a real phone: emulator-only aliases such
/// as `10.0.2.2` or `localhost:4000` are not routable from physical hardware,
/// and a build pointing at them can only ever fail with a timeout.
///
/// Local development therefore has to be requested explicitly:
///
///   flutter run --dart-define=DMIS_API_URL=http://10.0.2.2:4000/api   # Android emulator
///   flutter run --dart-define=DMIS_API_URL=http://127.0.0.1:4000/api   # iOS simulator
///
/// `test/config_test.dart` pins these invariants so the default can never
/// silently drift back to a development address.
class AppConfig {
  const AppConfig._();

  /// Production API. Overridable only via `--dart-define=DMIS_API_URL=…`.
  static const String apiBaseUrl = String.fromEnvironment(
    'DMIS_API_URL',
    defaultValue: 'https://dmis-api.onrender.com/api',
  );

  /// Reference address for iOS simulators, used when documenting or passing a
  /// `--dart-define` override. Never the default — see [apiBaseUrl].
  static const String iosDefaultApiBaseUrl = 'http://127.0.0.1:4000/api';

  static const Duration requestTimeout = Duration(seconds: 20);

  static const String appName = 'DMIS Field';
  static const String appTagline = 'Disaster Management Information System';
}
