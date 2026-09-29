import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'api_client.dart';
import 'api_exception.dart';
import 'models.dart';

/// Holds the signed-in user and the JWT.
///
/// The token is persisted so a field officer does not have to sign in every
/// time the app is backgrounded on a poor connection - but it is validated
/// against `GET /auth/me` on startup, so a revoked or expired token is cleared
/// rather than silently trusted.
class Session extends ChangeNotifier {
  Session(this._api);

  final ApiClient _api;
  static const _tokenKey = 'dmis.token';

  User? _user;
  bool _restoring = true;
  String? _lastError;

  User? get user => _user;
  bool get isSignedIn => _user != null;
  bool get isRestoring => _restoring;
  String? get lastError => _lastError;
  bool get canEdit => UserRole.canEdit(_user?.role);

  /// Called by [ApiClient.onUnauthorized] so any request can sign the user out.
  void handleUnauthorized() {
    if (_user == null) return;
    _user = null;
    _api.token = null;
    _lastError = 'Your session expired. Please sign in again.';
    notifyListeners();
    unawaited(_clearStoredToken());
  }

  Future<void> restore() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString(_tokenKey);
      if (token != null && token.isNotEmpty) {
        _api.token = token;
        final data = await _api.get('/auth/me');
        _user = User.fromJson(data as Map<String, dynamic>);
      }
    } on ApiException catch (e) {
      // A dead token must not block the login screen from appearing. Clear the
      // token here rather than relying on the onUnauthorized callback, so this
      // path is correct even when nothing else has wired that up yet.
      if (e.isUnauthorized) {
        _api.token = null;
        await _clearStoredToken();
      }
    } finally {
      _restoring = false;
      notifyListeners();
    }
  }

  Future<bool> signIn(String email, String password) async {
    _lastError = null;
    final data = await _api.post('/auth/login', body: {'email': email.trim(), 'password': password});
    final json = data as Map<String, dynamic>;
    final token = json['accessToken'] as String;
    _api.token = token;
    _user = User.fromJson(json['user'] as Map<String, dynamic>);
    _lastError = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
    notifyListeners();
    return true;
  }

  Future<void> signOut() async {
    _user = null;
    _api.token = null;
    await _clearStoredToken();
    notifyListeners();
  }

  Future<void> _clearStoredToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
  }
}

void unawaited(Future<void> future) {
  future.catchError((_) {});
}
