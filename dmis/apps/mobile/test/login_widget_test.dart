import 'dart:convert';

import 'package:dmis_mobile/main.dart' as app;
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Widget tests drive the real widget tree, so what is asserted here is what a
/// user actually sees.
void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));

  testWidgets('validates the form before calling the API', (tester) async {
    await tester.pumpWidget(app.DmisApp(client: _noNetwork(), baseUrl: _baseUrl));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextFormField).at(0), 'not-an-email');
    await tester.enterText(find.byType(TextFormField).at(1), '');
    await tester.tap(find.text('Sign in'));
    await tester.pumpAndSettle();

    expect(find.text('Enter a valid email address'), findsOneWidget);
    expect(find.text('Enter your password'), findsOneWidget);
  });

  testWidgets('a rejected sign in shows the server message and stays on the form', (tester) async {
    await tester.pumpWidget(app.DmisApp(
      baseUrl: _baseUrl,
      client: _mock((req) async => http.Response(
            jsonEncode({'success': false, 'error': {'code': 'INVALID_CREDENTIALS', 'message': 'Invalid email or password'}}),
            401,
          )),
    ));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextFormField).at(0), 'officer@dmis.gov.in');
    await tester.enterText(find.byType(TextFormField).at(1), 'wrong-password');
    await tester.tap(find.text('Sign in'));
    await tester.pumpAndSettle();

    expect(find.text('Invalid email or password'), findsOneWidget);
    expect(find.byType(NavigationBar), findsNothing, reason: 'must not navigate into the app');
  });

  testWidgets('a valid sign in lands on the field overview with real API numbers', (tester) async {
    await tester.pumpWidget(app.DmisApp(baseUrl: _baseUrl, client: _mock(_route)));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextFormField).at(0), 'officer@dmis.gov.in');
    await tester.enterText(find.byType(TextFormField).at(1), 'Admin@12345');
    await tester.tap(find.text('Sign in'));
    await tester.pumpAndSettle();

    expect(find.byType(NavigationBar), findsOneWidget);
    expect(find.text('Active incidents'), findsOneWidget);
    expect(find.text('4,800'), findsOneWidget, reason: 'the affected-population figure comes from the API');
    expect(find.text('783'), findsOneWidget, reason: 'the historical archive count is read from the same database');
  });

  testWidgets('an unreachable API is reported as a connection problem, not a crash', (tester) async {
    await tester.pumpWidget(app.DmisApp(baseUrl: _baseUrl, client: _noNetwork()));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextFormField).at(0), 'officer@dmis.gov.in');
    await tester.enterText(find.byType(TextFormField).at(1), 'Admin@12345');
    await tester.tap(find.text('Sign in'));
    await tester.pumpAndSettle();

    expect(find.textContaining('Cannot reach the DMIS server'), findsOneWidget);
    expect(find.byType(NavigationBar), findsNothing);
  });
}

const _baseUrl = 'http://localhost:4000/api';

http.Client _mock(Future<http.Response> Function(http.Request) handler) =>
    MockClient((req) => handler(req));

http.Client _noNetwork() => MockClient((_) async => throw http.ClientException('Connection refused'));

Future<http.Response> _route(http.Request req) async {
  if (req.url.path.endsWith('/auth/login')) {
    return http.Response(
      jsonEncode({
        'success': true,
        'data': {
          'accessToken': 'jwt-abc',
          'user': {
            'id': 'u-1',
            'email': 'officer@dmis.gov.in',
            'name': 'Priya Sharma',
            'role': 'OFFICER',
            'isActive': true,
            'createdAt': '2026-01-01T00:00:00.000Z',
          },
        },
      }),
      200,
    );
  }
  if (req.url.path.endsWith('/dashboard/summary')) {
    return http.Response(jsonEncode({'success': true, 'data': _dashboardSummary}), 200);
  }
  if (req.url.path.endsWith('/alerts/active')) {
    return http.Response(jsonEncode({'success': true, 'data': <dynamic>[]}), 200);
  }
  if (req.url.path.endsWith('/incidents')) {
    return http.Response(
      jsonEncode({
        'success': true,
        'data': {
          'items': <dynamic>[],
          'total': 0,
          'page': 1,
          'pageSize': 5,
        },
      }),
      200,
    );
  }
  return http.Response(jsonEncode({'success': false, 'error': {'code': 'NOT_FOUND', 'message': 'no stub for ${req.url.path}'}}), 404);
}

const _dashboardSummary = {
  'activeIncidents': 1,
  'criticalIncidents': 1,
  'affectedPopulationEstimate': 4800,
  'historicalDisasterCount': 783,
  'activeTeams': 3,
  'shelterCapacityTotal': 500,
  'shelterOccupancyTotal': 120,
  'sheltersOpen': 1,
  'resourcesLowStock': 0,
  'resourcesOutOfStock': 0,
  'resourcesTotal': 6,
  'incidentsByStatus': [
    {'status': 'RESPONSE_ACTIVE', 'count': 1},
  ],
  'historicalByDecade': [
    {'decade': 2020, 'count': 63},
  ],
  'unavailable': <String>[],
  'generatedAt': '2026-01-01T00:00:00.000Z',
};
