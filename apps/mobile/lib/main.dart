import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;

import 'src/api/api_client.dart';
import 'src/api/session.dart';
import 'src/app_scope.dart';
import 'src/config.dart';
import 'src/pages/login_page.dart';
import 'src/pages/shell_page.dart';
import 'src/theme.dart';
import 'src/widgets/common.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
    ),
  );
  runApp(const DmisApp());
}

class DmisApp extends StatefulWidget {
  const DmisApp({super.key, this.client, this.baseUrl});

  /// Injectable so widget tests can exercise the real widget tree against a
  /// stubbed transport instead of a test-only copy of the UI.
  final http.Client? client;
  final String? baseUrl;

  @override
  State<DmisApp> createState() => _DmisAppState();
}

class _DmisAppState extends State<DmisApp> {
  late final ApiClient _api;
  late final Session _session;

  @override
  void initState() {
    super.initState();
    _api = ApiClient(httpClient: widget.client, baseUrl: widget.baseUrl)..onUnauthorized = () => _session.handleUnauthorized();
    _session = Session(_api);
    _session.restore();
  }

  @override
  void dispose() {
    _api.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AppScope(
      api: _api,
      session: _session,
      child: MaterialApp(
        title: AppConfig.appName,
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light(),
        home: ListenableBuilder(
          listenable: _session,
          builder: (context, _) {
            if (_session.isRestoring) {
              return const Scaffold(body: LoadingView(message: 'Restoring your session…'));
            }
            return _session.isSignedIn ? const ShellPage() : const LoginPage();
          },
        ),
      ),
    );
  }
}
