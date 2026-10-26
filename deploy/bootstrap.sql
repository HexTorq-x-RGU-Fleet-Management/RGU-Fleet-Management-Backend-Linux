-- Run once as the PostgreSQL DBA, before schema migration. No default passwords.
CREATE ROLE cam_owner NOLOGIN BYPASSRLS;
CREATE ROLE cam_app LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
CREATE DATABASE rgu_fleet OWNER cam_owner;
-- Use interactive psql: \password cam_app
-- Never grant cam_owner membership or schema ownership to cam_app.
