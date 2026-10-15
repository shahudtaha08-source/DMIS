import 'dart:convert';

import 'package:dmis_mobile/src/api/api_client.dart';
import 'package:dmis_mobile/src/api/api_exception.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

/// The envelope contract is the most important thing to pin down: if the mobile
/// client and the Express API ever disagree here, every screen breaks at once.
void main() {
  group('ApiClient envelope handling', () {
    test('unwraps { success, data } and returns the payload', () async {
      final client = _clientReturning(http.Response(jsonEncode({'success': true, 'data': {'id': 'x'}}), 200));
      expect(await client.get('/incidents/x'), {'id': 'x'});
    });

    test('turns { success: false, error } into an ApiException with the server code', () async {
      final client = _clientReturning(
        http.Response(jsonEncode({'success': false, 'error': {'code': 'VALIDATION_ERROR', 'message': 'Location is required'}}), 400),
      );
      await expectLater(
        client.post('/incidents', body: {}),
        throwsA(isA<ApiException>()
            .having((e) => e.statusCode, 'statusCode', 400)
            .having((e) => e.code, 'code', 'VALIDATION_ERROR')
            .having((e) => e.message, 'message', contains('Location is required'))),
      );
    });

    test('appends field-level validation details so the UI can show them', () async {
      final client = _clientReturning(
        http.Response(
          jsonEncode({
            'success': false,
            'error': {
              'code': 'VALIDATION_ERROR',
              'message': 'Validation failed',
              'details': [
                {'field': 'description', 'message': 'Add a short description'},
              ],
            },
          }),
          422,
        ),
      );
      try {
        await client.post('/incidents', body: {});
        fail('expected an ApiException');
      } on ApiException catch (e) {
        expect(e.message, contains('Add a short description'));
      }
    });

    test('a 401 clears the session and marks the exception unauthorized', () async {
      var unauthorizedCalls = 0;
      final client = _clientReturning(
        http.Response(jsonEncode({'success': false, 'error': {'code': 'UNAUTHORIZED', 'message': 'Invalid or expired token'}}), 401),
      )..onUnauthorized = () => unauthorizedCalls++;
      client.token = 'stale';

      await expectLater(client.get('/incidents'), throwsA(isA<ApiException>().having((e) => e.isUnauthorized, 'isUnauthorized', isTrue)));
      expect(unauthorizedCalls, 1);
    });

    test('a 403 is a permission problem, not a session problem', () async {
      final client = _clientReturning(
        http.Response(jsonEncode({'success': false, 'error': {'code': 'FORBIDDEN', 'message': 'Officer role required'}}), 403),
      );
      await expectLater(client.patch('/incidents/x/status', body: {}), throwsA(isA<ApiException>().having((e) => e.isForbidden, 'isForbidden', isTrue)));
    });

    test('an unreachable server is reported as a network error, not a crash', () async {
      final client = ApiClient(
        httpClient: MockClient((_) async => throw http.ClientException('Connection refused')),
        baseUrl: 'http://localhost:1/api',
      );
      await expectLater(
        client.get('/health'),
        throwsA(isA<ApiException>().having((e) => e.isNetwork, 'isNetwork', isTrue)),
      );
    });

    test('a non-JSON body is reported as a malformed response', () async {
      final client = _clientReturning(http.Response('<html>502 Bad Gateway</html>', 502));
      await expectLater(client.get('/health'), throwsA(isA<ApiException>()));
    });

    test('sends the bearer token and JSON headers', () async {
      String? seenAuth;
      String? seenContentType;
      final client = ApiClient(
        httpClient: MockClient((req) async {
          seenAuth = req.headers['Authorization'];
          seenContentType = req.headers['Content-Type'];
          return http.Response(jsonEncode({'success': true, 'data': {}}), 200);
        }),
        baseUrl: 'http://localhost:4000/api',
      )..token = 'jwt-123';

      await client.get('/incidents');
      expect(seenAuth, 'Bearer jwt-123');
      expect(seenContentType, 'application/json');
    });

    test('omits query parameters that are null or empty', () async {
      late Uri seen;
      final client = ApiClient(
        httpClient: MockClient((req) async {
          seen = req.url;
          return http.Response(jsonEncode({'success': true, 'data': {}}), 200);
        }),
        baseUrl: 'http://localhost:4000/api',
      );

      await client.get('/incidents', query: {'q': '', 'status': null, 'severity': 'CRITICAL', 'active': true});
      expect(seen.queryParameters, {'severity': 'CRITICAL', 'active': 'true'});
    });

    test('joins list query parameters with commas, as the API expects', () async {
      late Uri seen;
      final client = ApiClient(
        httpClient: MockClient((req) async {
          seen = req.url;
          return http.Response(jsonEncode({'success': true, 'data': {}}), 200);
        }),
        baseUrl: 'http://localhost:4000/api',
      );

      await client.get('/incidents', query: {'status': ['REPORTED', 'VERIFIED']});
      expect(seen.queryParameters['status'], 'REPORTED,VERIFIED');
    });
  });

  group('Paged', () {
    test('reads items and the server total rather than inferring them', () {
      final page = Paged.fromJson(
        {
          'items': [
            {'id': 'a'},
            {'id': 'b'},
          ],
          'total': 57,
          'page': 2,
          'pageSize': 20,
        },
        (j) => j,
      );
      expect(page.items, hasLength(2));
      expect(page.total, 57);
      expect(page.totalPages, 3);
      expect(page.hasMore, isTrue);
    });

    test('handles an empty result set without dividing by zero', () {
      final page = Paged.fromJson({'items': [], 'total': 0, 'page': 1, 'pageSize': 20}, (j) => j);
      expect(page.items, isEmpty);
      expect(page.totalPages, 1);
      expect(page.hasMore, isFalse);
    });

    test('falls back to items.length when the server omits a total', () {
      final page = Paged.fromJson({'items': [{'id': 'a'}]}, (j) => j);
      expect(page.total, 1);
    });
  });
}

ApiClient _clientReturning(http.Response response) =>
    ApiClient(httpClient: MockClient((_) async => response), baseUrl: 'http://localhost:4000/api');
