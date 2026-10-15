import 'package:flutter/material.dart';

import '../api/api_client.dart';
import '../api/models.dart';
import '../app_scope.dart';
import '../theme.dart';
import '../widgets/common.dart';
import 'incident_detail_page.dart';

class TeamsPage extends StatefulWidget {
  const TeamsPage({super.key});

  @override
  State<TeamsPage> createState() => _TeamsPageState();
}

class _TeamsPageState extends State<TeamsPage> {
  String _filter = '';
  int _nonce = 0;
  late Future<Paged<RescueTeam>> _future;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    _future = AppScope.read(context).api.getPaged<RescueTeam>(
      '/teams',
      RescueTeam.fromJson,
      query: {'status': _filter.isEmpty ? null : _filter, 'pageSize': 50, '_n': _nonce},
    );
  }

  void _apply(String value) {
    setState(() {
      _filter = value;
      _nonce++;
      _load();
    });
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Paged<RescueTeam>>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const LoadingView(message: 'Loading teams…');
        }
        if (snapshot.hasError) {
          return ErrorView(error: snapshot.error!, onRetry: () => _apply(_filter));
        }
        final data = snapshot.data!;
        if (data.items.isEmpty) {
          return const EmptyView(
            icon: Icons.volunteer_activism_outlined,
            title: 'No rescue teams registered',
            message: 'Teams appear here once they are added to the DMIS roster.',
          );
        }
        final deployed = data.items.where((t) => t.status == TeamStatus.deployed).length;
        final available = data.items.where((t) => t.status == TeamStatus.available).length;

        return RefreshIndicator(
          onRefresh: () async {
            _apply(_filter);
            await _future;
          },
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 20),
            children: [
              Row(
                children: [
                  Expanded(
                    child: StatTile(
                      label: 'Available now',
                      value: formatCount(available),
                      icon: Icons.task_alt_rounded,
                      accent: const Color(0xFF16A34A),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: StatTile(
                      label: 'Deployed',
                      value: formatCount(deployed),
                      icon: Icons.flight_takeoff_rounded,
                      accent: const Color(0xFF2563EB),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    ChoiceChip(
                      label: const Text('All', style: TextStyle(fontSize: 12)),
                      selected: _filter.isEmpty,
                      visualDensity: VisualDensity.compact,
                      onSelected: (_) => _apply(''),
                    ),
                    const SizedBox(width: 6),
                    for (final s in TeamStatus.all) ...[
                      ChoiceChip(
                        label: Text(TeamStatus.label(s), style: const TextStyle(fontSize: 12)),
                        selected: _filter == s,
                        visualDensity: VisualDensity.compact,
                        onSelected: (_) => _apply(s),
                      ),
                      const SizedBox(width: 6),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 12),
              for (final t in data.items) _TeamCard(team: t),
            ],
          ),
        );
      },
    );
  }
}

class _TeamCard extends StatelessWidget {
  const _TeamCard({required this.team});
  final RescueTeam team;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 9),
      child: Padding(
        padding: const EdgeInsets.all(13),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(team.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14.5)),
                ),
                StatusChip(label: TeamStatus.label(team.status), colour: teamStatusColour(team.status)),
              ],
            ),
            const SizedBox(height: 3),
            Row(
              children: [
                Icon(Icons.engineering_outlined, size: 14, color: Colors.grey.shade600),
                const SizedBox(width: 4),
                Text(team.specialization, style: TextStyle(fontSize: 12.5, color: Colors.grey.shade700)),
                if (team.baseLocation != null) ...[
                  const SizedBox(width: 10),
                  Icon(Icons.place_outlined, size: 14, color: Colors.grey.shade600),
                  const SizedBox(width: 4),
                  Flexible(
                    child: Text(team.baseLocation!, style: TextStyle(fontSize: 12.5, color: Colors.grey.shade700), overflow: TextOverflow.ellipsis),
                  ),
                ],
              ],
            ),
            if (team.currentIncidentId != null) ...[
              const SizedBox(height: 10),
              InkWell(
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => IncidentDetailPage(incidentId: team.currentIncidentId!)),
                ),
                borderRadius: BorderRadius.circular(8),
                child: Container(
                  padding: const EdgeInsets.all(9),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFFBFDBFE)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.assignment_ind_outlined, size: 16, color: Color(0xFF1D4ED8)),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          team.currentIncidentTitle ?? 'Assigned incident',
                          style: const TextStyle(fontSize: 12.5, color: Color(0xFF1E40AF), fontWeight: FontWeight.w600),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const Icon(Icons.chevron_right_rounded, size: 16, color: Color(0xFF1D4ED8)),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
