# Local source to Linux production: operator guide

No VPS was accessed or changed to prepare this implementation. Run these steps
only when you choose to deploy. Keep the old service and its data as a rollback.
Use a new project directory and database; do not overwrite the existing pilot.

## 1. Prepare the target without touching the old service

Use an amd64/x86-64 Linux host with Docker Engine/Compose, access to PostgreSQL 17,
outbound HTTPS and the camera provider's required cloud transport. The authorized
x64 SDK runs under Wine, not natively under Linux. ARM VPS instances are not covered.
The Compose recipe starts with 2 CPU / 4 GiB and a 16-stream application cap; this
is a configurable starting limit, not a measured HD concurrency guarantee.

As the existing `mohan` user, select a fresh directory, for example:

```sh
mkdir -p /home/mohan/cam
cd /home/mohan/cam
git clone https://github.com/HexTorq-x-RGU-Fleet-Management/RGU-Fleet-Management-Backend-Linux.git rgu-fleet-linux
cd rgu-fleet-linux
git rev-parse HEAD
cp .env.example .env
chmod 600 .env
mkdir -p .local/secrets .local/data .local/wine .local/home .local/sdk
chmod 700 .local .local/secrets .local/data .local/wine .local/home
```

Docker's service UID/GID is 10001:10001. An administrator must give that identity
ownership of the mounted data/Wine/home directories and private secret files.
Keep the code and SDK read-only to this identity. Compose file-backed secrets
retain host ownership: specifying a Compose `uid` does not fix bind-file ownership.
See [Docker secret-file behavior](https://docs.docker.com/reference/compose-file/services/#secrets).

Check whether 21000 is already occupied. The old pilot may already use it. Pick a
free port (for example 21001), set RGU_API_PORT accordingly, and change the example
reverse-proxy upstream to match. Keep the binding loopback-only during acceptance.
Use Compose project name `rgu-fleet-v3` so old containers remain separate.

## 2. Choose fresh setup or migration

**Fresh:** new owner, workspaces and Hik-Connect sign-in. No Windows business data
is copied. Create a new encryption key with `node tools/generate-key.mjs` after
installing Node 24, or run that tool in the built container with a private mount.
It refuses to overwrite an existing file. Store its base64 output file as
`.local/secrets/provider-key`; never print the key or put it in Git.

**Migration:** preserve current users, approvals, grants, buses, preferences,
provider connections and clip metadata. You must transfer all three together:

1. A PostgreSQL custom-format dump of the Windows application database.
2. `data/tenants/`, including recordings and their JSON indexes.
3. The original 32-byte provider encryption key, unwrapped from Windows DPAPI.

Do not transfer a `.dpapi` key to Linux and expect Linux to decrypt it. Do not
generate a different key over the existing provider ciphertext. Password hashes
transfer through PostgreSQL; there is no need to collect users' passwords.

## 3. Export the Windows installation when ready

Stop the Windows API gracefully after finishing active recordings. Leave its local
PostgreSQL running. This gives the database and clip indexes one stable cutoff.
From the Linux repo on the Windows PC, run:

```powershell
.\tools\export-windows-backup.ps1 -WindowsBackend 'ABSOLUTE_PATH_TO_backend-windows'
```

This operator-only helper supports the private local DPAPI/PostgreSQL setup. It
creates `.local/migration/fleet.dump`, `tenants/` and `provider-key` with Windows-user
ACL protection. Passwords travel to pg_dump through its child environment, not
command-line arguments or console output. Existing backup files are not overwritten.
It is not a migration utility for an arbitrary external database or custom env key;
for those, use the actual DBA backup and existing master key explicitly.

Transfer the backup through your authenticated secure channel to a private target
directory. Keep it out of repositories and public web roots. Verify checksums after
transfer. The export contains confidential account state even though provider
records are encrypted. Preserve the original Windows copy for rollback.

[PostgreSQL custom archives](https://www.postgresql.org/docs/17/app-pgdump.html)
are portable across operating systems. They do not include cluster roles; create
target roles separately. Use a matching PostgreSQL 17 client for this migration.

## 4. Create and restore the target database

As the PostgreSQL DBA, inspect and run `deploy/bootstrap.sql` once. It creates
`rgu_fleet`, a NOLOGIN BYPASSRLS schema owner (`cam_owner`), and a separate login
role (`cam_app`) with no superuser, bypass, database-create or role-create rights.
Set cam_app's password interactively using psql `\password cam_app`.

The privileged schema owner is required by the preserved SECURITY DEFINER login,
session and administrative routines. Never make cam_app an owner or a member of
cam_owner. A managed database that disallows this ownership model needs a separate
security adaptation; do not disable RLS to get it running.

For migration, restore into the **empty new database** using the DBA connection:

```sh
pg_restore --exit-on-error --no-owner --no-acl --role=cam_owner --dbname=rgu_fleet /PRIVATE_BACKUP/fleet.dump
```

Supply connection details through a private pgpass/service configuration, not a
password-bearing command. Do not run this against the current production DB.
Do not use `--clean` against an existing installation. Set ownership through
`--role=cam_owner`; `--no-owner` alone could leave functions owned by the wrong role.
See [pg_restore](https://www.postgresql.org/docs/17/app-pgrestore.html).

Copy the backed-up `tenants/` under `.local/data/tenants/` without changing tenant
UUIDs. Put the original exported key at `.local/secrets/provider-key`. Fix ownership
to 10001 and modes to 700 for private directories / 600 for secret files.
Revoke carried-over viewer sessions with DBA `TRUNCATE cam.sessions;` during this
planned cutover; users log in again with their existing viewer passwords.

## 5. Configure secrets, SDK and build

Create private files, each owned by 10001 with mode 600:

- `.local/secrets/database-url`: cam_app connection URI for rgu_fleet.
- `.local/secrets/provider-key`: original migrated base64 key, or new key for fresh setup.
- `.local/secrets/migration-url`: DBA migration URI, only exposed to the migration service.

The app does not receive the DBA secret. Never point the cam_app URI at a superuser.
The database must be reachable from inside the container. `127.0.0.1` in a container
means that container, not the host PostgreSQL instance. Use the private database
hostname/network and narrowly scoped pg_hba/firewall rules. Remote PostgreSQL
connections should use a verified TLS configuration, not certificate bypasses.

Copy the complete authorized SDK dependency tree (OpenNetStream.dll, HCNetSDK.dll,
PlayCtrl.dll and dependent directories) to `.local/sdk/`. Mount it read-only.
Set RGU_SDK_HOST_DIR to its absolute host path. Set HIK_SDK_APP_ID to the identity
used by the installed client; obtain it privately from its `szAppId` initialization
record. Do not include client logs or account tokens in the image.

Build and migrate, as explicit operator actions:

```sh
docker compose -p rgu-fleet-v3 --env-file .env -f deploy/compose.yaml build api
docker compose -p rgu-fleet-v3 --env-file .env -f deploy/compose.yaml run --rm migrate
```

The migration tool applies the four versioned SQL files in one transaction with
an advisory lock. It reapplies grants after a Windows restore, records SHA-256
checksums, rejects changed applied migrations and never seeds a viewer account.
Future schema changes need new migration files, not edits to the recorded baseline.
The provided image recipe is locally prepared but has **not been built here**.

## 6. Start privately and authorize cameras

```sh
docker compose -p rgu-fleet-v3 --env-file .env -f deploy/compose.yaml up -d api
docker compose -p rgu-fleet-v3 --env-file .env -f deploy/compose.yaml exec api node tools/check-runtime.mjs
curl --fail http://127.0.0.1:21000/api/health
```

Use the chosen host port in curl. The runtime check loads DLLs through Wine without
logging in or starting playback. It is not proof of live video or audio.
For a **fresh** DB, complete one-time platform-owner setup before enabling public
hosting. `/api/auth/setup` is deliberately unavailable when PUBLIC_ORIGIN is set.
Use the loopback API with a private JSON file containing fullName/email/password:

```sh
curl --fail -H 'Content-Type: application/json' -H 'X-Hik-Local: 1' --data-binary @/PRIVATE_PATH/owner-setup.json http://127.0.0.1:21000/api/auth/setup
```

Delete that temporary credential file securely according to your operations policy.
A restored database already has its owner, so do not attempt to create another.

Migrated, unexpired playback grants can be reused. A restart never renews them.
For a new/expired grant, sign into the matching account in Windows iVMS and use
`tools/export-windows-playback.ps1 -ClientLog 'PATH_TO_opensdk.log'` on that PC.
Its private `playback.json` can be imported in the admin's Settings dialog over
HTTPS (or an authenticated local test tunnel). The server validates SDK access to
a shared channel before saving it. It will not accept a web JWT as an SDK token.
There is still no independently verified automatic SDK grant renewal on Linux.

## 7. Connect the frontend and HTTPS

When ready, provide a backend HTTPS hostname and install the example proxy snippet
inside that hostname's existing TLS configuration. `deploy/nginx.conf.example`
keeps SSE unbuffered and accepts completed browser clip uploads. Configure actual
certificates separately; do not replace unrelated server configuration.

Set backend PUBLIC_ORIGIN to the exact HTTPS API origin and FRONTEND_ORIGINS to
the exact Vercel/custom frontend origin. Same-site frontend/API hostnames are
preferred. Truly cross-site use requires COOKIE_SAME_SITE=None with Secure cookies;
browser third-party-cookie restrictions can still prevent it.

Set Vercel NEXT_PUBLIC_API_BASE_URL to the HTTPS API URL and **rebuild/redeploy the
frontend**, because public Next variables are embedded at build time. Then recreate
the API container with its updated .env. Keep PostgreSQL and the backend port private.
Do not point a public HTTPS frontend at a plain-HTTP IP API.

## 8. Accept before switching users

Run docs/LINUX-ACCEPTANCE.md. Verify at least one real channel with moving video and
clear audio, multiple buses/grids, account expiry/reconnect, permission revocation,
rotation, recordings across restart, and realistic CPU/RAM/bandwidth. Confirm two
tenants cannot read each other's data. Start with SD grids; measure HD load before
raising limits. GPS/fuel vendor integration remains phase 2.

Keep the Windows service stopped during final migration to prevent diverging data.
Only move user traffic after accepting Linux. If Linux acceptance fails, stop only
the new Compose project and return frontend configuration to the Windows API while
preserving both backups. Do not run two independent writable copies and later merge
their recordings/database blindly. Restore the matched DB + files + key generation
together for disaster recovery, and test that restore periodically.
