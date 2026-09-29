import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../config.dart';
import 'api_exception.dart';

/// A page of results plus the server's total, so the UI never invents counts.
class Paged<T> {
  const Paged({required this.items, required this.total, this.page = 1, this.pageSize = 20});

  final List<T> items;
  final int total;
  final int page;
  final int pageSize;

  int get totalPages => pageSize <= 0 ? 1 : (total / pageSize).ceil().clamp(1, 1 << 30);
  bool get hasMore => page < totalPages;

  factory Paged.fromJson(Map<String, dynamic> json, T Function(Map<String, dynamic>) parse) {
    final items = (json['items'] as List<dynamic>? ?? const [])
        .map((e) => parse(e as Map<String, dynamic>))
        .toList(growable: false);
    return Paged<T>(
      items: items,
      total: (json['total'] as num?)?.toInt() ?? items.length,
      page: (json['page'] as num?)?.toInt() ?? 1,
      pageSize: (json['pageSize'] as num?)?.toInt() ?? 20,
    );
  }
}

/// Thin REST client for the DMIS API.
///
/// Contract rules, all enforced server-side as well:
///  * every response is `{ success, data, meta? }` or `{ success: false, error }`;
///  * the bearer token is the same JWT the web client uses;
///  * a 401 means the token is gone or expired and the session must be cleared.
class ApiClient {
  ApiClient({http.Client? httpClient, String? baseUrl})
      : _http = httpClient ?? http.Client(),
        baseUrl = baseUrl ?? AppConfig.apiBaseUrl;

  final http.Client _http;
  final String baseUrl;

  /// Invoked when the server rejects the token, so the app can sign out from
  /// anywhere without every call site having to handle it.
  void Function()? onUnauthorized;

  String? token;

  Uri _uri(String path, [Map<String, dynamic>? query]) {
    final cleaned = <String, String>{};
    query?.forEach((key, value) {
      if (value == null) return;
      final text = value is List ? value.join(',') : value.toString();
      if (text.isEmpty) return;
      cleaned[key] = text;
    });
    return Uri.parse('$baseUrl$path').replace(queryParameters: cleaned.isEmpty ? null : cleaned);
  }

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      };

  Future<dynamic> get(String path, {Map<String, dynamic>? query}) =>
      _send(() => _http.get(_uri(path, query), headers: _headers));

  Future<dynamic> post(String path, {Object? body}) => _send(
        () => _http.post(_uri(path), headers: _headers, body: body == null ? null : jsonEncode(body)),
      );

  Future<dynamic> patch(String path, {Object? body}) => _send(
        () => _http.patch(_uri(path), headers: _headers, body: body == null ? null : jsonEncode(body)),
      );

  Future<dynamic> _send(Future<http.Response> Function() call) async {
    late http.Response response;
    try {
      response = await call().timeout(AppConfig.requestTimeout);
    } on TimeoutException {
      throw ApiException(0, 'TIMEOUT', 'The server took too long to respond. Check your connection and try again.');
    } on SocketException catch (e) {
      throw ApiException(0, 'NETWORK_ERROR', 'Cannot reach the DMIS server. Check your connection.\n(${e.message})');
    } on http.ClientException catch (e) {
      throw ApiException(0, 'NETWORK_ERROR', 'Cannot reach the DMIS server. Check your connection.\n(${e.message})');
    }

    Map<String, dynamic> body;
    try {
      final decoded = jsonDecode(utf8.decode(response.bodyBytes));
      body = decoded is Map<String, dynamic> ? decoded : <String, dynamic>{};
    } on FormatException {
      throw ApiFormatException('The server returned an unreadable response (HTTP ${response.statusCode}).');
    }

    if (response.statusCode == 401) {
      final message = (body['error'] as Map<String, dynamic>?)?['message'] as String? ??
          'Your session has expired. Please sign in again.';
      onUnauthorized?.call();
      throw ApiException(401, 'UNAUTHORIZED', message);
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (body['success'] == true) return body['data'];
      // A 2xx that is not a success envelope is a contract violation upstream.
      final error = body['error'] as Map<String, dynamic>?;
      throw ApiException(response.statusCode, error?['code'] as String? ?? 'UNEXPECTED', error?['message'] as String? ??
          'The server returned an unexpected response.');
    }

    final error = body['error'] as Map<String, dynamic>?;
    final details = (error?['details'] as List<dynamic>?)
        ?.map((e) => e is Map ? (e['message'] ?? e) : e)
        .where((e) => e != null && e != '')
        .map((e) => e.toString())
        .join('\n');
    throw ApiException(
      response.statusCode,
      error?['code'] as String? ?? 'HTTP_${response.statusCode}',
      (error?['message'] as String? ?? 'Request failed (HTTP ${response.statusCode}).') +
          (details != null && details.isNotEmpty ? '\n$details' : ''),
    );
  }

  void close() => _http.close();
}

// ---------------------------------------------------------------------------
// Typed helpers. Pages use these instead of touching raw JSON.
// ---------------------------------------------------------------------------

extension ApiList<T> on ApiClient {
  Future<Paged<E>> getPaged<E>(String path, E Function(Map<String, dynamic>) parse,
      {Map<String, dynamic>? query}) async {
    final data = await get(path, query: query);
    return Paged.fromJson(data as Map<String, dynamic>, parse);
  }
}

extension ApiObject<T> on ApiClient {
  Future<O> getObject<O>(String path, O Function(Map<String, dynamic>) parse) async {
    final data = await get(path);
    return parse(data as Map<String, dynamic>);
  }
}
