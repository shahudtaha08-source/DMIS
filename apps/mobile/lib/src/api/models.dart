/// Dart mirrors of the shared TypeScript DTOs in `packages/shared/src/models.ts`.
///
/// Field names match the API 1:1 on purpose: these are a transport contract, not
/// a second domain model. When the shared contract changes, these change with
/// it - the alternative (a prettified mobile-only shape) guarantees drift.
library;

// --- Enums (mirrors packages/shared/src/enums.ts) --------------------------

class Severity {
  static const critical = 'CRITICAL';
  static const high = 'HIGH';
  static const moderate = 'MODERATE';
  static const low = 'LOW';
  static const all = [critical, high, moderate, low];
  static String label(String s) => _capitalise(s);
}

class IncidentStatus {
  static const reported = 'REPORTED';
  static const verified = 'VERIFIED';
  static const responseActive = 'RESPONSE_ACTIVE';
  static const stabilized = 'STABILIZED';
  static const resolved = 'RESOLVED';
  static const all = [reported, verified, responseActive, stabilized, resolved];
  /// Forward-only lifecycle, mirrored from the shared transition table.
  static const flow = [reported, verified, responseActive, stabilized, resolved];
  static String label(String s) => _humanise(s);
}

class AlertSeverity {
  static const critical = 'CRITICAL';
  static const warning = 'WARNING';
  static const advisory = 'ADVISORY';
  static const info = 'INFO';
  static const all = [critical, warning, advisory, info];
  static String label(String s) => _humanise(s);
}

class ShelterStatus {
  static const open = 'OPEN';
  static const full = 'FULL';
  static const closed = 'CLOSED';
  static const all = [open, full, closed];
  static String label(String s) => _capitalise(s);
}

class ResourceStatus {
  static const available = 'AVAILABLE';
  static const lowStock = 'LOW_STOCK';
  static const outOfStock = 'OUT_OF_STOCK';
  static String label(String s) => _humanise(s);
}

class TeamStatus {
  static const available = 'AVAILABLE';
  static const deployed = 'DEPLOYED';
  static const offDuty = 'OFF_DUTY';
  static const all = [available, deployed, offDuty];
  static String label(String s) => _humanise(s);
}

class UserRole {
  static const admin = 'ADMIN';
  static const officer = 'OFFICER';
  static const volunteer = 'VOLUNTEER';
  /// Mirrors docs/AUTH_DESIGN.md: volunteers are read-only in the field.
  static bool canEdit(String? role) => role == admin || role == officer;
  static String label(String role) => switch (role) {
        admin => 'Administrator',
        officer => 'Officer',
        volunteer => 'Volunteer',
        _ => role,
      };
}

String _capitalise(String s) => s.isEmpty ? s : s[0].toUpperCase() + s.substring(1).toLowerCase();
String _humanise(String s) {
  final words = s.split('_').where((w) => w.isNotEmpty).map(_capitalise).join(' ');
  return words;
}

// --- Parsing helpers --------------------------------------------------------

int? _intOrNull(dynamic v) => v == null ? null : (v as num).toInt();
double? _dblOrNull(dynamic v) => v == null ? null : (v as num).toDouble();
int _int(dynamic v, [int fallback = 0]) => v == null ? fallback : (v as num).toInt();
double _dbl(dynamic v, [double fallback = 0]) => v == null ? fallback : (v as num).toDouble();
String _str(dynamic v, [String fallback = '']) => v == null ? fallback : v.toString();
List<String> _strList(dynamic v) => (v as List<dynamic>? ?? const []).map((e) => e.toString()).toList(growable: false);

// --- Models -----------------------------------------------------------------

class User {
  const User({
    required this.id,
    required this.email,
    required this.name,
    required this.role,
    this.phone,
    required this.isActive,
  });

  final String id;
  final String email;
  final String name;
  final String role;
  final String? phone;
  final bool isActive;

  factory User.fromJson(Map<String, dynamic> j) => User(
        id: _str(j['id']),
        email: _str(j['email']),
        name: _str(j['name']),
        role: _str(j['role']),
        phone: j['phone'] as String?,
        isActive: j['isActive'] as bool? ?? true,
      );
}

class IncidentListItem {
  const IncidentListItem({
    required this.id,
    required this.title,
    required this.disasterType,
    required this.severity,
    required this.status,
    required this.location,
    required this.reportedByName,
    required this.createdAt,
    required this.updatedAt,
    this.latitude,
    this.longitude,
    this.affectedPopulationEstimate,
    this.assignedTeamId,
    this.assignedTeamName,
    this.resolvedAt,
  });

  final String id;
  final String title;
  final String disasterType;
  final String severity;
  final String status;
  final String location;
  final String reportedByName;
  final String createdAt;
  final String updatedAt;
  final double? latitude;
  final double? longitude;
  final int? affectedPopulationEstimate;
  final String? assignedTeamId;
  final String? assignedTeamName;
  final String? resolvedAt;

  bool get isActive => status != IncidentStatus.resolved;
  bool get hasCoordinates => latitude != null && longitude != null;

  factory IncidentListItem.fromJson(Map<String, dynamic> j) => IncidentListItem(
        id: _str(j['id']),
        title: _str(j['title']),
        disasterType: _str(j['disasterType']),
        severity: _str(j['severity']),
        status: _str(j['status']),
        location: _str(j['location']),
        reportedByName: _str(j['reportedByName']),
        createdAt: _str(j['createdAt']),
        updatedAt: _str(j['updatedAt']),
        latitude: _dblOrNull(j['latitude']),
        longitude: _dblOrNull(j['longitude']),
        affectedPopulationEstimate: _intOrNull(j['affectedPopulationEstimate']),
        assignedTeamId: j['assignedTeamId'] as String?,
        assignedTeamName: j['assignedTeamName'] as String?,
        resolvedAt: j['resolvedAt'] as String?,
      );
}

class TimelineEvent {
  const TimelineEvent({
    required this.id,
    required this.at,
    required this.kind,
    required this.label,
    this.detail,
    this.actor,
  });

  final String id;
  final String at;
  final String kind;
  final String label;
  final String? detail;
  final String? actor;

  factory TimelineEvent.fromJson(Map<String, dynamic> j) => TimelineEvent(
        id: _str(j['id']),
        at: _str(j['at']),
        kind: _str(j['kind']),
        label: _str(j['label']),
        detail: j['detail'] as String?,
        actor: j['actor'] as String?,
      );
}

class IncidentDetail {
  const IncidentDetail({
    required this.summary,
    required this.description,
    required this.reportedById,
    required this.alertCount,
    required this.timeline,
  });

  final IncidentListItem summary;
  final String description;
  final String reportedById;
  final int alertCount;
  final List<TimelineEvent> timeline;

  String get id => summary.id;
  IncidentListItem get listItem => summary;

  factory IncidentDetail.fromJson(Map<String, dynamic> j) => IncidentDetail(
        summary: IncidentListItem.fromJson(j),
        description: _str(j['description']),
        reportedById: _str(j['reportedById']),
        alertCount: _int(j['alertCount']),
        timeline: (j['timeline'] as List<dynamic>? ?? const [])
            .map((e) => TimelineEvent.fromJson(e as Map<String, dynamic>))
            .toList(growable: false),
      );
}

class RescueTeam {
  const RescueTeam({
    required this.id,
    required this.name,
    required this.specialization,
    required this.status,
    required this.activeIncidents,
    this.baseLocation,
    this.currentIncidentId,
    this.currentIncidentTitle,
  });

  final String id;
  final String name;
  final String specialization;
  final String status;
  final int activeIncidents;
  final String? baseLocation;
  final String? currentIncidentId;
  final String? currentIncidentTitle;

  factory RescueTeam.fromJson(Map<String, dynamic> j) => RescueTeam(
        id: _str(j['id']),
        name: _str(j['name']),
        specialization: _str(j['specialization']),
        status: _str(j['status']),
        activeIncidents: _int(j['activeIncidents']),
        baseLocation: j['baseLocation'] as String?,
        currentIncidentId: j['currentIncidentId'] as String?,
        currentIncidentTitle: j['currentIncidentTitle'] as String?,
      );
}

class AlertItem {
  const AlertItem({
    required this.id,
    required this.title,
    required this.message,
    required this.severity,
    required this.status,
    required this.affectedArea,
    required this.validFrom,
    required this.validUntil,
    required this.createdAt,
    this.relatedIncidentId,
    this.relatedIncidentTitle,
  });

  final String id;
  final String title;
  final String message;
  final String severity;
  final String status;
  final String affectedArea;
  final String validFrom;
  final String validUntil;
  final String createdAt;
  final String? relatedIncidentId;
  final String? relatedIncidentTitle;

  bool get isPublished => status == 'PUBLISHED';
  bool get isExpired => DateTime.tryParse(validUntil)?.isBefore(DateTime.now()) ?? false;

  factory AlertItem.fromJson(Map<String, dynamic> j) => AlertItem(
        id: _str(j['id']),
        title: _str(j['title']),
        message: _str(j['message']),
        severity: _str(j['severity']),
        status: _str(j['status']),
        affectedArea: _str(j['affectedArea']),
        validFrom: _str(j['validFrom']),
        validUntil: _str(j['validUntil']),
        createdAt: _str(j['createdAt']),
        relatedIncidentId: j['relatedIncidentId'] as String?,
        relatedIncidentTitle: j['relatedIncidentTitle'] as String?,
      );
}

class Shelter {
  const Shelter({
    required this.id,
    required this.name,
    required this.address,
    required this.latitude,
    required this.longitude,
    required this.capacity,
    required this.currentOccupancy,
    required this.availableBeds,
    required this.occupancyPercent,
    required this.facilities,
    required this.status,
    this.managerContact,
  });

  final String id;
  final String name;
  final String address;
  final double latitude;
  final double longitude;
  final int capacity;
  final int currentOccupancy;
  final int availableBeds;
  final int occupancyPercent;
  final List<String> facilities;
  final String status;
  final String? managerContact;

  factory Shelter.fromJson(Map<String, dynamic> j) => Shelter(
        id: _str(j['id']),
        name: _str(j['name']),
        address: _str(j['address']),
        latitude: _dbl(j['latitude']),
        longitude: _dbl(j['longitude']),
        capacity: _int(j['capacity']),
        currentOccupancy: _int(j['currentOccupancy']),
        availableBeds: _int(j['availableBeds']),
        occupancyPercent: _int(j['occupancyPercent']),
        facilities: _strList(j['facilities']),
        status: _str(j['status']),
        managerContact: j['managerContact'] as String?,
      );
}

class ResourceItem {
  const ResourceItem({
    required this.id,
    required this.name,
    required this.category,
    required this.unit,
    required this.quantityAvailable,
    required this.allocated,
    required this.lowStockThreshold,
    required this.status,
    required this.isLowStock,
    this.locationName,
  });

  final String id;
  final String name;
  final String category;
  final String unit;
  final int quantityAvailable;
  final int allocated;
  final int lowStockThreshold;
  final String status;
  final bool isLowStock;
  final String? locationName;

  factory ResourceItem.fromJson(Map<String, dynamic> j) => ResourceItem(
        id: _str(j['id']),
        name: _str(j['name']),
        category: _str(j['category']),
        unit: _str(j['unit']),
        quantityAvailable: _int(j['quantityAvailable']),
        allocated: _int(j['allocated']),
        lowStockThreshold: _int(j['lowStockThreshold']),
        status: _str(j['status']),
        isLowStock: j['isLowStock'] as bool? ?? false,
        locationName: j['locationName'] as String?,
      );
}

class HistoricalRecord {
  const HistoricalRecord({
    required this.id,
    required this.disNo,
    required this.disasterGroup,
    required this.disasterType,
    required this.startYear,
    this.eventName,
    this.disasterSubtype,
    this.location,
    this.totalAffected,
    this.totalDeaths,
    this.hasCoordinates = false,
  });

  final String id;
  final String disNo;
  final String disasterGroup;
  final String disasterType;
  final int startYear;
  final String? eventName;
  final String? disasterSubtype;
  final String? location;
  final int? totalAffected;
  final int? totalDeaths;
  final bool hasCoordinates;

  String get displayName => eventName?.isNotEmpty == true ? eventName! : '$disasterType, $startYear';

  factory HistoricalRecord.fromJson(Map<String, dynamic> j) => HistoricalRecord(
        id: _str(j['id']),
        disNo: _str(j['disNo']),
        disasterGroup: _str(j['disasterGroup']),
        disasterType: _str(j['disasterType']),
        startYear: _int(j['startYear']),
        eventName: j['eventName'] as String?,
        disasterSubtype: j['disasterSubtype'] as String?,
        location: j['location'] as String?,
        totalAffected: _intOrNull(j['totalAffected']),
        totalDeaths: _intOrNull(j['totalDeaths']),
        hasCoordinates: j['hasCoordinates'] as bool? ?? false,
      );
}

class CountBucket {
  const CountBucket(this.label, this.count, {this.value});
  final String label;
  final int count;
  final String? value;

  factory CountBucket.fromJson(Map<String, dynamic> j, String key) =>
      CountBucket(_str(j[key]), _int(j['count']), value: j[key]?.toString());
}

class DashboardSummary {
  const DashboardSummary({
    required this.activeIncidents,
    required this.criticalIncidents,
    required this.affectedPopulation,
    required this.historicalDisasterCount,
    required this.activeTeams,
    required this.shelterCapacityTotal,
    required this.shelterOccupancyTotal,
    required this.sheltersOpen,
    required this.resourcesLowStock,
    required this.resourcesOutOfStock,
    required this.resourcesTotal,
    required this.incidentsByStatus,
    required this.historicalByDecade,
    required this.unavailable,
    required this.generatedAt,
  });

  final int? activeIncidents;
  final int? criticalIncidents;
  final int? affectedPopulation;
  final int? historicalDisasterCount;
  final int? activeTeams;
  final int? shelterCapacityTotal;
  final int? shelterOccupancyTotal;
  final int? sheltersOpen;
  final int? resourcesLowStock;
  final int? resourcesOutOfStock;
  final int? resourcesTotal;
  final List<CountBucket> incidentsByStatus;
  final List<CountBucket> historicalByDecade;
  final List<String> unavailable;
  final DateTime? generatedAt;

  int? get shelterOccupancyPercent {
    final capacity = shelterCapacityTotal;
    final occupancy = shelterOccupancyTotal;
    if (capacity == null || occupancy == null || capacity == 0) return null;
    return ((occupancy / capacity) * 100).round();
  }

  factory DashboardSummary.fromJson(Map<String, dynamic> j) => DashboardSummary(
        activeIncidents: _intOrNull(j['activeIncidents']),
        criticalIncidents: _intOrNull(j['criticalIncidents']),
        affectedPopulation: _intOrNull(j['affectedPopulationEstimate']),
        historicalDisasterCount: _intOrNull(j['historicalDisasterCount']),
        activeTeams: _intOrNull(j['activeTeams']),
        shelterCapacityTotal: _intOrNull(j['shelterCapacityTotal']),
        shelterOccupancyTotal: _intOrNull(j['shelterOccupancyTotal']),
        sheltersOpen: _intOrNull(j['sheltersOpen']),
        resourcesLowStock: _intOrNull(j['resourcesLowStock']),
        resourcesOutOfStock: _intOrNull(j['resourcesOutOfStock']),
        resourcesTotal: _intOrNull(j['resourcesTotal']),
        incidentsByStatus: (j['incidentsByStatus'] as List<dynamic>? ?? const [])
            .map((e) => CountBucket.fromJson(e as Map<String, dynamic>, 'status'))
            .toList(growable: false),
        historicalByDecade: (j['historicalByDecade'] as List<dynamic>? ?? const [])
            .map((e) => CountBucket(IncidentStatus.label(_str((e as Map)['decade'])), _int(e['count']), value: e['decade'].toString()))
            .toList(growable: false),
        unavailable: _strList(j['unavailable']),
        generatedAt: DateTime.tryParse(_str(j['generatedAt'])),
      );
}

class MapIncidentPoint {
  const MapIncidentPoint({required this.id, required this.title, required this.severity, required this.status, required this.latitude, required this.longitude, required this.location});
  final String id;
  final String title;
  final String severity;
  final String status;
  final double latitude;
  final double longitude;
  final String location;

  factory MapIncidentPoint.fromJson(Map<String, dynamic> j) => MapIncidentPoint(
        id: _str(j['id']),
        title: _str(j['title']),
        severity: _str(j['severity']),
        status: _str(j['status']),
        latitude: _dbl(j['latitude']),
        longitude: _dbl(j['longitude']),
        location: _str(j['location']),
      );
}

class MapShelterPoint {
  const MapShelterPoint({required this.id, required this.name, required this.latitude, required this.longitude, required this.availableBeds, required this.status});
  final String id;
  final String name;
  final double latitude;
  final double longitude;
  final int availableBeds;
  final String status;

  factory MapShelterPoint.fromJson(Map<String, dynamic> j) => MapShelterPoint(
        id: _str(j['id']),
        name: _str(j['name']),
        latitude: _dbl(j['latitude']),
        longitude: _dbl(j['longitude']),
        availableBeds: _int(j['availableBeds']),
        status: _str(j['status']),
      );
}

class MapLayers {
  const MapLayers({required this.incidents, required this.shelters, required this.unavailable});
  final List<MapIncidentPoint> incidents;
  final List<MapShelterPoint> shelters;
  final List<String> unavailable;

  factory MapLayers.fromJson(Map<String, dynamic> j) => MapLayers(
        incidents: (j['incidents'] as List<dynamic>? ?? const [])
            .map((e) => MapIncidentPoint.fromJson(e as Map<String, dynamic>))
            .toList(growable: false),
        shelters: (j['shelters'] as List<dynamic>? ?? const [])
            .map((e) => MapShelterPoint.fromJson(e as Map<String, dynamic>))
            .toList(growable: false),
        unavailable: _strList(j['unavailable']),
      );
}

class HistoricalStats {
  const HistoricalStats({required this.total, required this.byType, required this.byDecade, required this.unavailable});
  final int? total;
  final List<CountBucket> byType;
  final List<CountBucket> byDecade;
  final List<String> unavailable;

  factory HistoricalStats.fromJson(Map<String, dynamic> j) => HistoricalStats(
        total: _intOrNull(j['total']),
        byType: (j['byType'] as List<dynamic>? ?? const [])
            .map((e) => CountBucket(_str((e as Map)['type']), _int(e['count'])))
            .toList(growable: false),
        byDecade: (j['byDecade'] as List<dynamic>? ?? const [])
            .map((e) => CountBucket(_str((e as Map)['decade']), _int(e['count'])))
            .toList(growable: false),
        unavailable: _strList(j['unavailable']),
      );
}
