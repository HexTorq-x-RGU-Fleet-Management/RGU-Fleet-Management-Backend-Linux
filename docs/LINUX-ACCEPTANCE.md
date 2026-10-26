# Acceptance checklist and current evidence

Prepared locally on 26 October 2026. No SSH, VPS, Linux VM, Docker build or provider
cloud playback was used. This workstation has no usable WSL/Docker runtime.
Passing API tests on Windows is not a Linux runtime certification.

## Portable checks

Use Node 24 and `npm ci`. Tests require a disposable local PostgreSQL instance at
127.0.0.1:55432, never a production connection. Its bootstrap login is
`saas_bootstrap` and runtime login `cam_app`; configure their test passwords in
ignored `.local/test-database.json` with keys bootstrapPassword and appPassword.
The bootstrap test role must be able to create/drop disposable databases and
temporary test roles. This is intentionally different from the production cam_app.
Use Linux 0700 for .local and 0600 for the configuration. Tests do not read the
application DATABASE_URL. The alternative RGU_TEST_DB_CONFIG is the same JSON
in a process-private environment, used for this workstation's test run.

```sh
npm run test:portable
```

Fixtures create only regex-bounded `cam_test_<pid>_<random>` databases and remove
them afterwards. No synthetic users, cameras or telemetry are seeded into the
application DB. A migration test also creates and removes one temporary NOLOGIN
schema-owner role to verify the actual production ownership model.

Current portable coverage includes the Windows 84-result baseline plus Linux
key protection, receiver-pool routing, playback-import authorization and schema
migration tests. Native Python tests exercise synthetic audio and H264 encoding.
The synchronization manifest verifies unchanged shared source against 6a45b48.

## React/API acceptance

Run `npm run test:acceptance:serve` here with the isolated test DB configuration,
then `npm run test:e2e` in the independent frontend repository. The Linux test API
binds loopback 8109 and never imports into server.mjs. It alone generates synthetic
recorders/media/map tiles. Stop it with POST /__acceptance/stop to remove the fixture.
Normal API port 8102 never exposes those endpoints.

## Required on actual Linux before production

- Build the amd64 image; verify image architecture, dependency versions and Wine
  process startup as UID 10001. The Dockerfile uses the previous pilot's embedded
  Windows Python 3.11.9 baseline; review its age and security maintenance before
  releasing. Replace/update that baseline only with equivalent codec/SDK checks.
- Run `npm run test:runtime` inside the prepared container. It must load all three
  DLLs under Wine without provider calls. Missing DLLs or dependencies are failures,
  not silent skips. `npm run test:all` deliberately fails on Windows at this step.
- Check actual POSIX secret ownership/modes, symlink rejection, read-only SDK,
  private recording files, restore of the original key and no secret-bearing logs.
- Complete fresh setup or restore; confirm wrong/missing key fails closed.
- Check owner approval, two independent admins, member channel restrictions,
  forced password changes, suspension and revocation through the deployed API.
- Confirm exact CORS origins, Secure cookies, EventSource, range video and upload
  size/timeouts through the real HTTPS reverse proxy and intended browsers.
- With an online India Hik-Connect recorder, verify fresh inventory and each
  required channel. Unknown is not working; recorder online alone proves nothing.
- Test actual H264/H265 decode to Smooth output, JPEG compatibility, selected-camera
  continuous audio, snapshots and saved video/audio clips across API restart.
- Test large grids, quick bus switching, rotation, focus/restore, background tabs,
  dropped networks, receiver crashes and explicit stop. Confirm no orphan Wine
  sessions or camera traffic after stopping. Measure CPU/RAM/network for hours.
- Exercise web expiry/recovery, SDK expiry, failed grant import and different-account
  switch without leaking the old account's devices, layouts or member access.
- Confirm recording retention, disk-pressure alerts, audit entries and tenant-scoped
  downloads/deletions. Back up and restore database + tenants + key together.

Automatic independent SDK grant renewal, global-region native playback and
production-scale concurrency are not established by the portable suite.
