import 'package:flutter/material.dart';

import '../api/api_client.dart';
import '../api/models.dart';
import '../app_scope.dart';
import '../theme.dart';
import '../widgets/common.dart';
import 'incident_detail_page.dart';

class IncidentsPage extends StatefulWidget {
  const IncidentsPage({super.key});

  @override
  State<IncidentsPage> createState() => _IncidentsPageState();
}

class _IncidentsPageState extends State<IncidentsPage> {
  final _search = TextEditingController();
  String _status = '';
  String _severity = '';
  bool _activeOnly = true;
  int _page = 1;
  int _nonce = 0;
  late Future<Paged<IncidentListItem>> _page_;

  static const _pageSize = 15;

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
    _page_ = api.getPaged<IncidentListItem>(
      '/incidents',
      IncidentListItem.fromJson,
      query: {
        'q': _search.text.trim().isEmpty ? null : _search.text.trim(),
        'status': _status.isEmpty ? null : _status,
        'severity': _severity.isEmpty ? null : _severity,
        'active': _activeOnly ? 'true' : null,
        'page': _page,
        'pageSize': _pageSize,
        '_n': _nonce,
      },
    );
  }

  void _apply([int? page]) {
    setState(() {
      _page = page ?? 1;
      _nonce++;
      _load();
    });
  }

  Future<void> _refresh() async {
    setState(() => _nonce++);
    _load();
    await _page_;
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        _Filters(
          search: _search,
          status: _status,
          severity: _severity,
          activeOnly: _activeOnly,
          onSearch: () => _apply(),
          onStatus: (v) => setState(() => _status = v),
          onSeverity: (v) => setState(() => _severity = v),
          onActiveOnly: (v) => setState(() => _activeOnly = v),
          onApply: () => _apply(),
        ),
        Expanded(
          child: FutureBuilder<Paged<IncidentListItem>>(
            future: _page_,
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting && _page == 1) {
                return const LoadingView(message: 'Loading incidents…');
              }
              if (snapshot.hasError) {
                return ErrorView(error: snapshot.error!, onRetry: () => _apply());
              }
              final data = snapshot.data!;
              if (data.items.isEmpty) {
                return EmptyView(
                  icon: Icons.report_problem_outlined,
                  title: 'No incidents match these filters',
                  message: _activeOnly
                      ? 'Nothing is currently active with these filters. Turn off "Active only" to include resolved incidents.'
                      : 'Nothing matches these filters. Try widening the search.',
                );
              }
              return RefreshIndicator(
                onRefresh: _refresh,
                child: ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 20),
                  itemCount: data.items.length + 1,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    if (index == data.items.length) {
                      return _Pager(page: data.page, totalPages: data.totalPages, total: data.total, onPage: _apply);
                    }
                    return _IncidentCard(incident: data.items[index]);
                  },
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _Filters extends StatelessWidget {
  const _Filters({
    required this.search,
    required this.status,
    required this.severity,
    required this.activeOnly,
    required this.onSearch,
    required this.onStatus,
    required this.onSeverity,
    required this.onActiveOnly,
    required this.onApply,
  });

  final TextEditingController search;
  final String status;
  final String severity;
  final bool activeOnly;
  final VoidCallback onSearch;
  final ValueChanged<String> onStatus;
  final ValueChanged<String> onSeverity;
  final ValueChanged<bool> onActiveOnly;
  final VoidCallback onApply;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
        child: Column(
          children: [
            TextField(
              controller: search,
              textInputAction: TextInputAction.search,
              onSubmitted: (_) => onApply(),
              decoration: InputDecoration(
                hintText: 'Search title, type or location…',
                prefixIcon: const Icon(Icons.search_rounded, size: 20),
                suffixIcon: search.text.isEmpty
                    ? null
                    : IconButton(
                        icon: const Icon(Icons.close_rounded, size: 18),
                        onPressed: () {
                          search.clear();
                          onApply();
                        },
                      ),
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: _Dropdown(
                    value: status,
                    hint: 'Any status',
                    items: [for (final s in IncidentStatus.all) (s, IncidentStatus.label(s))],
                    onChanged: (v) {
                      onStatus(v);
                      onApply();
                    },
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _Dropdown(
                    value: severity,
                    hint: 'Any severity',
                    items: [for (final s in Severity.all) (s, Severity.label(s))],
                    onChanged: (v) {
                      onSeverity(v);
                      onApply();
                    },
                  ),
                ),
              ],
            ),
            SwitchListTile(
              value: activeOnly,
              onChanged: (v) {
                onActiveOnly(v);
                onApply();
              },
              title: const Text('Active incidents only', style: TextStyle(fontSize: 13)),
              dense: true,
              contentPadding: EdgeInsets.zero,
              visualDensity: VisualDensity.compact,
            ),
          ],
        ),
      ),
    );
  }
}

class _Dropdown extends StatelessWidget {
  const _Dropdown({required this.value, required this.hint, required this.items, required this.onChanged});

  final String value;
  final String hint;
  final List<(String, String)> items;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return InputDecorator(
      decoration: const InputDecoration(contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 10)),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: value,
          isExpanded: true,
          isDense: true,
          hint: Text(hint, style: const TextStyle(fontSize: 13)),
          items: [
            DropdownMenuItem(value: '', child: Text(hint, style: const TextStyle(fontSize: 13))),
            for (final (v, label) in items) DropdownMenuItem(value: v, child: Text(label, style: const TextStyle(fontSize: 13))),
          ],
          onChanged: (v) => onChanged(v ?? ''),
        ),
      ),
    );
  }
}

class _IncidentCard extends StatelessWidget {
  const _IncidentCard({required this.incident});
  final IncidentListItem incident;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => IncidentDetailPage(incidentId: incident.id)),
        ),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Text(incident.title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14.5, height: 1.25)),
                  ),
                  const SizedBox(width: 8),
                  StatusChip(label: Severity.label(incident.severity), colour: severityColour(incident.severity)),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                '${incident.location} · ${incident.disasterType}',
                style: TextStyle(fontSize: 12.5, color: Colors.grey.shade700),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 6,
                runSpacing: 4,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  StatusChip(
                    label: IncidentStatus.label(incident.status),
                    colour: incidentStatusColour(incident.status),
                    icon: incident.status == IncidentStatus.resolved ? Icons.check_circle_outline_rounded : null,
                  ),
                  if (incident.assignedTeamName != null)
                    Chip(
                      avatar: const Icon(Icons.volunteer_activism_outlined, size: 14),
                      label: Text(incident.assignedTeamName!, style: const TextStyle(fontSize: 11.5)),
                      visualDensity: VisualDensity.compact,
                      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      padding: EdgeInsets.zero,
                    ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                [
                  if (incident.affectedPopulationEstimate != null) '${formatCount(incident.affectedPopulationEstimate)} affected',
                  'reported ${formatRelative(DateTime.tryParse(incident.createdAt))}',
                  'by ${incident.reportedByName}',
                ].join(' · '),
                style: TextStyle(fontSize: 11.5, color: Colors.grey.shade600),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Pager extends StatelessWidget {
  const _Pager({required this.page, required this.totalPages, required this.total, required this.onPage});

  final int page;
  final int totalPages;
  final int total;
  final void Function(int page) onPage;

  @override
  Widget build(BuildContext context) {
    if (totalPages <= 1) {
      return Padding(
        padding: const EdgeInsets.only(top: 8),
        child: Center(child: Text('${formatCount(total)} incidents', style: TextStyle(fontSize: 12, color: Colors.grey.shade600))),
      );
    }
    return Padding(
      padding: const EdgeInsets.only(top: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          IconButton(
            onPressed: page > 1 ? () => onPage(page - 1) : null,
            icon: const Icon(Icons.chevron_left_rounded),
            tooltip: 'Previous page',
          ),
          Text('Page $page of $totalPages', style: const TextStyle(fontSize: 12.5)),
          IconButton(
            onPressed: page < totalPages ? () => onPage(page + 1) : null,
            icon: const Icon(Icons.chevron_right_rounded),
            tooltip: 'Next page',
          ),
        ],
      ),
    );
  }
}
