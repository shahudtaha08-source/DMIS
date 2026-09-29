-- =============================================================================
-- DMIS local database provisioning
--
-- Run as a PostgreSQL superuser, ONCE, on a fresh local install:
--   psql -h localhost -U postgres -d postgres -f scripts/provision-local-db.sql
--
-- Idempotent: safe to re-run. Creates the application role and database used
-- by DATABASE_URL in .env. It does NOT create tables - those come from
-- `npx prisma migrate deploy`, so the schema always matches the Prisma models.
--
-- Password note: the value below matches the local development .env. Change
-- both together if you prefer a different one. Do not reuse this password on
-- any shared or production server.
-- =============================================================================

\set ON_ERROR_STOP on

-- Role ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dmis_user') THEN
    -- LOGIN only: the app connects but never creates or drops databases.
    CREATE ROLE dmis_user WITH LOGIN PASSWORD 'dmis_password';
    RAISE NOTICE 'Created role dmis_user (LOGIN only - least privilege)';
  ELSE
    ALTER ROLE dmis_user WITH LOGIN PASSWORD 'dmis_password';
    RAISE NOTICE 'Role dmis_user already exists - password refreshed';
  END IF;
END
$$;

-- Database -----------------------------------------------------------------
-- CREATE DATABASE cannot run inside a transaction block, hence the separate
-- \gexec guards rather than a DO block.
SELECT 'CREATE DATABASE dmis_dev OWNER dmis_user ENCODING ''UTF8'''
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'dmis_dev')
\gexec

-- Grant the schema so Prisma's migrations can create tables.
\connect dmis_dev
GRANT ALL ON SCHEMA public TO dmis_user;

SELECT 'CREATE DATABASE dmis_dev_test OWNER dmis_user ENCODING ''UTF8'''
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'dmis_dev_test')
\gexec

\connect dmis_dev_test
GRANT ALL ON SCHEMA public TO dmis_user;

\connect postgres

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'DMIS local database is provisioned.';
  RAISE NOTICE '  database : dmis_dev';
  RAISE NOTICE '  user     : dmis_user';
  RAISE NOTICE 'Next: npm run db:migrate, then npm run db:seed';
END
$$;
