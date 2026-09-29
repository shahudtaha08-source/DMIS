import 'package:flutter/material.dart';

import '../api/api_client.dart';
import '../api/models.dart';
import '../app_scope.dart';
import '../theme.dart';
import '../widgets/common.dart';
import 'incident_detail_page.dart';

class AlertsPage extends StatefulWidget {
  const AlertsPage({super.key});

  @override
  State<AlertsPage> createState() => _AlertsPageState();
}

class _AlertsPageState extends State<AlertsPage> {
  String _filter = 'active';
  int _page = 1;
  int _nonce = 0;
  late Future<Paged<AlertItem>> _future;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    _future = AppScope.read(context).api.getPaged<AlertItem>(
      '/alerts',
      AlertItem.fromJson,
      query: {
        'status': _filter == 'all' ? null : (_filter == 'active' ? 'PUBLISHED' : 'DRAFT'),
        'page': _page,
        'pageSize': 20,
        '_n': _nonce,
      },
    );
  }

  void _apply({int? page}) {
    setState(() {
      _page = page ?? 1;
      _nonce++;
      _load();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Material(
          color: Colors.white,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 8),
            child: SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'active', label: Text('Published'), icon: Icon(Icons.campaign_outlined, size: 16)),
                ButtonSegment(value: 'draft', label: Text('Drafts'), icon: Icon(Icons.edit_note_rounded, size: 16)),
                ButtonSegment(value: 'all', label: Text('All'), icon: Icon(Icons.list_alt_rounded, size: 16)),
              ],
              selected: {_filter},
              onSelectionChanged: (s) {
                setState(() => _filter = s.first);
                _apply();
              },
              showSelectedIcon: false,
              style: const ButtonStyle(visualDensity: VisualDensity.compact),
            ),
          ),
        ),
        Expanded(
          child: FutureBuilder<Paged<AlertItem>>(
            future: _future,
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const LoadingView(message: 'Loading alerts…');
              }
              if (snapshot.hasError) {
                return ErrorView(error: snapshot.error!, onRetry: () => _apply());
              }
              final data = snapshot.data!;
              if (data.items.isEmpty) {
                return EmptyView(
                  icon: Icons.campaign_outlined,
                  title: _filter == 'active' ? 'No published alerts' : 'No alerts here',
                  message: _filter == 'active'
                      ? 'Nothing is currently published. Published alerts appear here for every field user immediately.'
                      : 'Alerts created by officers and administrators will appear here.',
                );
              }
              return RefreshIndicator(
                onRefresh: () async {
                  _apply();
                  await _future;
                },
                child: ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 10, 16, 20),
                  itemCount: data.items.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (context, i) => _AlertCard(alert: data.items[i]),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _AlertCard extends StatelessWidget {
  const _AlertCard({required this.alert});
  final AlertItem alert;

  @override
  Widget build(BuildContext context) {
    final colour = alertSeverityColour(alert.severity);
    return Container(
      decoration: BoxDecoration(
        color: colour.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: colour.withValues(alpha: 0.28)),
      ),
      padding: const EdgeInsets.all(13),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Icons.campaign_rounded, size: 18, color: colour),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  alert.title,
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14.5, color: colour, height: 1.25),
                ),
              ),
              const SizedBox(width: 6),
              StatusChip(
                label: alert.isPublished ? (alert.isExpired ? 'Expired' : 'Live') : 'Draft',
                colour: alert.isPublished ? (alert.isExpired ? const Color(0xFF64748B) : const Color(0xFF16A34A)) : const Color(0xFF64748B),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(alert.message, style: const TextStyle(fontSize: 13, height: 1.4)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 6,
            runSpacing: 4,
            children: [
              StatusChip(label: AlertSeverity.label(alert.severity), colour: colour),
              Chip(
                avatar: const Icon(Icons.place_outlined, size: 14),
                label: Text(alert.affectedArea, style: const TextStyle(fontSize: 11.5)),
                visualDensity: VisualDensity.compact,
                materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                padding: EdgeInsets.zero,
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            'Valid until ${formatDateTime(alert.validUntil)} · issued ${formatRelative(DateTime.tryParse(alert.createdAt))}',
            style: TextStyle(fontSize: 11.5, color: Colors.grey.shade600),
          ),
          if (alert.relatedIncidentId != null)
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton.icon(
                style: TextButton.styleFrom(
                  padding: const EdgeInsets.only(top: 6),
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => IncidentDetailPage(incidentId: alert.relatedIncidentId!)),
                ),
                icon: const Icon(Icons.open_in_new_rounded, size: 15),
                label: Text(
                  alert.relatedIncidentTitle == null ? 'View incident' : alert.relatedIncidentTitle!,
                  style: const TextStyle(fontSize: 12.5),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
