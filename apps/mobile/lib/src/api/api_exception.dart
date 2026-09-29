/// Error thrown for any non-2xx response. Carries the API's own error code so
/// callers can distinguish "you're signed out" from "the server is down" without
/// string-matching messages.
class ApiException implements Exception {
  ApiException(this.statusCode, this.code, this.message);

  final int statusCode;
  final String code;
  final String message;

  /// The session was rejected: the caller should sign the user out.
  bool get isUnauthorized => statusCode == 401;

  /// The user is authenticated but lacks the required role.
  bool get isForbidden => statusCode == 403;

  /// The device could not reach the API at all.
  bool get isNetwork => code == 'NETWORK_ERROR';

  @override
  String toString() => message;
}

/// Thrown when the response body is not the `{ success, data }` envelope we
/// expect. Treated as a server fault, not a user error.
class ApiFormatException extends ApiException {
  ApiFormatException(String message) : super(0, 'MALFORMED_RESPONSE', message);
}
