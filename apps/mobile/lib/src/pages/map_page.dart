import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../api/api_client.dart';
import '../api/models.dart';
import '../app_scope.dart';
import '../theme.dart';
import '../widgets/common.dart';
import 'incident_detail_page.dart';

/// Field map of live incidents and shelters.
///
/// Tiles come from OpenStreetMap, so there is no API key and no account. If the
/// basemap cannot be fetched the list below still shows every location, so the
/// screen degrades instead of breaking.
class MapPage extends StatefulWidget {
  const MapPage({super.key});

  @override
  State<MapPage> createState() => _MapPageState();
}

class _MapPageState extends State<MapPage> {
  late Future<MapLayers> _future;
  bool _showShelters = true;
  final MapController _controller = MapController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    _future = AppScope.read(context).api.getObject('/map/layers', MapLayers.fromJson);
  }

  void _reload() {
    setState(_load);
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<MapLayers>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const LoadingView(message: 'Loading map layers…');
        }
        if (snapshot.hasError) {
          return ErrorView(error: snapshot.error!, onRetry: _reload);
        }
        final data = snapshot.data!;
        final shelters = _showShelters ? data.shelters : const <MapShelterPoint>[];

        return RefreshIndicator(
          onRefresh: () async {
            _reload();
            await _future;
          },
          child: ListView(
            padding: EdgeInsets.zero,
            children: [
              SizedBox(
                height: 320,
                child: Stack(
                  children: [
                    FlutterMap(
                      mapController: _controller,
                      options: const MapOptions(
                        initialCenter: LatLng(22.5, 79),
                        initialZoom: 4.6,
                      ),
                      children: [
                        TileLayer(
                          urlTemplate: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                          userAgentPackageName: 'in.gov.dmis.dmis_mobile',
                        ),
                        MarkerLayer(
                          markers: [
                            for (final s in shelters)
                              Marker(
                                point: LatLng(s.latitude, s.longitude),
                                width: 30,
                                height: 30,
                                child: _Pin(
                                  colour: s.availableBeds > 0 ? const Color(0xFF0D9488) : const Color(0xFFDC2626),
                                  icon: Icons.home_work_rounded,
                                ),
                              ),
                            for (final i in data.incidents)
                              Marker(
                                point: LatLng(i.latitude, i.longitude),
                                width: 38,
                                height: 38,
                                child: GestureDetector(
                                  onTap: () => Navigator.of(context).push(
                                    MaterialPageRoute(builder: (_) => IncidentDetailPage(incidentId: i.id)),
                                  ),
                                  child: _Pin(
                                    colour: severityColour(i.severity),
                                    icon: Icons.priority_high_rounded,
                                    emphasised: true,
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ],
                    ),
                    Positioned(
                      right: 10,
                      top: 10,
                      child: Column(
                        children: [
                          _MapButton(
                            icon: Icons.my_location_rounded,
                            tooltip: 'Centre on India',
                            onTap: () => _controller.move(LatLng(22.5, 79), 4.6),
                          ),
                          const SizedBox(height: 8),
                          _MapButton(
                            icon: _showShelters ? Icons.home_work_rounded : Icons.home_work_outlined,
                            tooltip: _showShelters ? 'Hide shelters' : 'Show shelters',
                            active: _showShelters,
                            onTap: () => setState(() => _showShelters = !_showShelters),
                          ),
                        ],
                      ),
                    ),
                    Positioned(
                      left: 10,
                      bottom: 10,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.92),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Text('© OpenStreetMap', style: TextStyle(fontSize: 10, color: Colors.black54)),
                      ),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (data.unavailable.isNotEmpty) ...[
                      _Warning(text: 'Some layers could not be loaded (${data.unavailable.join(', ')}).'),
                      const SizedBox(height: 12),
                    ],
                    SectionHeader(
                      title: 'Active incidents',
                      subtitle: '${data.incidents.length} located on the map',
                    ),
                    if (data.incidents.isEmpty)
                      const EmptyView(
                        icon: Icons.check_circle_outline_rounded,
                        title: 'No located incidents',
                        message: 'Incidents appear here once they have coordinates.',
                      )
                    else
                      for (final i in data.incidents)
                        Card(
                          margin: const EdgeInsets.only(bottom: 8),
                          child: ListTile(
                            onTap: () => Navigator.of(context).push(
                              MaterialPageRoute(builder: (_) => IncidentDetailPage(incidentId: i.id)),
                            ),
                            leading: StatusChip(label: '', colour: severityColour(i.severity)),
                            title: Text(i.title, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600)),
                            subtitle: Text(
                              '${i.location} · ${IncidentStatus.label(i.status)}',
                              style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
                            ),
                            trailing: const Icon(Icons.chevron_right_rounded),
                          ),
                        ),
                    const SizedBox(height: 14),
                    SectionHeader(title: 'Shelters', subtitle: '${data.shelters.length} registered'),
                    if (data.shelters.isEmpty)
                      const EmptyView(icon: Icons.home_work_outlined, title: 'No shelters registered'),
                    for (final s in data.shelters)
                      Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: ListTile(
                          onTap: () => _controller.move(LatLng(s.latitude, s.longitude), 12),
                          leading: StatusChip(label: '', colour: shelterStatusColour(s.status)),
                          title: Text(s.name, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600)),
                          subtitle: Text(
                            '${formatCount(s.availableBeds)} beds available',
                            style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
                          ),
                          trailing: const Icon(Icons.center_focus_strong_rounded, size: 18),
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _Pin extends StatelessWidget {
  const _Pin({required this.colour, required this.icon, this.emphasised = false});

  final Color colour;
  final IconData icon;
  final bool emphasised;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: colour,
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white, width: 2.5),
        boxShadow: const [BoxShadow(blurRadius: 5, color: Colors.black26)],
      ),
      child: Icon(icon, color: Colors.white, size: emphasised ? 20 : 15),
    );
  }
}

class _MapButton extends StatelessWidget {
  const _MapButton({required this.icon, required this.tooltip, required this.onTap, this.active = false});

  final IconData icon;
  final String tooltip;
  final VoidCallback onTap;
  final bool active;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: active ? Theme.of(context).colorScheme.primary : Colors.white,
      elevation: 2,
      shape: const CircleBorder(),
      child: IconButton(
        onPressed: onTap,
        tooltip: tooltip,
        icon: Icon(icon, size: 19, color: active ? Colors.white : Colors.black87),
      ),
    );
  }
}

class _Warning extends StatelessWidget {
  const _Warning({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
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
            child: Text(text, style: const TextStyle(fontSize: 12.5, color: Color(0xFF92400E), height: 1.35)),
          ),
        ],
      ),
    );
  }
}
