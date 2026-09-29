import 'package:flutter/material.dart';

import '../api/api_client.dart';
import '../api/models.dart';
import '../app_scope.dart';
import '../theme.dart';
import '../widgets/common.dart';

class SheltersPage extends StatefulWidget {
  const SheltersPage({super.key});

  @override
  State<SheltersPage> createState() => _SheltersPageState();
}

class _SheltersPageState extends State<SheltersPage> {
  final _search = TextEditingController();
  String _status = '';
  bool _hasSpaceOnly = false;
  int _page = 1;
  int _nonce = 0;
  late Future<Paged<Shelter>> _future;

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
    _future = AppScope.read(context).api.getPaged<Shelter>(
      '/shelters',
      Shelter.fromJson,
      query: {
        'q': _search.text.trim().isEmpty ? null : _search.text.trim(),
        'status': _status.isEmpty ? null : _status,
        'hasSpace': _hasSpaceOnly ? 'true' : null,
        'page': _page,
        'pageSize': 20,
        '_n': _nonce,
      },
    );
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
            child: Column(
              children: [
                TextField(
                  controller: _search,
                  textInputAction: TextInputAction.search,
                  onSubmitted: (_) => _apply(),
                  decoration: const InputDecoration(
                    hintText: 'Search shelter or address…',
                    prefixIcon: Icon(Icons.search_rounded, size: 20),
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: Wrap(
                        spacing: 6,
                        children: [
                          for (final s in ShelterStatus.all)
                            ChoiceChip(
                              label: Text(ShelterStatus.label(s), style: const TextStyle(fontSize: 12)),
                              selected: _status == s,
                              visualDensity: VisualDensity.compact,
                              onSelected: (v) {
                                setState(() => _status = v ? s : '');
                                _apply();
                              },
                            ),
                        ],
                      ),
                    ),
                    FilterChip(
                      label: const Text('Beds free', style: TextStyle(fontSize: 12)),
                      selected: _hasSpaceOnly,
                      visualDensity: VisualDensity.compact,
                      onSelected: (v) {
                        setState(() => _hasSpaceOnly = v);
                        _apply();
                      },
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        Expanded(
          child: FutureBuilder<Paged<Shelter>>(
            future: _future,
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const LoadingView(message: 'Loading shelters…');
              }
              if (snapshot.hasError) {
                return ErrorView(error: snapshot.error!, onRetry: _apply);
              }
              final data = snapshot.data!;
              if (data.items.isEmpty) {
                return const EmptyView(
                  icon: Icons.home_work_outlined,
                  title: 'No shelters match',
                  message: 'Try clearing the filters, or check back once shelters are registered.',
                );
              }
              final totalCapacity = data.items.fold<int>(0, (a, s) => a + s.capacity);
              final totalOccupied = data.items.fold<int>(0, (a, s) => a + s.currentOccupancy);
              return RefreshIndicator(
                onRefresh: () async {
                  _apply();
                  await _future;
                },
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(16, 10, 16, 20),
                  children: [
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${formatCount(totalCapacity - totalOccupied)} of ${formatCount(totalCapacity)} beds free on this page',
                              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                            ),
                            const SizedBox(height: 8),
                            CapacityBar(used: totalOccupied, total: totalCapacity),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    for (final s in data.items) _ShelterCard(shelter: s),
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
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _ShelterCard extends StatelessWidget {
  const _ShelterCard({required this.shelter});
  final Shelter shelter;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(13),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(shelter.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14.5)),
                ),
                StatusChip(label: ShelterStatus.label(shelter.status), colour: shelterStatusColour(shelter.status)),
              ],
            ),
            const SizedBox(height: 3),
            Text(shelter.address, style: TextStyle(fontSize: 12.5, color: Colors.grey.shade700)),
            const SizedBox(height: 10),
            Row(
              children: [
                Icon(
                  shelter.availableBeds > 0 ? Icons.bed_outlined : Icons.event_busy_outlined,
                  size: 17,
                  color: shelter.availableBeds > 0 ? const Color(0xFF16A34A) : const Color(0xFFDC2626),
                ),
                const SizedBox(width: 6),
                Text(
                  '${formatCount(shelter.availableBeds)} beds available',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: shelter.availableBeds > 0 ? const Color(0xFF16A34A) : const Color(0xFFDC2626),
                  ),
                ),
                const Spacer(),
                Text('${shelter.occupancyPercent}% full', style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
              ],
            ),
            const SizedBox(height: 8),
            CapacityBar(used: shelter.currentOccupancy, total: shelter.capacity),
            if (shelter.facilities.isNotEmpty) ...[
              const SizedBox(height: 10),
              Wrap(
                spacing: 6,
                runSpacing: 4,
                children: [
                  for (final f in shelter.facilities)
                    Chip(
                      avatar: const Icon(Icons.check_rounded, size: 13),
                      label: Text(f, style: const TextStyle(fontSize: 11)),
                      visualDensity: VisualDensity.compact,
                      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      padding: EdgeInsets.zero,
                    ),
                ],
              ),
            ],
            if (shelter.managerContact != null && shelter.managerContact!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  Icon(Icons.phone_outlined, size: 14, color: Colors.grey.shade600),
                  const SizedBox(width: 4),
                  Text(shelter.managerContact!, style: TextStyle(fontSize: 12, color: Colors.grey.shade700)),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
