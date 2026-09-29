import 'package:flutter/material.dart';

import '../api/api_client.dart';
import '../api/models.dart';
import '../app_scope.dart';
import '../theme.dart';
import '../widgets/common.dart';
import 'incident_detail_page.dart';

class DashboardPage extends StatefulWidget {
  const DashboardPage({super.key});

  @override
  State<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends State<DashboardPage> {
  late Future<DashboardSummary> _summary;
  late Future<List<AlertItem>> _alerts;
  late Future<Paged<IncidentListItem>> _critical;
  int _nonce = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    final api = AppScope.read(context).api;
    _summary = api.get('/dashboard/summary').then((d) => DashboardSummary.fromJson(d as Map<String, dynamic>));
    _alerts = api.get('/alerts/active', query: {'limit': 3}).then(
        (d) => (d as List<dynamic>).map((e) => AlertItem.fromJson(e as Map<String, dynamic>)).toList(growable: false));
    _critical = api.getPaged<IncidentListItem>(
      '/incidents',
      IncidentListItem.fromJson,
      query: {'active': 'true', 'severity': Severity.critical, 'pageSize': 5, '_n': _nonce},
    );
  }

  void _refresh() {
    setState(() {
      _nonce++;
      _load();
    });
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: () async => _refresh(),
      child: FutureBuilder<DashboardSummary>(
        future: _summary,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const LoadingView(message: 'Loading live overview…');
          }
          if (snapshot.hasError) {
            return ListView(children: [ErrorView(error: snapshot.error!, onRetry: _refresh)]);
          }
          final d = snapshot.data!;
          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
            children: [
              if (d.unavailable.isNotEmpty) _UnavailableBanner(d.unavailable),
              _CriticalIncidents(future: _critical),
              const SizedBox(height: 12),
              _ActiveAlerts(future: _alerts),
              const SizedBox(height: 18),
              const SectionHeader(title: 'Response overview', subtitle: 'Same figures as the DMIS web dashboard'),
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
                childAspectRatio: 1.55,
                children: [
                  StatTile(
                    label: 'Active incidents',
                    value: formatCount(d.activeIncidents, compact: true),
                    caption: d.criticalIncidents != null ? '${formatCount(d.criticalIncidents)} critical' : null,
                    icon: Icons.report_problem_outlined,
                    accent: (d.activeIncidents ?? 0) > 0 ? const Color(0xFFDC2626) : const Color(0xFF16A34A),
                  ),
                  StatTile(
                    label: 'People affected',
                    value: formatCount(d.affectedPopulation, compact: true),
                    caption: 'Across active incidents',
                    icon: Icons.groups_outlined,
                    accent: const Color(0xFFD97706),
                  ),
                  StatTile(
                    label: 'Rescue teams active',
                    value: formatCount(d.activeTeams),
                    caption: 'On roster and deployable',
                    icon: Icons.volunteer_activism_outlined,
                    accent: const Color(0xFF16A34A),
                  ),
                  StatTile(
                    label: 'Shelter beds',
                    value: formatCount(d.shelterCapacityTotal, compact: true),
                    caption: d.shelterOccupancyPercent != null
                        ? '${formatCount(d.shelterOccupancyTotal)} occupied (${d.shelterOccupancyPercent}%)'
                        : null,
                    icon: Icons.home_work_outlined,
                    accent: const Color(0xFF2563EB),
                  ),
                  StatTile(
                    label: 'Low / out of stock',
                    value: '${formatCount(d.resourcesLowStock)} / ${formatCount(d.resourcesOutOfStock)}',
                    caption: d.resourcesTotal != null ? 'of ${formatCount(d.resourcesTotal)} items' : null,
                    icon: Icons.inventory_2_outlined,
                    accent: (d.resourcesOutOfStock ?? 0) > 0 ? const Color(0xFFDC2626) : const Color(0xFFD97706),
                  ),
                  StatTile(
                    label: 'Historical disasters',
                    value: formatCount(d.historicalDisasterCount),
                    caption: 'India, 1900–2024',
                    icon: Icons.history_edu_outlined,
                    accent: const Color(0xFF64748B),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              SectionHeader(
                title: 'Incidents by status',
                subtitle: d.generatedAt == null ? null : 'Generated ${formatDateTimeFrom(d.generatedAt!)}',
              ),
              _StatusBars(buckets: d.incidentsByStatus),
              const SizedBox(height: 18),
              const SectionHeader(title: 'Historical events per decade', subtitle: 'From the imported archive'),
              _DecadeBars(buckets: d.historicalByDecade),
            ],
          );
        },
      ),
    );
  }
}

class _UnavailableBanner extends StatelessWidget {
  const _UnavailableBanner(this.metrics);
  final List<String> metrics;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF3C7),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFFCD34D)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.warning_amber_rounded, size: 18, color: Color(0xFF92400E)),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'Some metrics are unavailable (${metrics.join(', ')}) and are shown as “—”. The rest is unaffected.',
              style: const TextStyle(fontSize: 12.5, color: Color(0xFF92400E), height: 1.35),
            ),
          ),
        ],
      ),
    );
  }
}

/// The most important strip on the screen: critical incidents first, because
/// that is what a field officer opens the app for.
class _CriticalIncidents extends StatelessWidget {
  const _CriticalIncidents({required this.future});
  final Future<Paged<IncidentListItem>> future;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Paged<IncidentListItem>>(
      future: future,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Card(
            child: Padding(
              padding: EdgeInsets.all(18),
              child: Row(children: [SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)), SizedBox(width: 12), Text('Checking critical incidents…', style: TextStyle(fontSize: 13))]),
            ),
          );
        }
        if (snapshot.hasError) {
          return Card(
            child: ListTile(
              leading: const Icon(Icons.error_outline_rounded, color: Color(0xFFDC2626)),
              title: const Text('Could not load incidents', style: TextStyle(fontSize: 13.5)),
              subtitle: Text((snapshot.error as dynamic).message, style: const TextStyle(fontSize: 12)),
            ),
          );
        }
        final items = snapshot.data!.items.where((i) => i.isActive).toList(growable: false);
        if (items.isEmpty) {
          return Card(
            child: ListTile(
              leading: const Icon(Icons.check_circle_outline_rounded, color: Color(0xFF16A34A)),
              title: const Text('No critical incidents', style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600)),
              subtitle: const Text('Nothing at CRITICAL severity is currently active.', style: TextStyle(fontSize: 12)),
            ),
          );
        }
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SectionHeader(title: 'Critical right now', subtitle: 'Active incidents at CRITICAL severity'),
            for (final i in items)
              Card(
                margin: const EdgeInsets.only(bottom: 8),
                color: const Color(0xFFFEF2F2),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: const BorderSide(color: Color(0xFFFECACA)),
                ),
                child: InkWell(
                  borderRadius: BorderRadius.circular(12),
                  onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => IncidentDetailPage(incidentId: i.id))),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(i.title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14.5)),
                            ),
                            StatusChip(label: IncidentStatus.label(i.status), colour: incidentStatusColour(i.status)),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Wrap(
                          spacing: 8,
                          runSpacing: 4,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          children: [
                            StatusChip(label: Severity.label(i.severity), colour: severityColour(i.severity)),
                            Text('${i.location} · ${i.disasterType}', style: const TextStyle(fontSize: 12.5)),
                          ],
                        ),
                        if (i.affectedPopulationEstimate != null || i.assignedTeamName != null) ...[
                          const SizedBox(height: 6),
                          Text(
                            [
                              if (i.affectedPopulationEstimate != null) '${formatCount(i.affectedPopulationEstimate)} affected',
                              if (i.assignedTeamName != null) 'Team: ${i.assignedTeamName}',
                              'reported ${formatRelative(DateTime.tryParse(i.createdAt))}',
                            ].join(' · '),
                            style: TextStyle(fontSize: 11.5, color: Colors.grey.shade700),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}

class _ActiveAlerts extends StatelessWidget {
  const _ActiveAlerts({required this.future});
  final Future<List<AlertItem>> future;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<AlertItem>>(
      future: future,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting || snapshot.hasError) {
          return const SizedBox.shrink();
        }
        final alerts = snapshot.data!.where((a) => !a.isExpired).toList(growable: false);
        if (alerts.isEmpty) return const SizedBox.shrink();
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SectionHeader(title: 'Active alerts'),
            for (final a in alerts)
              Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: alertSeverityColour(a.severity).withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: alertSeverityColour(a.severity).withValues(alpha: 0.3)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.campaign_rounded, size: 16, color: alertSeverityColour(a.severity)),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            a.title,
                            style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5, color: alertSeverityColour(a.severity)),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(a.message, style: const TextStyle(fontSize: 12.5, height: 1.35)),
                    const SizedBox(height: 4),
                    Text(
                      '${a.affectedArea} · until ${formatDateTime(a.validUntil)}',
                      style: TextStyle(fontSize: 11.5, color: Colors.grey.shade600),
                    ),
                    if (a.relatedIncidentId != null)
                      Align(
                        alignment: Alignment.centerLeft,
                        child: TextButton(
                          style: TextButton.styleFrom(padding: EdgeInsets.zero, minimumSize: Size.zero, tapTargetSize: MaterialTapTargetSize.shrinkWrap),
                          onPressed: () => Navigator.of(context).push(
                            MaterialPageRoute(builder: (_) => IncidentDetailPage(incidentId: a.relatedIncidentId!)),
                          ),
                          child: const Text('View incident', style: TextStyle(fontSize: 12.5)),
                        ),
                      ),
                  ],
                ),
              ),
          ],
        );
      },
    );
  }
}

class _StatusBars extends StatelessWidget {
  const _StatusBars({required this.buckets});
  final List<CountBucket> buckets;

  @override
  Widget build(BuildContext context) {
    if (buckets.isEmpty) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Center(child: Text('No incidents recorded yet.', style: TextStyle(fontSize: 12.5, color: Colors.grey.shade600))),
        ),
      );
    }
    final max = buckets.map((b) => b.count).reduce((a, b) => a > b ? a : b);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          children: [
            for (final b in buckets) ...[
              Row(
                children: [
                  SizedBox(width: 96, child: Text(IncidentStatus.label(b.label), style: const TextStyle(fontSize: 12))),
                  Expanded(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(999),
                      child: LinearProgressIndicator(
                        value: max == 0 ? 0 : b.count / max,
                        minHeight: 8,
                        backgroundColor: Colors.grey.shade200,
                        valueColor: AlwaysStoppedAnimation(incidentStatusColour(b.label)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  SizedBox(width: 26, child: Text(formatCount(b.count), textAlign: TextAlign.right, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700))),
                ],
              ),
              if (b != buckets.last) const SizedBox(height: 9),
            ],
          ],
        ),
      ),
    );
  }
}

class _DecadeBars extends StatelessWidget {
  const _DecadeBars({required this.buckets});
  final List<CountBucket> buckets;

  @override
  Widget build(BuildContext context) {
    if (buckets.isEmpty) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Center(child: Text('Historical data is unavailable.', style: TextStyle(fontSize: 12.5, color: Colors.grey.shade600))),
        ),
      );
    }
    final max = buckets.map((b) => b.count).reduce((a, b) => a > b ? a : b);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          children: [
            for (final b in buckets) ...[
              Row(
                children: [
                  SizedBox(width: 52, child: Text(b.label, style: const TextStyle(fontSize: 11.5))),
                  Expanded(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(999),
                      child: LinearProgressIndicator(
                        value: max == 0 ? 0 : b.count / max,
                        minHeight: 6,
                        backgroundColor: Colors.grey.shade200,
                        valueColor: const AlwaysStoppedAnimation(Color(0xFF0D9488)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  SizedBox(width: 34, child: Text(formatCount(b.count), textAlign: TextAlign.right, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600))),
                ],
              ),
              if (b != buckets.last) const SizedBox(height: 7),
            ],
          ],
        ),
      ),
    );
  }
}
