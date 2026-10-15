import 'package:flutter/material.dart';

import 'api/api_client.dart';
import 'api/api_exception.dart';
import 'api/session.dart';

/// Minimal dependency scope. Avoids pulling in a state-management package for
/// one session object; [ListenableBuilder] already covers the rebuild needs.
class AppScope extends InheritedWidget {
  const AppScope({super.key, required this.api, required this.session, required super.child});

  final ApiClient api;
  final Session session;

  static AppScope of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<AppScope>();
    assert(scope != null, 'AppScope is missing from the widget tree');
    return scope!;
  }

  /// Non-listening lookup, for use in `initState` where registering a
  /// dependency is illegal. The client and session instances never change for
  /// the lifetime of the app, so nothing is lost by not subscribing here.
  static AppScope read(BuildContext context) {
    final element = context.getElementForInheritedWidgetOfExactType<AppScope>();
    final scope = element?.widget as AppScope?;
    assert(scope != null, 'AppScope is missing from the widget tree');
    return scope!;
  }

  @override
  bool updateShouldNotify(AppScope oldWidget) => api != oldWidget.api || session != oldWidget.session;
}

/// Surfaces an [ApiException] in a snackbar without every call site writing the
/// same switch, and never leaks a stack trace to a field user.
void showApiError(BuildContext context, Object error) {
  final message = error is ApiException ? error.message : 'Something went wrong. Please try again.';
  final scheme = Theme.of(context).colorScheme;
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(
      SnackBar(
        content: Text(message, style: const TextStyle(fontSize: 13)),
        backgroundColor: scheme.error,
        duration: const Duration(seconds: 5),
      ),
    );
}

void showToast(BuildContext context, String message) {
  final scheme = Theme.of(context).colorScheme;
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(
      SnackBar(
        content: Text(message, style: const TextStyle(fontSize: 13)),
        backgroundColor: scheme.inverseSurface,
        duration: const Duration(seconds: 3),
      ),
    );
}
