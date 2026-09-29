import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import 'api/models.dart';

/// Theme shared by every screen. The palette mirrors the web client's slate /
/// blue system so the two clients read as one product.
class AppTheme {
  const AppTheme._();

  static const seed = Color(0xFF1d4ed8);

  static ThemeData light() {
    final scheme = ColorScheme.fromSeed(seedColor: seed);
    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: const Color(0xFFF8FAFC),
      appBarTheme: AppBarTheme(
        backgroundColor: scheme.surface,
        foregroundColor: scheme.onSurface,
        elevation: 0,
        scrolledUnderElevation: 1,
        centerTitle: false,
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(color: scheme.outlineVariant),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
        isDense: true,
      ),
      listTileTheme: const ListTileThemeData(contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 4)),
      snackBarTheme: const SnackBarThemeData(behavior: SnackBarBehavior.floating),
    );
  }
}

// --- Colour helpers ---------------------------------------------------------

Color severityColour(String severity) => switch (severity) {
      Severity.critical => const Color(0xFFDC2626),
      Severity.high => const Color(0xFFD97706),
      Severity.moderate => const Color(0xFF2563EB),
      Severity.low => const Color(0xFF0891B2),
      _ => const Color(0xFF64748B),
    };

Color alertSeverityColour(String severity) => switch (severity) {
      AlertSeverity.critical => const Color(0xFFDC2626),
      AlertSeverity.warning => const Color(0xFFD97706),
      AlertSeverity.advisory => const Color(0xFF2563EB),
      AlertSeverity.info => const Color(0xFF0891B2),
      _ => const Color(0xFF64748B),
    };

Color incidentStatusColour(String status) => switch (status) {
      IncidentStatus.reported => const Color(0xFFD97706),
      IncidentStatus.verified => const Color(0xFF2563EB),
      IncidentStatus.responseActive => const Color(0xFFDC2626),
      IncidentStatus.stabilized => const Color(0xFF7C3AED),
      IncidentStatus.resolved => const Color(0xFF16A34A),
      _ => const Color(0xFF64748B),
    };

Color teamStatusColour(String status) => switch (status) {
      TeamStatus.available => const Color(0xFF16A34A),
      TeamStatus.deployed => const Color(0xFF2563EB),
      TeamStatus.offDuty => const Color(0xFF64748B),
      _ => const Color(0xFF64748B),
    };

Color resourceStatusColour(String status) => switch (status) {
      ResourceStatus.available => const Color(0xFF16A34A),
      ResourceStatus.lowStock => const Color(0xFFD97706),
      ResourceStatus.outOfStock => const Color(0xFFDC2626),
      _ => const Color(0xFF64748B),
    };

Color shelterStatusColour(String status) => switch (status) {
      ShelterStatus.open => const Color(0xFF16A34A),
      ShelterStatus.full => const Color(0xFFD97706),
      ShelterStatus.closed => const Color(0xFF64748B),
      _ => const Color(0xFF64748B),
    };

// --- Formatting -------------------------------------------------------------

final _intFormat = NumberFormat.decimalPattern('en_IN');
final _compactFormat = NumberFormat.compact(locale: 'en_IN');

/// Large numbers are compacted (12.4K) so a phone screen never wraps a stat.
String formatCount(int? value, {bool compact = false}) {
  if (value == null) return '—';
  return compact && value.abs() >= 10000 ? _compactFormat.format(value) : _intFormat.format(value);
}

String formatDateTime(String? iso) {
  if (iso == null || iso.isEmpty) return '—';
  final parsed = DateTime.tryParse(iso);
  if (parsed == null) return '—';
  return formatDateTimeFrom(parsed);
}

String formatDateTimeFrom(DateTime value) {
  final local = value.toLocal();
  final d = '${local.day.toString().padLeft(2, '0')} ${_months[local.month - 1]} ${local.year}';
  final t = '${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
  return '$d, $t';
}

String formatRelative(DateTime? value) {
  if (value == null) return '—';
  final diff = DateTime.now().difference(value.toLocal());
  if (diff.inSeconds.abs() < 60) return 'just now';
  if (diff.inMinutes.abs() < 60) return '${diff.inMinutes.abs()} min ago';
  if (diff.inHours.abs() < 24) return '${diff.inHours.abs()} h ago';
  if (diff.inDays.abs() < 30) return '${diff.inDays.abs()} d ago';
  return formatDateTimeFrom(value);
}

const _months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
