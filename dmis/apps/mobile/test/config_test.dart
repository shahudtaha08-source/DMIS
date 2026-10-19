import 'dart:convert';

import 'package:dmis_mobile/main.dart' as app;
import 'package:dmis_mobile/src/config.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Regression coverage for a shipped production incident: a physical phone
/// installed a build whose base URL was `http://10.0.2.2:4000/api` — the
/// Android *emulator* alias for the host loopback interface, unroutable from
/// real hardware. Nothing answered, so every sign-in sat for the full request
/// timeout and the login screen reported "The server took too long to respond."
///
/// These tests pin the two things that went wrong: which URL a default build
/// compiles in, and which URL the login screen both shows and actually calls.
void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));

  group('API base URL selection', () {
    test('a default build points at the production API over https', () {
      expect(AppConfig.apiBaseUrl, 'https://dmis-api.onrender.com/api');
      expect(AppConfig.apiBaseUrl, startsWith('https://'));
    });

    test('a default build never points at an emulator or loopback address', () {
      expect(AppConfig.apiBaseUrl, isNot(contains('10.0.2.2')), reason: '10.0.2.2 is unreachable from a physical device');
      expect(AppConfig.apiBaseUrl, isNot(contains('localhost')));
      expect(AppConfig.apiBaseUrl, isNot(contains('127.0.0.1')));
      expect(AppConfig.apiBaseUrl, isNot(contains(':4000')), reason: 'the local dev API port must stay a --dart-define opt-in');
    });

    test('development addresses remain available for an explicit override', () {
      // The constants themselves still exist so emulator/simulator setups can
      // be documented and passed through --dart-define=DMIS_API_URL=…
      expect(AppConfig.iosDefaultApiBaseUrl, contains('127.0.0.1'));
      expect(AppConfig.iosDefaultApiBaseUrl, isNot(AppConfig.apiBaseUrl));
    });

    test('the request timeout is finite and usable', () {
      expect(AppConfig.requestTimeout, greaterThan(const Duration(seconds: 5)));
      expect(AppConfig.requestTimeout, lessThanOrEqualTo(const Duration(minutes: 2)));
    });
  });

  testWidgets('the login screen shows the production URL when no override is injected', (tester) async {
    await tester.pumpWidget(app.DmisApp(client: _stub()));
    await tester.pumpAndSettle();

    expect(find.text('API: https://dmis-api.onrender.com/api'), findsOneWidget);
    expect(find.textContaining('10.0.2.2'), findsNothing);
    expect(find.textContaining('localhost'), findsNothing);
  });

  testWidgets('a sign-in from a default build posts to the production /auth/login route', (tester) async {
    http.Request? seen;
    final client = MockClient((req) async {
      seen = req;
      return http.Response(
        jsonEncode({'success': false, 'error': {'code': 'UNAUTHORIZED', 'message': 'Invalid email or password'}}),
        401,
      );
    });

    await tester.pumpWidget(app.DmisApp(client: client));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextFormField).at(0), 'officer@dmis.gov.in');
    await tester.enterText(find.byType(TextFormField).at(1), 'Admin@12345');
    await tester.tap(find.text('Sign in'));
    await tester.pumpAndSettle();

    expect(seen, isNotNull, reason: 'the sign-in must reach the API');
    expect(seen!.url.toString(), 'https://dmis-api.onrender.com/api/auth/login');
    expect(seen!.method, 'POST');
    expect(seen!.headers['Content-Type'], contains('application/json'));
    // Backend contract (services/api/src/modules/auth/validation.ts loginSchema).
    expect(jsonDecode(seen!.body), {'email': 'officer@dmis.gov.in', 'password': 'Admin@12345'});
    // 401 is credentials, not a connection failure — it must be reported as such.
    expect(find.text('Invalid email or password'), findsOneWidget);
    expect(find.textContaining('took too long'), findsNothing);
    expect(find.textContaining('Cannot reach'), findsNothing);
  });
}

http.Client _stub() => MockClient((_) async => http.Response(jsonEncode({'success': true, 'data': {}}), 200));
