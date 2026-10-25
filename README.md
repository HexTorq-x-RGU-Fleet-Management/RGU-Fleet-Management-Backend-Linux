# RGU Fleet Management Linux Backend

Repository: https://github.com/HexTorq-x-RGU-Fleet-Management/RGU-Fleet-Management-Backend-Linux

## Status

Initial repository scaffold. The Linux SaaS backend is not implemented here yet.
There is no backend entry point, container image or runnable deployment yet.

## Purpose and target

Build the Linux backend with V3's existing SaaS/security behavior and adapt the
existing pooled Linux/Wine media runtime behind the agreed API. Intended runtime:
Linux, Node.js, PostgreSQL, Python/Wine and the authorized Windows SDK binaries.
This scaffold does not turn Windows DLLs into native Linux shared libraries.

Preserve V3 approvals, workspaces, membership, permissions, sessions, scoped media
and recordings, provider recovery, audit and health. Copying the older single-owner
Linux viewer alone would not provide those SaaS features.

## Migration references

- [V3 SaaS/security baseline](https://github.com/HexTorq-CCTV-Camera-Web/Hik-Vision/tree/standalone-baseline-2026-10-25/v3)
- [Existing Linux/Wine implementation](https://github.com/HexTorq-CCTV-Camera-Web/Hik-Vision/tree/standalone-baseline-2026-10-25/linux)
- [Verified Windows SDK bundle](https://github.com/HexTorq-CCTV-Camera-Web/Hik-Vision/tree/standalone-baseline-2026-10-25/sdk)

Local references on the original workstation are under ../../Camera/hikvision/.
Own all runtime source in this repository after migration; no sibling repository
imports. Define Linux secret/key protection explicitly instead of copying Windows
DPAPI files. Keep existing SDK authorization and renewal limitations visible.

## Related projects and acceptance

- [Frontend](https://github.com/HexTorq-x-RGU-Fleet-Management/RGU-Fleet-Management-Frontend)
- [Windows backend](https://github.com/HexTorq-x-RGU-Fleet-Management/RGU-Fleet-Management-Backend-Windows)

Both backends must satisfy the same API, permissions and media contracts. Linux
acceptance must include POSIX permissions, Wine/SDK dependencies, restart/recovery,
real cameras, concurrent load and recording storage. Windows test success alone
does not establish Linux production readiness. No production deployment is implied.

## Checkout and repository policy

```sh
git clone https://github.com/HexTorq-x-RGU-Fleet-Management/RGU-Fleet-Management-Backend-Linux.git backend-linux
cd backend-linux
```

.gitignore excludes secrets, keys, provider grants, dependencies, virtual
environments, databases, private data, recordings and logs. Future container and
reverse-proxy definitions will be added during implementation. No SSH, container
build, provider login or VPS change was performed to create this repository.
