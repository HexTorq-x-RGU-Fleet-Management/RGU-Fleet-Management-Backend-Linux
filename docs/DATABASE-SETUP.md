# Shared database provisioning — 26 October 2026

The user selected one database for development and production:
`db_rgu_fleet_management`, accessed by `user_rgu_fleet_management`.
This database is on PostgreSQL 16.15. Credentials remain in ignored local secrets;
no password or connection URI is published here.

## Completed

- Both the target and local source had zero users, workspaces, providers, buses
  and telemetry before provisioning. There was no business-data transfer.
- A pre-migration custom-format backup was created in the server's private
  `/root/rgu-fleet-db-backups/` directory, with a private migration receipt.
- The four checked-in SQL files were applied atomically under an advisory lock:
  schema.sql, grants.sql, fleet.sql and workspace.sql. Their SHA-256 checksums
  are recorded in cam.schema_migrations.
- Fourteen tables exist in cam: thirteen application tables with enabled/forced
  RLS and one owner-only migration metadata table.
- `cam_owner` is the NOLOGIN, non-superuser BYPASSRLS owner of this database and
  its privileged routines. Its privileges are not granted to the application user.
- `cam_app` is a NOLOGIN, NOBYPASSRLS privilege group. The existing database login
  inherits this group's runtime grants. Unlike the generic fresh-install example,
  no new cam_app login or default password was created.
- Database ownership moved from the runtime login to cam_owner. The runtime login
  has CONNECT, but no database/schema CREATE, password-hash SELECT or migration
  metadata SELECT privileges. It is not a member of cam_owner.

Fresh schema execution and read-only runtime checks passed on PostgreSQL 16.15.
The setup-required function returns true; an invalid session returns no principal;
queries without a viewer session do not expose user records. This does not replace
the full API/integration/soak tests against the eventual deployed runtime.

No platform owner, tenant, provider grant, bus or sample telemetry was seeded.
No backend was deployed, and local backend environment configuration was not
switched to this database as part of schema provisioning. Backend connection,
encryption-key coordination, recording storage and first-owner setup are next.

## Connection and operations

Remote access currently permits any IPv4/IPv6 address for this database/login,
requiring TLS and SCRAM-SHA-256. The server certificate is self-signed and names
an internal hostname. Connection checks used encrypted TLS without certificate
validation, matching the authorized psql testing mode. Proper certificate trust
and a matching hostname remain to be configured for verified production TLS.

In psql, use `\dt cam.*`; the tables are in cam, not public. The runtime login is
deliberately unable to run schema migrations. Apply future migrations through the
separate DBA/schema-owner path; do not grant cam_owner membership to the runtime
login to make a migration command work.

The shared database is application data, never a test fixture. Automated suites
continue using disposable local cam_test_* databases. Do not reset/seed this
database during development testing.

The generic production guide describes restoring the Windows PostgreSQL 17
database into PostgreSQL 17. This actual setup used a fresh schema on 16.15 because
the source had no business data. It did not restore a PostgreSQL 17 dump into 16;
that downgrade must not be inferred as supported from this provisioning.
