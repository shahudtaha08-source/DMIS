-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'OFFICER', 'VOLUNTEER');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('REPORTED', 'VERIFIED', 'RESPONSE_ACTIVE', 'STABILIZED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('CRITICAL', 'WARNING', 'ADVISORY', 'INFO');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "ShelterStatus" AS ENUM ('OPEN', 'FULL', 'CLOSED');

-- CreateEnum
CREATE TYPE "ResourceStatus" AS ENUM ('AVAILABLE', 'LOW_STOCK', 'OUT_OF_STOCK');

-- CreateEnum
CREATE TYPE "ResourceTransactionType" AS ENUM ('RESTOCK', 'ALLOCATION', 'RETURN');

-- CreateEnum
CREATE TYPE "TeamStatus" AS ENUM ('AVAILABLE', 'DEPLOYED', 'OFF_DUTY');

-- CreateEnum
CREATE TYPE "VolunteerStatus" AS ENUM ('AVAILABLE', 'ASSIGNED', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "VictimStatus" AS ENUM ('MISSING', 'INJURED', 'RESCUED', 'DECEASED', 'SAFE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'OFFICER',
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historical_disasters" (
    "id" TEXT NOT NULL,
    "disNo" TEXT NOT NULL,
    "historic" BOOLEAN NOT NULL,
    "classificationKey" TEXT NOT NULL,
    "disasterGroup" TEXT NOT NULL,
    "disasterSubgroup" TEXT NOT NULL,
    "disasterType" TEXT NOT NULL,
    "disasterSubtype" TEXT,
    "externalIds" TEXT,
    "eventName" TEXT,
    "iso" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "subregion" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "location" TEXT,
    "origin" TEXT,
    "associatedTypes" TEXT,
    "ofdaBhaResponse" BOOLEAN NOT NULL,
    "appeal" BOOLEAN NOT NULL,
    "declaration" BOOLEAN NOT NULL,
    "aidContributionUsd000" DECIMAL(18,3),
    "magnitude" DECIMAL(18,4),
    "magnitudeScale" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "riverBasin" TEXT,
    "startYear" INTEGER NOT NULL,
    "startMonth" INTEGER,
    "startDay" INTEGER,
    "endYear" INTEGER,
    "endMonth" INTEGER,
    "endDay" INTEGER,
    "startDateApprox" TIMESTAMP(3),
    "endDateApprox" TIMESTAMP(3),
    "totalDeaths" INTEGER,
    "noInjured" INTEGER,
    "noAffected" INTEGER,
    "noHomeless" INTEGER,
    "totalAffected" INTEGER,
    "reconstructionCostsUsd000" DECIMAL(18,3),
    "reconstructionCostsAdjUsd000" DECIMAL(18,3),
    "insuredDamageUsd000" DECIMAL(18,3),
    "insuredDamageAdjUsd000" DECIMAL(18,3),
    "totalDamageUsd000" DECIMAL(18,3),
    "totalDamageAdjUsd000" DECIMAL(18,3),
    "cpi" DECIMAL(10,4),
    "adminUnitsRaw" JSONB,
    "entryDate" TIMESTAMP(3),
    "lastUpdate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historical_disasters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "disasterType" TEXT NOT NULL,
    "severity" "Severity" NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'REPORTED',
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "location" TEXT NOT NULL,
    "affectedPopulationEstimate" INTEGER,
    "reportedById" TEXT NOT NULL,
    "assignedTeamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'DRAFT',
    "affectedArea" TEXT NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "relatedIncidentId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shelters" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "address" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "currentOccupancy" INTEGER NOT NULL DEFAULT 0,
    "facilities" TEXT[],
    "status" "ShelterStatus" NOT NULL DEFAULT 'OPEN',
    "managerContact" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shelters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "quantityAvailable" INTEGER NOT NULL DEFAULT 0,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 0,
    "status" "ResourceStatus" NOT NULL DEFAULT 'AVAILABLE',
    "locationId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_transactions" (
    "id" TEXT NOT NULL,
    "type" "ResourceTransactionType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "resourceId" TEXT NOT NULL,
    "relatedIncidentId" TEXT,
    "performedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rescue_teams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "specialization" TEXT NOT NULL,
    "status" "TeamStatus" NOT NULL DEFAULT 'AVAILABLE',
    "currentIncidentId" TEXT,
    "baseLocation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rescue_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "volunteers" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "skills" TEXT[],
    "status" "VolunteerStatus" NOT NULL DEFAULT 'AVAILABLE',
    "teamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "volunteers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "victims" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT,
    "name" TEXT,
    "age" INTEGER,
    "gender" TEXT,
    "status" "VictimStatus" NOT NULL DEFAULT 'MISSING',
    "location" TEXT,
    "contactInfo" TEXT,
    "notes" TEXT,
    "reportedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "victims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_contacts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emergency_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "relatedAlertId" TEXT,
    "relatedIncidentId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "historical_disasters_disNo_key" ON "historical_disasters"("disNo");

-- CreateIndex
CREATE INDEX "historical_disasters_disasterType_idx" ON "historical_disasters"("disasterType");

-- CreateIndex
CREATE INDEX "historical_disasters_disasterSubgroup_idx" ON "historical_disasters"("disasterSubgroup");

-- CreateIndex
CREATE INDEX "historical_disasters_startYear_idx" ON "historical_disasters"("startYear");

-- CreateIndex
CREATE INDEX "historical_disasters_latitude_longitude_idx" ON "historical_disasters"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "historical_disasters_totalDamageUsd000_idx" ON "historical_disasters"("totalDamageUsd000");

-- CreateIndex
CREATE INDEX "incidents_status_idx" ON "incidents"("status");

-- CreateIndex
CREATE INDEX "incidents_severity_idx" ON "incidents"("severity");

-- CreateIndex
CREATE INDEX "incidents_latitude_longitude_idx" ON "incidents"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "incidents_createdAt_idx" ON "incidents"("createdAt");

-- CreateIndex
CREATE INDEX "alerts_status_idx" ON "alerts"("status");

-- CreateIndex
CREATE INDEX "alerts_severity_idx" ON "alerts"("severity");

-- CreateIndex
CREATE INDEX "alerts_validUntil_idx" ON "alerts"("validUntil");

-- CreateIndex
CREATE INDEX "shelters_status_idx" ON "shelters"("status");

-- CreateIndex
CREATE INDEX "resources_category_idx" ON "resources"("category");

-- CreateIndex
CREATE INDEX "resources_status_idx" ON "resources"("status");

-- CreateIndex
CREATE INDEX "resource_transactions_resourceId_idx" ON "resource_transactions"("resourceId");

-- CreateIndex
CREATE INDEX "resource_transactions_createdAt_idx" ON "resource_transactions"("createdAt");

-- CreateIndex
CREATE INDEX "rescue_teams_status_idx" ON "rescue_teams"("status");

-- CreateIndex
CREATE UNIQUE INDEX "volunteers_userId_key" ON "volunteers"("userId");

-- CreateIndex
CREATE INDEX "volunteers_status_idx" ON "volunteers"("status");

-- CreateIndex
CREATE INDEX "victims_status_idx" ON "victims"("status");

-- CreateIndex
CREATE INDEX "victims_incidentId_idx" ON "victims"("incidentId");

-- CreateIndex
CREATE INDEX "emergency_contacts_region_idx" ON "emergency_contacts"("region");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_assignedTeamId_fkey" FOREIGN KEY ("assignedTeamId") REFERENCES "rescue_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_relatedIncidentId_fkey" FOREIGN KEY ("relatedIncidentId") REFERENCES "incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "shelters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_transactions" ADD CONSTRAINT "resource_transactions_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_transactions" ADD CONSTRAINT "resource_transactions_relatedIncidentId_fkey" FOREIGN KEY ("relatedIncidentId") REFERENCES "incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_transactions" ADD CONSTRAINT "resource_transactions_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteers" ADD CONSTRAINT "volunteers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteers" ADD CONSTRAINT "volunteers_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "rescue_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "victims" ADD CONSTRAINT "victims_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "victims" ADD CONSTRAINT "victims_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_relatedAlertId_fkey" FOREIGN KEY ("relatedAlertId") REFERENCES "alerts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

