import 'dart:async';

import 'package:flutter/material.dart';

import '../app_scope.dart';
import '../api/models.dart';
import '../theme.dart';
import '../widgets/common.dart';
import 'alerts_page.dart';
import 'dashboard_page.dart';
import 'historical_page.dart';
import 'incidents_page.dart';
import 'map_page.dart';
import 'resources_page.dart';
import 'shelters_page.dart';
import 'teams_page.dart';

/// Signed-in shell: bottom navigation over the field modules, with a drawer
/// for the read-only directory screens.
class ShellPage extends StatefulWidget {
  const ShellPage({super.key});

  @override
  State<ShellPage> createState() => _ShellPageState();
}

class _ShellPageState extends State<ShellPage> with WidgetsBindingObserver {
  int _index = 0;
  DateTime _lastSync = DateTime.now();
  final List<Timer> _timers = [];

  static const _tabs = [
    _Tab('Overview', Icons.dashboard_outlined, Icons.dashboard_rounded),
    _Tab('Incidents', Icons.report_problem_outlined, Icons.report_problem_rounded),
    _Tab('Alerts', Icons.campaign_outlined, Icons.campaign_rounded),
    _Tab('Map', Icons.map_outlined, Icons.map_rounded),
    _Tab('More', Icons.grid_view_outlined, Icons.grid_view_rounded),
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    // Light polling keeps the field view in step with the web console without
    // holding a socket open, which drains battery on poor connections.
    _timers.add(Timer.periodic(const Duration(seconds: 60), (_) {
      if (mounted) setState(() => _lastSync = DateTime.now());
    }));
  }

  @override
  void dispose() {
    for (final t in _timers) {
      t.cancel();
    }
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && mounted) {
      setState(() => _lastSync = DateTime.now());
    }
  }

  Future<void> _signOut() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Sign out?'),
        content: const Text('You will need your DMIS credentials to sign back in.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Sign out')),
        ],
      ),
    );
    if (confirmed == true && mounted) {
      await AppScope.of(context).session.signOut();
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = AppScope.of(context).session.user;
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(_tabs[_index].label, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
            Text(
              'Synced ${formatRelative(_lastSync)}',
              style: TextStyle(fontSize: 11, color: Colors.grey.shade600, fontWeight: FontWeight.w400),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Refresh now',
            onPressed: () => setState(() => _lastSync = DateTime.now()),
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      drawer: _AppDrawer(user: user, onSignOut: _signOut),
      body: IndexedStack(
        index: _index,
        children: const [
          DashboardPage(),
          IncidentsPage(),
          AlertsPage(),
          MapPage(),
          _MorePage(),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: [
          for (final tab in _tabs)
            NavigationDestination(
              icon: Icon(tab.icon),
              selectedIcon: Icon(tab.selectedIcon),
              label: tab.label,
            ),
        ],
      ),
    );
  }
}

class _Tab {
  const _Tab(this.label, this.icon, this.selectedIcon);
  final String label;
  final IconData icon;
  final IconData selectedIcon;
}

class _MorePage extends StatelessWidget {
  const _MorePage();

  @override
  Widget build(BuildContext context) {
    final session = AppScope.of(context).session;
    final modules = <_Module>[
      _Module('Shelters', Icons.home_work_outlined, const SheltersPage()),
      _Module('Resources', Icons.inventory_2_outlined, const ResourcesPage()),
      _Module('Rescue teams', Icons.volunteer_activism_outlined, const TeamsPage()),
      _Module('Historical', Icons.history_edu_outlined, const HistoricalPage()),
    ];

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                CircleAvatar(
                  backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                  child: Text(
                    (session.user?.name.isNotEmpty == true ? session.user!.name[0] : '?').toUpperCase(),
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(session.user?.name ?? '—', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14.5)),
                      const SizedBox(height: 2),
                      Text(
                        session.user?.email ?? '',
                        style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                      ),
                      const SizedBox(height: 6),
                      StatusChip(
                        label: UserRole.canEdit(session.user?.role) ? 'Can update incidents' : 'Read-only access',
                        colour: UserRole.canEdit(session.user?.role) ? const Color(0xFF16A34A) : const Color(0xFF64748B),
                        icon: UserRole.canEdit(session.user?.role) ? Icons.edit_outlined : Icons.visibility_outlined,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        const SectionHeader(title: 'Response assets', subtitle: 'Live data shared with the DMIS web console'),
        for (final m in modules)
          Card(
            margin: const EdgeInsets.only(bottom: 10),
            child: ListTile(
              leading: Icon(m.icon, color: Theme.of(context).colorScheme.primary),
              title: Text(m.title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
              trailing: const Icon(Icons.chevron_right_rounded),
              onTap: () => _open(context, m),
            ),
          ),
      ],
    );
  }

  void _open(BuildContext context, _Module module) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => Scaffold(appBar: AppBar(title: Text(module.title)), body: module.page)),
    );
  }
}

class _Module {
  const _Module(this.title, this.icon, this.page);
  final String title;
  final IconData icon;
  final Widget page;
}

class _AppDrawer extends StatelessWidget {
  const _AppDrawer({required this.user, required this.onSignOut});

  final User? user;
  final VoidCallback onSignOut;

  @override
  Widget build(BuildContext context) {
    return Drawer(
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          DrawerHeader(
            decoration: BoxDecoration(color: Theme.of(context).colorScheme.primaryContainer),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                Text('DMIS Field', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Theme.of(context).colorScheme.onPrimaryContainer)),
                const SizedBox(height: 2),
                Text(
                  'Disaster Management Information System',
                  style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onPrimaryContainer.withValues(alpha: 0.8)),
                ),
              ],
            ),
          ),
          ListTile(
            leading: const Icon(Icons.person_outline_rounded),
            title: Text(user?.name ?? '—', style: const TextStyle(fontWeight: FontWeight.w600)),
            subtitle: Text(user == null ? '' : '${UserRole.label(user!.role)} · ${user!.email}'),          ),
          const Divider(height: 1),
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 14, 16, 6),
            child: Text('SECTIONS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 0.8)),
          ),
          ListTile(leading: const Icon(Icons.dashboard_outlined), title: const Text('Overview')),
          ListTile(leading: const Icon(Icons.report_problem_outlined), title: const Text('Incidents')),
          ListTile(leading: const Icon(Icons.campaign_outlined), title: const Text('Alerts')),
          ListTile(leading: const Icon(Icons.map_outlined), title: const Text('Live map')),
          ListTile(leading: const Icon(Icons.home_work_outlined), title: const Text('Shelters')),
          ListTile(leading: const Icon(Icons.inventory_2_outlined), title: const Text('Resources')),
          ListTile(leading: const Icon(Icons.volunteer_activism_outlined), title: const Text('Rescue teams')),
          ListTile(leading: const Icon(Icons.history_edu_outlined), title: const Text('Historical archive')),
          const Divider(height: 20),
          ListTile(
            leading: const Icon(Icons.logout_rounded),
            title: const Text('Sign out'),
            onTap: () {
              Navigator.of(context).pop();
              onSignOut();
            },
          ),
        ],
      ),
    );
  }
}
