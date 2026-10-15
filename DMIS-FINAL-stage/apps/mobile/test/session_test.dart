import 'dart:convert';

import 'package:dmis_mobile/src/api/api_client.dart';
import 'package:dmis_mobile/src/api/api_exception.dart';
import 'package:dmis_mobile/src/api/session.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _userJson = {
  'id': 'u-1',
  'email': 'officer@dmis.gov.in',
  'name': 'Priya Sharma',
  'role': 'OFFICER',
  'phone': null,
  'isActive': true,
  'createdAt': '2026-01-01T00:00:00.000Z',
};

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));

  test('sign in stores the token, keeps the user, and persists for next launch', () async {
    final api = _apiReturning(_loginResponse());
    final session = Session(api);

    final ok = await session.signIn('officer@dmis.gov.in', 'Admin@12345');

    expect(ok, isTrue);
    expect(session.isSignedIn, isTrue);
    expect(session.user!.name, 'Priya Sharma');
    expect(session.canEdit, isTrue, reason: 'officers may update incident status');
    expect(api.token, isNotNull);
    expect(SharedPreferences.getInstance().then((p) => p.getString('dmis.token')), completion(isNotNull));
  });

  test('a failed sign in surfaces the server message and does not sign anyone in', () async {
    final api = _apiReturning(
      http.Response(
        jsonEncode({'success': false, 'error': {'code': 'INVALID_CREDENTIALS', 'message': 'Invalid email or password'}}),
        401,
      ),
    );
    final session = Session(api);

    await expectLater(session.signIn('officer@dmis.gov.in', 'wrong'), throwsA(isA<ApiException>()));
    expect(session.isSignedIn, isFalse);
    expect(session.user, isNull);
  });

  test('restore revalidates a stored token against /auth/me', () async {
    SharedPreferences.setMockInitialValues({'dmis.token': 'stored-jwt'});
    final api = _apiReturning(http.Response(jsonEncode({'success': true, 'data': _userJson}), 200));
    final session = Session(api);

    await session.restore();

    expect(session.isRestoring, isFalse);
    expect(session.isSignedIn, isTrue);
    expect(session.user!.email, 'officer@dmis.gov.in');
  });

  test('a revoked stored token is discarded instead of trusted', () async {
    SharedPreferences.setMockInitialValues({'dmis.token': 'revoked-jwt'});
    final api = _apiReturning(
      http.Response(jsonEncode({'success': false, 'error': {'code': 'UNAUTHORIZED', 'message': 'Token revoked'}}), 401),
    );
    final session = Session(api);

    await session.restore();

    expect(session.isRestoring, isFalse);
    expect(session.isSignedIn, isFalse, reason: 'a dead token must never leave the app in a signed-in state');
    expect(api.token, isNull);
  });

  test('no stored token means signed out, without hitting the network', () async {
    var calls = 0;
    final api = ApiClient(
      httpClient: MockClient((_) async {
        calls++;
        return http.Response(jsonEncode({'success': true, 'data': _userJson}), 200);
      }),
      baseUrl: 'http://localhost:4000/api',
    );
    final session = Session(api);

    await session.restore();

    expect(calls, 0);
    expect(session.isSignedIn, isFalse);
  });

  test('sign out clears the in-memory user and the persisted token', () async {
    final api = _apiReturning(_loginResponse());
    final session = Session(api);
    await session.signIn('officer@dmis.gov.in', 'Admin@12345');

    await session.signOut();

    expect(session.isSignedIn, isFalse);
    expect(api.token, isNull);
    final prefs = await SharedPreferences.getInstance();
    expect(prefs.getString('dmis.token'), isNull);
  });

  test('a 401 from any later request drops the session', () async {
    final api = _apiReturning(_loginResponse());
    final session = Session(api);
    await session.signIn('officer@dmis.gov.in', 'Admin@12345');
    api.onUnauthorized = session.handleUnauthorized;

    // Simulate the server rejecting the token on a data call.
    api.onUnauthorized!();

    expect(session.isSignedIn, isFalse);
    expect(session.lastError, contains('expired'));
  });
}

http.Response _loginResponse() => http.Response(
      jsonEncode({
        'success': true,
        'data': {'accessToken': 'jwt-abc', 'tokenType': 'Bearer', 'expiresIn': 3600, 'user': _userJson},
      }),
      200,
    );

ApiClient _apiReturning(http.Response response) => ApiClient(
      httpClient: MockClient((_) async => response),
      baseUrl: 'http://localhost:4000/api',
    );
