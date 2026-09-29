# DMIS — Disaster Management Information System

DMIS is a disaster management platform combining a PostgreSQL-backed API, a React + Vite web app, and a Flutter mobile client. It uses a shared data model and database so the web and mobile experience reflect the same incidents, alerts, shelters, resources, and historical intelligence.

## Overview

The system is designed for emergency operations and disaster response coordination across:

- Historical disaster archive and analytics
- Live incident management
- Critical alert publication and visibility
- Shelter occupancy tracking
- Resource inventory and low-stock warnings
- Rescue team assignment and status management
- Mobile dashboard and incident monitoring

## Architecture

- Web app: React, TypeScript, Vite, Tailwind, React Router, Recharts
- API: Node.js, Express, TypeScript, Prisma
- Database: PostgreSQL
- Mobile: Flutter + Dart
- Shared contract: packages/shared

The project is organized into:

- apps/web — operational web interface
- apps/mobile — Flutter client
- services/api — Express API and Prisma data layer
- packages/shared — DTOs and enums shared by web + API
- prisma — schema, migrations, seed scripts, historical import
- data — historical dataset

## Local setup

1. Install dependencies:

   npm install

2. Copy the example environment and update local values:

   cp .env.example .env

3. Ensure PostgreSQL 17 is installed locally and running.

4. Provision the DMIS app database and user:

   psql -U postgres -d postgres -h localhost -f scripts/provision-local-db.sql

5. Generate Prisma client and apply migrations:

   $env:DATABASE_URL='postgresql://dmis_user:dmis_password@localhost:5432/dmis_dev?schema=public'
   npm run prisma:generate --workspace=services/api
   npm run prisma:migrate:deploy --workspace=services/api

6. Import the historical disaster archive and operational demo data:

   npm run db:import:historical --workspace=services/api
   npm run db:seed --workspace=services/api

## Environment variables

Required local values are defined in .env:

- DATABASE_URL — PostgreSQL connection string for the DMIS app database
- JWT_SECRET — long secret used by the API
- JWT_EXPIRES_IN — session lifetime, usually 8h
- API_PORT — backend port, default 4000
- CLIENT_URL — web origin for the frontend
- CORS_ORIGINS — allowed frontend origins
- VITE_API_BASE_URL — frontend API base URL in dev
- SEED_ADMIN_EMAIL — admin bootstrap account
- SEED_ADMIN_PASSWORD — admin bootstrap password

Do not commit production secrets. Keep runtime secrets in environment configuration only.

## Database setup

The local provisioning script creates the application role and database in a least-privilege setup:

- database: dmis_dev
- app user: dmis_user
- schema: public

The historical importer loads all 783 records from data/disasterIND.csv into the HistoricalDisaster model and upserts by disNo so repeated runs are safe.

## Seed instructions

The project seed flow is idempotent and safe to rerun:

- Historical dataset import
- Admin account bootstrap
- Operational demo data for shelters, resources, teams, incident, alert

Run:

npm run db:seed --workspace=services/api

The demo scenario includes the Pune Flood 2026 incident and a published critical alert.

## Web startup

npm run dev --workspace=apps/web

The Vite app typically runs at http://localhost:5173 and proxies API calls through /api.

## API startup

$env:DATABASE_URL='postgresql://dmis_user:dmis_password@localhost:5432/dmis_dev?schema=public'
npm run dev --workspace=services/api

The API listens on http://localhost:4000 by default.

## Flutter startup

1. Ensure Flutter SDK is installed and added to PATH.
2. Configure the production or local API base URL in the app config.
3. Run:

   flutter pub get
   flutter run

## Demo credentials

Seeded admin and staff accounts for local demos:

- Admin: admin@dmis.gov.in / Admin@12345
- Officer: officer@dmis.gov.in / Admin@12345
- Volunteer: volunteer@dmis.gov.in / Admin@12345

Use the admin account to create and manage system records, and the officer or volunteer roles to test role-based access.

## Production configuration

For production deployment, define real environment values for:

- DATABASE_URL
- JWT_SECRET
- CORS_ORIGINS
- API_PORT
- VITE_API_BASE_URL or equivalent web runtime configuration
- Flutter API base URL config

Use Render for the backend and a static host or app host for the web frontend. Never hardcode local loopback addresses into production builds.

## Deployment guidance

- Backend: deploy the Express API to Render with a PostgreSQL connection string and the JWT secret set in Render environment variables.
- Web: build the React app for static hosting and set the deployed API URL as VITE_API_BASE_URL.
- Mobile: point the Flutter app to the production API domain rather than localhost or 127.0.0.1.

## Final feature list

- Historical disaster explorer with search, filter, sort, pagination, and detail view
- Incident lifecycle management with assignment and status transitions
- Alert creation, publishing, and deactivation
- Shelter management and occupancy tracking
- Resource inventory and low-stock warnings
- Rescue team status and assignment
- Dashboard and analytics views built from real database data
- Flutter dashboard, incidents, alerts, and operations screens
- End-to-end operational flow across web and mobile clients

## Verification

The project was validated with:

- TypeScript typecheck across shared, API, and web workspaces
- API test suite
- Web Vitest suite
- Web production build

This repository is ready for a live demo environment and supports the core emergency operations workflow.

