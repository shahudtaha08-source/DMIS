/**
 * Every status/severity/role enum used anywhere in DMIS is defined here
 * ONCE and imported by both services/api (Prisma-facing) and apps/web
 * (UI-facing). Do not redeclare any of these inside a module.
 *
 * Naming convention: values are SCREAMING_SNAKE_CASE to match Prisma enum
 * conventions directly, so the Prisma schema (Chunk 2) can mirror these
 * one-for-one.
 */

export const UserRole = {
  ADMIN: "ADMIN",
  OFFICER: "OFFICER",
  VOLUNTEER: "VOLUNTEER",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const Severity = {
  LOW: "LOW",
  MODERATE: "MODERATE",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
} as const;
export type Severity = (typeof Severity)[keyof typeof Severity];

export const IncidentStatus = {
  REPORTED: "REPORTED",
  VERIFIED: "VERIFIED",
  RESPONSE_ACTIVE: "RESPONSE_ACTIVE",
  STABILIZED: "STABILIZED",
  RESOLVED: "RESOLVED",
} as const;
export type IncidentStatus = (typeof IncidentStatus)[keyof typeof IncidentStatus];

/** Legal transitions for Incident.status — enforced in services/api, not just UI. */
export const INCIDENT_STATUS_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  REPORTED: ["VERIFIED"],
  VERIFIED: ["RESPONSE_ACTIVE"],
  RESPONSE_ACTIVE: ["STABILIZED"],
  STABILIZED: ["RESOLVED"],
  RESOLVED: [],
};

export const AlertSeverity = {
  CRITICAL: "CRITICAL",
  WARNING: "WARNING",
  ADVISORY: "ADVISORY",
  INFO: "INFO",
} as const;
export type AlertSeverity = (typeof AlertSeverity)[keyof typeof AlertSeverity];

export const AlertStatus = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
  DEACTIVATED: "DEACTIVATED",
} as const;
export type AlertStatus = (typeof AlertStatus)[keyof typeof AlertStatus];

export const ShelterStatus = {
  OPEN: "OPEN",
  FULL: "FULL",
  CLOSED: "CLOSED",
} as const;
export type ShelterStatus = (typeof ShelterStatus)[keyof typeof ShelterStatus];

export const ResourceStatus = {
  AVAILABLE: "AVAILABLE",
  LOW_STOCK: "LOW_STOCK",
  OUT_OF_STOCK: "OUT_OF_STOCK",
} as const;
export type ResourceStatus = (typeof ResourceStatus)[keyof typeof ResourceStatus];

export const ResourceTransactionType = {
  RESTOCK: "RESTOCK",
  ALLOCATION: "ALLOCATION",
  RETURN: "RETURN",
} as const;
export type ResourceTransactionType =
  (typeof ResourceTransactionType)[keyof typeof ResourceTransactionType];

export const TeamStatus = {
  AVAILABLE: "AVAILABLE",
  DEPLOYED: "DEPLOYED",
  OFF_DUTY: "OFF_DUTY",
} as const;
export type TeamStatus = (typeof TeamStatus)[keyof typeof TeamStatus];

export const VolunteerStatus = {
  AVAILABLE: "AVAILABLE",
  ASSIGNED: "ASSIGNED",
  UNAVAILABLE: "UNAVAILABLE",
} as const;
export type VolunteerStatus = (typeof VolunteerStatus)[keyof typeof VolunteerStatus];

export const VictimStatus = {
  MISSING: "MISSING",
  INJURED: "INJURED",
  RESCUED: "RESCUED",
  DECEASED: "DECEASED",
  SAFE: "SAFE",
} as const;
export type VictimStatus = (typeof VictimStatus)[keyof typeof VictimStatus];
