import 'package:dmis_mobile/src/api/models.dart';
import 'package:flutter_test/flutter_test.dart';

/// These tests pin the Dart mirrors to the shared TypeScript contract. If a DTO
/// in packages/shared/src/models.ts changes shape, this file is where the mobile
/// client is supposed to fail loudly.
void main() {
  group('IncidentListItem', () {
    final json = {
      'id': 'inc-1',
      'title': 'Pune Flood 2026',
      'disasterType': 'Flood',
      'severity': 'CRITICAL',
      'status': 'RESPONSE_ACTIVE',
      'location': 'Pune, Maharashtra',
      'latitude': 18.5204,
      'longitude': 73.8567,
      'affectedPopulationEstimate': 4800,
      'reportedByName': 'Priya Sharma',
      'assignedTeamId': 'team-1',
      'assignedTeamName': 'Flood Rescue Team Alpha',
      'createdAt': '2026-01-01T10:00:00.000Z',
      'updatedAt': '2026-01-01T12:00:00.000Z',
      'resolvedAt': null,
    };

    test('maps every display field the card needs', () {
      final i = IncidentListItem.fromJson(json);
      expect(i.id, 'inc-1');
      expect(i.title, 'Pune Flood 2026');
      expect(i.severity, Severity.critical);
      expect(i.status, IncidentStatus.responseActive);
      expect(i.affectedPopulationEstimate, 4800);
      expect(i.assignedTeamName, 'Flood Rescue Team Alpha');
      expect(i.hasCoordinates, isTrue);
    });

    test('treats RESOLVED as not active and everything else as active', () {
      expect(IncidentListItem.fromJson(json).isActive, isTrue);
      expect(IncidentListItem.fromJson({...json, 'status': 'RESOLVED'}).isActive, isFalse);
    });

    test('tolerates nulls instead of throwing on a partially populated record', () {
      final i = IncidentListItem.fromJson({
        ...json,
        'latitude': null,
        'longitude': null,
        'affectedPopulationEstimate': null,
        'assignedTeamId': null,
        'assignedTeamName': null,
      });
      expect(i.hasCoordinates, isFalse);
      expect(i.affectedPopulationEstimate, isNull);
      expect(i.assignedTeamName, isNull);
    });
  });

  group('IncidentDetail', () {
    test('parses the timeline alongside the incident', () {
      final detail = IncidentDetail.fromJson({
        'id': 'inc-1',
        'title': 'Pune Flood 2026',
        'disasterType': 'Flood',
        'severity': 'CRITICAL',
        'status': 'VERIFIED',
        'location': 'Pune, Maharashtra',
        'reportedByName': 'Priya Sharma',
        'createdAt': '2026-01-01T10:00:00.000Z',
        'updatedAt': '2026-01-01T12:00:00.000Z',
        'description': 'Riverine flooding across the low-lying wards.',
        'reportedById': 'u-1',
        'alertCount': 2,
        'timeline': [
          {
            'id': 't1',
            'at': '2026-01-01T10:00:00.000Z',
            'kind': 'created',
            'label': 'Incident reported',
            'detail': null,
            'actor': 'Priya Sharma',
          },
          {
            'id': 't2',
            'at': '2026-01-01T11:00:00.000Z',
            'kind': 'assigned',
            'label': 'Team assigned',
            'detail': 'Flood Rescue Team Alpha',
            'actor': 'Arjun Rao',
          },
        ],
      });

      expect(detail.description, contains('flooding'));
      expect(detail.alertCount, 2);
      expect(detail.timeline, hasLength(2));
      expect(detail.timeline.last.kind, 'assigned');
      expect(detail.timeline.last.actor, 'Arjun Rao');
    });
  });

  group('IncidentStatus lifecycle', () {
    test('flow is forward-only and ends at RESOLVED', () {
      expect(IncidentStatus.flow.first, IncidentStatus.reported);
      expect(IncidentStatus.flow.last, IncidentStatus.resolved);
      expect(IncidentStatus.flow, hasLength(5));
    });

    test('labels are human readable, not SCREAMING_SNAKE', () {
      expect(IncidentStatus.label(IncidentStatus.responseActive), 'Response Active');
      expect(Severity.label(Severity.moderate), 'Moderate');
      expect(AlertSeverity.label(AlertSeverity.critical), 'Critical');
      expect(TeamStatus.label(TeamStatus.offDuty), 'Off Duty');
    });
  });

  group('UserRole', () {
    test('matches docs/AUTH_DESIGN.md: officers and admins edit, volunteers read', () {
      expect(UserRole.canEdit(UserRole.admin), isTrue);
      expect(UserRole.canEdit(UserRole.officer), isTrue);
      expect(UserRole.canEdit(UserRole.volunteer), isFalse);
      expect(UserRole.canEdit(null), isFalse);
    });
  });

  group('Shelter', () {
    test('uses the server-computed availableBeds so every client agrees', () {
      final s = Shelter.fromJson({
        'id': 'sh-1',
        'name': 'Shivaji Stadium Shelter',
        'address': 'Shivaji Nagar, Pune',
        'latitude': 18.53,
        'longitude': 73.85,
        'capacity': 500,
        'currentOccupancy': 120,
        'availableBeds': 380,
        'occupancyPercent': 24,
        'facilities': ['Water', 'Medical'],
        'status': 'OPEN',
        'managerContact': '+91 20 2555 0100',
      });
      expect(s.availableBeds, 380);
      expect(s.facilities, ['Water', 'Medical']);
    });
  });

  group('ResourceItem', () {
    test('carries the low-stock flag the UI warns on', () {
      final r = ResourceItem.fromJson({
        'id': 'r-1',
        'name': 'Bottled Water (1L)',
        'category': 'Water',
        'unit': 'bottles',
        'quantityAvailable': 40,
        'allocated': 300,
        'lowStockThreshold': 100,
        'status': 'LOW_STOCK',
        'isLowStock': true,
        'locationName': 'Pune Depot',
      });
      expect(r.isLowStock, isTrue);
      expect(r.status, ResourceStatus.lowStock);
      expect(r.unit, 'bottles');
    });
  });

  group('DashboardSummary', () {
    test('keeps null metrics null so the UI shows an em dash, never a false 0', () {
      final d = DashboardSummary.fromJson({
        'activeIncidents': null,
        'criticalIncidents': null,
        'affectedPopulationEstimate': null,
        'historicalDisasterCount': 783,
        'activeTeams': null,
        'shelterCapacityTotal': null,
        'shelterOccupancyTotal': null,
        'sheltersOpen': null,
        'resourcesLowStock': null,
        'resourcesOutOfStock': null,
        'resourcesTotal': null,
        'incidentsByStatus': [],
        'historicalByDecade': [
          {'decade': 2010, 'count': 162},
        ],
        'unavailable': ['incidents', 'resources'],
        'generatedAt': '2026-01-01T00:00:00.000Z',
      });
      expect(d.activeIncidents, isNull);
      expect(d.historicalDisasterCount, 783);
      expect(d.unavailable, ['incidents', 'resources']);
      expect(d.shelterOccupancyPercent, isNull, reason: 'cannot compute a percentage from nulls');
      expect(d.historicalByDecade.first.label, '2010');
    });

    test('computes occupancy percentage only when both figures are present', () {
      final d = DashboardSummary.fromJson({
        'shelterCapacityTotal': 400,
        'shelterOccupancyTotal': 100,
        'unavailable': [],
        'generatedAt': '2026-01-01T00:00:00.000Z',
      });
      expect(d.shelterOccupancyPercent, 25);
    });
  });

  group('HistoricalRecord', () {
    test('falls back to type and year when the source event has no name', () {
      final r = HistoricalRecord.fromJson({
        'id': 'h-1',
        'disNo': '1977001',
        'disasterGroup': 'Meteorological',
        'disasterType': 'Flood',
        'startYear': 1977,
        'totalAffected': 100000,
        'hasCoordinates': false,
      });
      expect(r.displayName, 'Flood, 1977');
      expect(r.hasCoordinates, isFalse);
    });

    test('uses the event name when the archive has one', () {
      final r = HistoricalRecord.fromJson({
        'id': 'h-2',
        'disNo': '2004029',
        'disasterGroup': 'Meteorological',
        'disasterType': 'Flood',
        'eventName': '2004 Indian Ocean Tsunami',
        'startYear': 2004,
      });
      expect(r.displayName, '2004 Indian Ocean Tsunami');
    });
  });
}
