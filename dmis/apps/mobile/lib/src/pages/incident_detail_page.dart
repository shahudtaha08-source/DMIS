import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../api/api_client.dart';
import '../api/models.dart';
import '../app_scope.dart';
import '../theme.dart';
import '../widgets/common.dart';

class IncidentDetailPage extends StatefulWidget {
  const IncidentDetailPage({super.key, required this.incidentId});

  final String incidentId;

  @override
  State<IncidentDetailPage> createState() => _IncidentDetailPageState();
}

class _IncidentDetailPageState extends State<IncidentDetailPage> {
  late Future<IncidentDetail> _future;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    _future = AppScope.of(context)
        .api
        .getObject('/incidents/${widget.incidentId}', IncidentDetail.fromJson);
  }

  void _reload() {
    setState(_load);
  }

  Future<void> _refresh() async {
    _reload();
    await _future;
  }

  /// Status changes are forward-only, exactly as the shared transition table
  /// and the API enforce. We only offer moves the server will accept, so the
  /// user never sees a validation error they could have been spared.
  List<String> get _forwardOptions {
    final current = _currentStatus;
    if (current == null) return const [];
    final index = IncidentStatus.flow.indexOf(current);
    if (index < 0 || index >= IncidentStatus.flow.length - 1) return const [];
    return IncidentStatus.flow.sublist(index + 1);
  }

  String? _currentStatus;

  Future<void> _changeStatus(String next) async {
    final note = await _askForNote(next);
    if (note == null || !mounted) return;

    final api = AppScope.read(context).api;
    try {
      await api.patch('/incidents/${widget.incidentId}/status', body: {
        'status': next,
        if (note.isNotEmpty) 'note': note,
      });
      _reload();
      if (mounted) showToast(context, 'Status updated to ${IncidentStatus.label(next)}');
    } catch (e) {
      if (mounted) showApiError(context, e);
    }
  }

  Future<String?> _askForNote(String next) async {
    final controller = TextEditingController();
    final result = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Move to ${IncidentStatus.label(next)}'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Add a short note for the audit trail. It is optional, but it is what the next responder reads first.',
              style: TextStyle(fontSize: 12.5, color: Colors.grey.shade700),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              maxLines: 3,
              maxLength: 500,
              autofocus: true,
              decoration: const InputDecoration(hintText: 'e.g. Two teams on site, water distribution under way'),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(ctx, controller.text.trim()), child: const Text('Confirm')),
        ],
      ),
    );
    controller.dispose();
    return result;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Incident', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
        actions: [IconButton(onPressed: _reload, icon: const Icon(Icons.refresh_rounded), tooltip: 'Refresh')],
      ),
      body: FutureBuilder<IncidentDetail>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const LoadingView(message: 'Loading incident…');
          }
          if (snapshot.hasError) {
            return ErrorView(error: snapshot.error!, onRetry: _reload);
          }
          final detail = snapshot.data!;
          _currentStatus = detail.summary.status;
          final canEdit = AppScope.of(context).session.canEdit;
          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 32),
              children: [
                Text(detail.summary.title, style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w800, height: 1.25)),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 6,
                  children: [
                    StatusChip(
                      label: Severity.label(detail.summary.severity),
                      colour: severityColour(detail.summary.severity),
                      icon: Icons.priority_high_rounded,
                    ),
                    StatusChip(
                      label: IncidentStatus.label(detail.summary.status),
                      colour: incidentStatusColour(detail.summary.status),
                    ),
                    StatusChip(label: detail.summary.disasterType, colour: const Color(0xFF475569)),
                  ],
                ),
                if (canEdit && _forwardOptions.isNotEmpty) ...[
                  const SizedBox(height: 14),
                  FilledButton.icon(
                    onPressed: () => _changeStatus(_forwardOptions.first),
                    icon: const Icon(Icons.trending_up_rounded, size: 18),
                    label: Text('Move to ${IncidentStatus.label(_forwardOptions.first)}'),
                    style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 13)),
                  ),
                  if (_forwardOptions.length > 1) ...[
                    const SizedBox(height: 8),
                    TextButton.icon(
                      onPressed: () => _showStatusSheet(),
                      icon: const Icon(Icons.more_horiz_rounded, size: 18),
                      label: const Text('Other status options'),
                    ),
                  ],
                ] else if (canEdit && detail.summary.status == IncidentStatus.resolved) ...[
                  const SizedBox(height: 14),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF0FDF4),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFFBBF7D0)),
                    ),
                    child: Row(
                      children: const [
                        Icon(Icons.check_circle_outline_rounded, size: 18, color: Color(0xFF16A34A)),
                        SizedBox(width: 8),
                        Expanded(
                          child: Text('This incident is resolved. The lifecycle is forward-only, so no further changes are possible.',
                            style: TextStyle(fontSize: 12.5, color: Color(0xFF166534), height: 1.35)),
                        ),
                      ],
                    ),
                  ),
                ] else if (!canEdit) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.visibility_outlined, size: 18, color: Colors.grey),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Your role is read-only. An officer or administrator can change the status.',
                            style: TextStyle(fontSize: 12.5, color: Colors.grey.shade700),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 18),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SectionHeader(title: 'Situation'),
                        Text(detail.description, style: const TextStyle(fontSize: 13.5, height: 1.45)),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SectionHeader(title: 'Details'),
                        DetailRow(label: 'Location', value: detail.summary.location),
                        DetailRow(label: 'Type', value: detail.summary.disasterType),
                        DetailRow(
                          label: 'People affected',
                          value: formatCount(detail.summary.affectedPopulationEstimate),
                        ),
                        DetailRow(label: 'Reported by', value: detail.summary.reportedByName),
                        DetailRow(
                          label: 'Assigned team',
                          value: detail.summary.assignedTeamName ?? 'Not assigned',
                        ),
                        DetailRow(label: 'Reported', value: formatDateTime(detail.summary.createdAt)),
                        DetailRow(label: 'Last update', value: formatRelative(DateTime.tryParse(detail.summary.updatedAt))),
                        if (detail.alertCount > 0) DetailRow(label: 'Alerts issued', value: '${detail.alertCount}'),
                      ],
                    ),
                  ),
                ),
                if (detail.summary.hasCoordinates) ...[
                  const SizedBox(height: 12),
                  const SectionHeader(title: 'Location'),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: SizedBox(
                      height: 190,
                      child: FlutterMap(
                        options: MapOptions(
                          initialCenter: LatLng(detail.summary.latitude!, detail.summary.longitude!),
                          initialZoom: 10,
                          interactionOptions: const InteractionOptions(flags: InteractiveFlag.none),
                        ),
                        children: [
                          TileLayer(
                            urlTemplate: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                            userAgentPackageName: 'in.gov.dmis.dmis_mobile',
                          ),
                          MarkerLayer(
                            markers: [
                              Marker(
                                point: LatLng(detail.summary.latitude!, detail.summary.longitude!),
                                width: 34,
                                height: 34,
                                child: Container(
                                  decoration: BoxDecoration(
                                    color: severityColour(detail.summary.severity),
                                    shape: BoxShape.circle,
                                    border: Border.all(color: Colors.white, width: 2.5),
                                    boxShadow: const [BoxShadow(blurRadius: 5, color: Colors.black26)],
                                  ),
                                  child: const Icon(Icons.location_on, color: Colors.white, size: 17),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ] else ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.place_outlined, size: 18, color: Colors.grey.shade600),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'No coordinates recorded for this incident. The location above is descriptive only.',
                            style: TextStyle(fontSize: 12.5, color: Colors.grey.shade700),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 18),
                SectionHeader(
                  title: 'Timeline',
                  subtitle: '${detail.timeline.length} recorded event${detail.timeline.length == 1 ? '' : 's'}',
                ),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(14, 14, 14, 6),
                    child: detail.timeline.isEmpty
                        ? const Padding(
                            padding: EdgeInsets.symmetric(vertical: 12),
                            child: Text('No events recorded yet.', style: TextStyle(fontSize: 12.5, color: Colors.grey)),
                          )
                        : Column(
                            children: [
                              for (final event in detail.timeline) _TimelineTile(event: event),
                            ],
                          ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Future<void> _showStatusSheet() async {
    final options = _forwardOptions;
    final chosen = await showModalBottomSheet<String>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(16, 16, 16, 4),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text('Move this incident to', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
              ),
            ),
            for (final option in options)
              ListTile(
                leading: StatusChip(label: '', colour: incidentStatusColour(option)),
                title: Text(IncidentStatus.label(option), style: const TextStyle(fontSize: 14)),
                onTap: () => Navigator.pop(ctx, option),
              ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
    if (chosen != null) _changeStatus(chosen);
  }
}

class _TimelineTile extends StatelessWidget {
  const _TimelineTile({required this.event});
  final TimelineEvent event;

  static const _icons = {
    'created': Icons.add_circle_outline_rounded,
    'status': Icons.trending_up_rounded,
    'assigned': Icons.assignment_ind_outlined,
    'updated': Icons.edit_outlined,
  };

  @override
  Widget build(BuildContext context) {
    final colour = switch (event.kind) {
      'created' => const Color(0xFF2563EB),
      'status' => incidentStatusColour(event.label.contains(':') ? event.label.split(':').last.trim() : 'REPORTED'),
      'assigned' => const Color(0xFF0D9488),
      _ => const Color(0xFF64748B),
    };
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 28,
            height: 28,
            decoration: BoxDecoration(color: colour.withValues(alpha: 0.12), shape: BoxShape.circle),
            child: Icon(_icons[event.kind] ?? Icons.circle_outlined, size: 15, color: colour),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(event.label, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600)),
                if (event.detail != null && event.detail!.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(event.detail!, style: TextStyle(fontSize: 12.5, color: Colors.grey.shade700, height: 1.35)),
                  ),
                const SizedBox(height: 2),
                Text(
                  '${formatDateTime(event.at)}${event.actor != null ? ' · ${event.actor}' : ''}',
                  style: TextStyle(fontSize: 11.5, color: Colors.grey.shade600),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
