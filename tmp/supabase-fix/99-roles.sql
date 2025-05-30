-- Basic roles setup for Supabase
-- This file is required by the Supabase PostgreSQL Docker image

-- Create basic roles if they don't exist
DO $$
BEGIN
    -- Create supabase_admin role if it doesn't exist
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_admin') THEN
        CREATE ROLE supabase_admin WITH LOGIN SUPERUSER;
    END IF;
    
    -- Create authenticator role if it doesn't exist
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticator') THEN
        CREATE ROLE authenticator WITH LOGIN NOINHERIT;
    END IF;
    
    -- Create anon role if it doesn't exist
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon;
    END IF;
    
    -- Create authenticated role if it doesn't exist
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated;
    END IF;
    
    -- Create service_role if it doesn't exist
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role;
    END IF;
END
$$;

-- Grant necessary permissions
GRANT anon, authenticated, service_role TO authenticator;
GRANT ALL ON SCHEMA public TO supabase_admin;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;