# RGU Fleet Management Linux Backend

Independent API-only Linux port of Windows backend `6a45b48`. It owns its SaaS,
fleet, PostgreSQL policies, recording storage, provider clients and Wine receiver
source. The React frontend remains a separate repository. No sibling source imports.

Local implementation and portable checks are complete; **Linux/Wine runtime and
real-camera production acceptance remain pending**. This Windows workstation has
no Docker/WSL environment. No VPS connection or deployment was performed.

## What is included

- Platform-owner setup, workspace approval, admin/member roles, channel grants,
  password support, suspension and session revocation.
- Real Hik-Connect inventory, direct web sign-in, encrypted opt-in web recovery,
  channel-health observations and account-switch protection.
- Pooled SDK playback through Wine: Smooth H264, JPEG compatibility, PCM audio and
  previews using the same authenticated media API.
- PostgreSQL buses/recorder mapping, server-only mock GPS/fuel JSONB observations
  and history. Actual vendor GPS/fuel integration remains phase 2.
- Per-user UI preferences/layouts/favourites, persistent clips and retention,
  scoped downloads/deletion, audit and superadmin health.
- Container recipe, migration/check tools, private key transfer helpers and a
  loopback-bound Compose service. The image recipe has not been built here.

## Read first

- [Feature parity and platform differences](docs/FEATURE-PARITY.md)
- [Production migration: Windows data to Linux](docs/PRODUCTION-MIGRATION.md)
- [Linux acceptance and current evidence](docs/LINUX-ACCEPTANCE.md)
- [API contract](docs/API.md)
- [Verification results](docs/VERIFICATION.md)
- [Actual shared database provisioning status](docs/DATABASE-SETUP.md)

Linux cannot read an installed Windows iVMS sign-in. Saved valid grants can be
migrated; new grants can be imported by the workspace admin and verified by the SDK.
No independent automatic SDK grant renewal is claimed. CAPTCHA/provider challenges
cannot be removed by this wrapper. India native playback remains the established
integration scope. Microphone forwarding and DVR archive playback remain deferred.

## Local Linux setup

Use amd64 Linux, Node 24, PostgreSQL 17, Wine/embedded Windows Python and the complete
authorized SDK dependency tree. The recommended prepared runtime is the Dockerfile
plus deploy/compose.yaml. Do not attempt to load DLLs in native Linux ctypes.

The fresh schema and read-only runtime permissions were also verified on the
selected PostgreSQL 16.15 database; see [database setup](docs/DATABASE-SETUP.md). This is not a validated
Windows PostgreSQL 17 backup restore into version 16.

```sh
npm ci
cp .env.example .env
chmod 600 .env
# Create the new database/roles, private key/URL files and mount directories first.
# Configure .env, SDK identity and private network access using the migration guide.
docker compose -p rgu-fleet-v3 --env-file .env -f deploy/compose.yaml build api
docker compose -p rgu-fleet-v3 --env-file .env -f deploy/compose.yaml run --rm migrate
docker compose -p rgu-fleet-v3 --env-file .env -f deploy/compose.yaml up -d api
```

Direct Node defaults to loopback port 8102. Compose exposes container 8102 only on
host 127.0.0.1:21000, configurable with RGU_API_PORT. Do not collide with the old pilot.
The database URL belongs to restricted cam_app; a separate NOLOGIN BYPASSRLS owner
owns privileged routines. The app never receives the migration DBA URL.

Use the original encryption key with migrated provider ciphertext. Files must be
owned by the service UID with 0600/0400 mode. No key is silently regenerated.
Windows .dpapi files cannot be used as Linux key files.

## Checks

```sh
npm run test:portable
# Run inside the actual prepared amd64 Linux/Wine container:
npm run test:runtime
# Requires both the isolated test PostgreSQL and Linux runtime:
npm run test:all
```

See the acceptance document for isolated DB setup. Tests create/drop only unique
cam_test_* databases on local port 55432. Tests never use the application DATABASE_URL.
The test-only acceptance server on 8109 supplies backend fixtures for the React
browser suite; server.mjs never exposes its fixture routes.

The source parity manifest records 45 unchanged common files from Windows. Platform
adaptations include configuration/key files, playback import, receiver pooling,
Linux startup and migration/acceptance tooling. Preserve both the shared API suite
and platform tests when synchronizing later changes.

Keep .env, .local, credentials, DLLs, Wine prefixes, recordings and logs out of Git.
Only the specific source/configuration templates are intended for publication.
