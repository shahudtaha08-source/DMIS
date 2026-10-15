import 'package:flutter/material.dart';

import '../api/api_client.dart';
import '../api/models.dart';
import '../app_scope.dart';
import '../theme.dart';
import '../widgets/common.dart';

/// Read-only access to the imported 1900–2024 archive - the same 783 records
/// the web Historical Explorer reads, never a second copy of the dataset.
class HistoricalPage extends StatefulWidget {
  const HistoricalPage({super.key});

  @override
  State<HistoricalPage> createState() => _HistoricalPageState();
}

class _HistoricalPageState extends State<HistoricalPage> {
  final _search = TextEditingController();
  /// Reserved for a type facet; the archive exposes its vocabulary through
  /// `/historical/filters` on the web client, so no list is hard-coded here.
  final String _type = '';
  int _page = 1;
  int _nonce = 0;
  late Future<Paged<HistoricalRecord>> _future;
  late Future<HistoricalStats> _stats;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  void _load() {
    final api = AppScope.read(context).api;
    _future = api.getPaged<HistoricalRecord>(
      '/historical',
      HistoricalRecord.fromJson,
      query: {
        'q': _search.text.trim().isEmpty ? null : _search.text.trim(),
        'type': _type.isEmpty ? null : _type,
        'page': _page,
        'pageSize': 20,
        '_n': _nonce,
      },
    );
    _stats = api.getObject('/historical/stats', HistoricalStats.fromJson);
  }

  void _apply() {
    setState(() {
      _page = 1;
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
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
            child: TextField(
              controller: _search,
              textInputAction: TextInputAction.search,
              onSubmitted: (_) => _apply(),
              decoration: const InputDecoration(
                hintText: 'Search event, type or location…',
                prefixIcon: Icon(Icons.search_rounded, size: 20),
              ),
            ),
          ),
        ),
        Expanded(
          child: FutureBuilder<Paged<HistoricalRecord>>(
            future: _future,
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const LoadingView(message: 'Loading archive…');
              }
              if (snapshot.hasError) {
                return ErrorView(error: snapshot.error!, onRetry: _apply);
              }
              final data = snapshot.data!;
              return RefreshIndicator(
                onRefresh: () async {
                  _apply();
                  await _future;
                },
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(16, 10, 16, 20),
                  children: [
                    _ArchiveSummary(stats: _stats),
                    const SizedBox(height: 12),
                    if (data.items.isEmpty)
                      const Padding(
                        padding: EdgeInsets.only(top: 40),
                        child: EmptyView(
                          icon: Icons.history_edu_outlined,
                          title: 'No records match',
                          message: 'Try a different search term, for example a year, region or disaster type.',
                        ),
                      )
                    else ...[
                      Text(
                        '${formatCount(data.total)} recorded events',
                        style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 8),
                      for (final r in data.items) _RecordTile(record: r),
                      if (data.totalPages > 1)
                        Padding(
                          padding: const EdgeInsets.only(top: 10),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              IconButton(
                                onPressed: _page > 1 ? () => setState(() { _page--; _nonce++; _load(); }) : null,
                                icon: const Icon(Icons.chevron_left_rounded),
                              ),
                              Text('Page $_page of ${data.totalPages}', style: const TextStyle(fontSize: 12.5)),
                              IconButton(
                                onPressed: _page < data.totalPages ? () => setState(() { _page++; _nonce++; _load(); }) : null,
                                icon: const Icon(Icons.chevron_right_rounded),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ],
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _ArchiveSummary extends StatelessWidget {
  const _ArchiveSummary({required this.stats});
  final Future<HistoricalStats> stats;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<HistoricalStats>(
      future: stats,
      builder: (context, snapshot) {
        if (!snapshot.hasData) return const SizedBox.shrink();
        final s = snapshot.data!;
        return Column(
          children: [
            Row(
              children: [
                Expanded(
                  child: StatTile(
                    label: 'Events in archive',
                    value: formatCount(s.total),
                    icon: Icons.inventory_2_outlined,
                    accent: const Color(0xFF2563EB),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: StatTile(
                    label: 'Most common type',
                    value: s.byType.isEmpty ? '—' : s.byType.first.label,
                    caption: s.byType.isEmpty ? null : '${formatCount(s.byType.first.count)} events',
                    icon: Icons.category_outlined,
                    accent: const Color(0xFF0D9488),
                  ),
                ),
              ],
            ),
            if (s.unavailable.isNotEmpty) ...[
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF3C7),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  'Some archive metrics are unavailable (${s.unavailable.join(', ')}).',
                  style: const TextStyle(fontSize: 12, color: Color(0xFF92400E)),
                ),
              ),
            ],
          ],
        );
      },
    );
  }
}

class _RecordTile extends StatelessWidget {
  const _RecordTile({required this.record});
  final HistoricalRecord record;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade200,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    '${record.startYear}',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                  ),
                ),
                const SizedBox(width: 9),
                Expanded(
                  child: Text(
                    record.displayName,
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, height: 1.3),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              [
                record.disasterSubtype ?? record.disasterType,
                if (record.location != null) record.location!,
              ].join(' · '),
              style: TextStyle(fontSize: 12.5, color: Colors.grey.shade700),
            ),
            if (record.totalAffected != null || record.totalDeaths != null) ...[
              const SizedBox(height: 5),
              Text(
                [
                  if (record.totalAffected != null) '${formatCount(record.totalAffected)} affected',
                  if (record.totalDeaths != null) '${formatCount(record.totalDeaths)} deaths',
                ].join(' · '),
                style: TextStyle(fontSize: 11.5, color: Colors.grey.shade600),
              ),
            ],
            if (!record.hasCoordinates) ...[
              const SizedBox(height: 5),
              Text(
                'No coordinates in the source record — not shown on the map.',
                style: TextStyle(fontSize: 11, color: Colors.grey.shade500, fontStyle: FontStyle.italic),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
