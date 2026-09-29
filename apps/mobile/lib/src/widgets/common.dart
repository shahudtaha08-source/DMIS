import 'package:flutter/material.dart';

import '../api/api_exception.dart';
import '../theme.dart';

/// Small coloured status pill. One implementation for every enum on the app so
/// the same status is never two different colours on two different screens.
class StatusChip extends StatelessWidget {
  const StatusChip({super.key, required this.label, required this.colour, this.icon});

  final String label;
  final Color colour;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: colour.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: colour.withValues(alpha: 0.35)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[Icon(icon, size: 12, color: colour), const SizedBox(width: 4)],
          Text(
            label,
            style: TextStyle(color: colour, fontSize: 11.5, fontWeight: FontWeight.w600, letterSpacing: 0.2),
          ),
        ],
      ),
    );
  }
}

/// A single metric. `null` renders an em dash, never a misleading 0.
class StatTile extends StatelessWidget {
  const StatTile({
    super.key,
    required this.label,
    required this.value,
    this.caption,
    this.icon,
    this.accent,
  });

  final String label;
  final String value;
  final String? caption;
  final IconData? icon;
  final Color? accent;

  @override
  Widget build(BuildContext context) {
    final colour = accent ?? Theme.of(context).colorScheme.primary;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                if (icon != null) ...[
                  Icon(icon, size: 16, color: colour),
                  const SizedBox(width: 6),
                ],
                Expanded(
                  child: Text(
                    label,
                    style: TextStyle(fontSize: 12.5, color: Colors.grey.shade700, fontWeight: FontWeight.w500),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              value,
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w700, height: 1.1),
            ),
            if (caption != null)
              Padding(
                padding: const EdgeInsets.only(top: 2),
                child: Text(
                  caption!,
                  style: TextStyle(fontSize: 11.5, color: Colors.grey.shade600),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// Full-screen failure state with a retry. Always offers a way forward.
class ErrorView extends StatelessWidget {
  const ErrorView({super.key, required this.error, this.onRetry});

  final Object error;
  final VoidCallback? onRetry;

  String get _message {
    if (error is ApiException) return (error as ApiException).message;
    return 'Something went wrong. Please try again.';
  }

  @override
  Widget build(BuildContext context) {
    final isNetwork = error is ApiException && (error as ApiException).isNetwork;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              isNetwork ? Icons.wifi_off_rounded : Icons.error_outline_rounded,
              size: 42,
              color: Colors.grey.shade500,
            ),
            const SizedBox(height: 12),
            Text(
              isNetwork ? 'No connection to DMIS' : 'Could not load this data',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 6),
            Text(
              _message,
              style: TextStyle(fontSize: 13, color: Colors.grey.shade700),
              textAlign: TextAlign.center,
            ),
            if (onRetry != null) ...[
              const SizedBox(height: 16),
              FilledButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh_rounded, size: 18),
                label: const Text('Try again'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Honest empty state - explains what would be here rather than showing nothing.
class EmptyView extends StatelessWidget {
  const EmptyView({super.key, required this.title, this.message, this.icon = Icons.inbox_outlined, this.action});

  final String title;
  final String? message;
  final IconData icon;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 40, color: Colors.grey.shade400),
            const SizedBox(height: 12),
            Text(title, style: const TextStyle(fontSize: 15.5, fontWeight: FontWeight.w600), textAlign: TextAlign.center),
            if (message != null) ...[
              const SizedBox(height: 6),
              Text(message!, style: TextStyle(fontSize: 13, color: Colors.grey.shade700), textAlign: TextAlign.center),
            ],
            if (action != null) ...[const SizedBox(height: 16), action!],
          ],
        ),
      ),
    );
  }
}

class LoadingView extends StatelessWidget {
  const LoadingView({super.key, this.message});
  final String? message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(width: 26, height: 26, child: CircularProgressIndicator(strokeWidth: 2.5)),
          if (message != null) ...[
            const SizedBox(height: 12),
            Text(message!, style: TextStyle(fontSize: 13, color: Colors.grey.shade700)),
          ],
        ],
      ),
    );
  }
}

/// Occupancy bar used by shelters and resources. Purely presentational.
class CapacityBar extends StatelessWidget {
  const CapacityBar({super.key, required this.used, required this.total, this.colour});

  final int used;
  final int total;
  final Color? colour;

  @override
  Widget build(BuildContext context) {
    final ratio = total <= 0 ? 0.0 : (used / total).clamp(0.0, 1.0);
    final bar = colour ?? (ratio >= 1 ? const Color(0xFFDC2626) : ratio >= 0.85 ? const Color(0xFFD97706) : const Color(0xFF16A34A));
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(999),
          child: LinearProgressIndicator(
            value: ratio,
            minHeight: 6,
            backgroundColor: Colors.grey.shade200,
            valueColor: AlwaysStoppedAnimation(bar),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          '${formatCount(used)} of ${formatCount(total)} occupied',
          style: TextStyle(fontSize: 11.5, color: Colors.grey.shade600),
        ),
      ],
    );
  }
}

/// A labelled key/value row, used across the detail screens.
class DetailRow extends StatelessWidget {
  const DetailRow({super.key, required this.label, required this.value, this.valueWidget});

  final String label;
  final String value;
  final Widget? valueWidget;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 132,
            child: Text(label, style: TextStyle(fontSize: 12.5, color: Colors.grey.shade700)),
          ),
          Expanded(
            child: valueWidget ??
                Text(value, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w500)),
          ),
        ],
      ),
    );
  }
}

class SectionHeader extends StatelessWidget {
  const SectionHeader({super.key, required this.title, this.trailing, this.subtitle});

  final String title;
  final String? subtitle;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(4, 4, 4, 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                if (subtitle != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(subtitle!, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                  ),
              ],
            ),
          ),
          if (trailing != null) trailing!,
        ],
      ),
    );
  }
}
