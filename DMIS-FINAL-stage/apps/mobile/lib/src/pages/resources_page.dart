import 'package:flutter/material.dart';

import '../api/api_client.dart';
import '../api/models.dart';
import '../app_scope.dart';
import '../theme.dart';
import '../widgets/common.dart';

class ResourcesPage extends StatefulWidget {
  const ResourcesPage({super.key});

  @override
  State<ResourcesPage> createState() => _ResourcesPageState();
}

class _ResourcesPageState extends State<ResourcesPage> {
  String _filter = '';
  int _nonce = 0;
  late Future<Paged<ResourceItem>> _future;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    _future = AppScope.read(context).api.getPaged<ResourceItem>(
      '/resources',
      ResourceItem.fromJson,
      query: {
        'category': _filter.isEmpty ? null : _filter,
        'lowStockOnly': _filter == '__low' ? 'true' : null,
        'pageSize': 50,
        '_n': _nonce,
      },
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
    return FutureBuilder<Paged<ResourceItem>>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const LoadingView(message: 'Loading inventory…');
        }
        if (snapshot.hasError) {
          return ErrorView(error: snapshot.error!, onRetry: () => _apply(_filter));
        }
        final data = snapshot.data!;
        final low = data.items.where((r) => r.isLowStock).length;
        final categories = {for (final r in data.items) r.category};

        if (data.items.isEmpty) {
          return const EmptyView(
            icon: Icons.inventory_2_outlined,
            title: 'No resources registered',
            message: 'Relief stock appears here once an officer registers it.',
          );
        }

        return RefreshIndicator(
          onRefresh: () async {
            _apply(_filter);
            await _future;
          },
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 20),
            children: [
              if (low > 0) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFFBEB),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFFDE68A)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.warning_amber_rounded, size: 18, color: Color(0xFF92400E)),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          '$low item${low == 1 ? '' : 's'} at or below the critical threshold.',
                          style: const TextStyle(fontSize: 12.5, color: Color(0xFF92400E)),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
              ],
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
                    ChoiceChip(
                      label: const Text('Needs restock', style: TextStyle(fontSize: 12)),
                      selected: _filter == '__low',
                      visualDensity: VisualDensity.compact,
                      onSelected: (_) => _apply('__low'),
                    ),
                    const SizedBox(width: 6),
                    for (final c in categories) ...[
                      ChoiceChip(
                        label: Text(c, style: const TextStyle(fontSize: 12)),
                        selected: _filter == c,
                        visualDensity: VisualDensity.compact,
                        onSelected: (_) => _apply(c),
                      ),
                      const SizedBox(width: 6),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 12),
              for (final r in data.items) _ResourceCard(item: r),
            ],
          ),
        );
      },
    );
  }
}

class _ResourceCard extends StatelessWidget {
  const _ResourceCard({required this.item});
  final ResourceItem item;

  @override
  Widget build(BuildContext context) {
    final colour = resourceStatusColour(item.status);
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
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(item.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14.5)),
                      const SizedBox(height: 2),
                      Text(
                        '${item.category}${item.locationName != null ? ' · ${item.locationName}' : ''}',
                        style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
                      ),
                    ],
                  ),
                ),
                StatusChip(label: ResourceStatus.label(item.status), colour: colour),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                Text(
                  formatCount(item.quantityAvailable),
                  style: const TextStyle(fontSize: 21, fontWeight: FontWeight.w800),
                ),
                const SizedBox(width: 4),
                Text(item.unit, style: TextStyle(fontSize: 12.5, color: Colors.grey.shade700)),
                const Spacer(),
                if (item.allocated > 0)
                  Text('${formatCount(item.allocated)} allocated', style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
              ],
            ),
            const SizedBox(height: 8),
            CapacityBar(
              used: item.quantityAvailable,
              total: (item.quantityAvailable + item.allocated).clamp(item.lowStockThreshold, 1 << 31),
              colour: colour,
            ),
            if (item.lowStockThreshold > 0) ...[
              const SizedBox(height: 4),
              Text(
                'Critical threshold ${formatCount(item.lowStockThreshold)} ${item.unit}',
                style: TextStyle(fontSize: 11.5, color: Colors.grey.shade600),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
