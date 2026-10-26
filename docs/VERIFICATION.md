# Local verification — 26 October 2026

The shared Windows 6a45b48 API baseline is present with Linux adapters. Tests use
Node 24, real local PostgreSQL 17.11 and synthetic backend-only provider/media data.
No operator accounts, Hik-Connect grants or mock cameras enter the application DB.

Portable coverage: 88 Node/API/PostgreSQL results, 6 audio and 4 H264 encoder tests.
Includes the 84-result baseline plus key permissions/restart compatibility,
pooled stream routing/grant separation, admin-only playback import and real schema
migration under a separate NOLOGIN owner. Repeated migration is tested. Temporary
databases and schema-owner roles are removed after checks.

All 11 independent React browser tests pass against this Linux API source on the
Windows host, with its own loopback fixture backend and real disposable database.
It validates the transport, isolation and codec path, including Linux grant import.
This does not execute Wine or a real camera. Frontend type, unit and build checks
remain in the frontend repository: 15 unit tests, typecheck and production build.

Dockerfile/Compose/proxy files are deployment templates. Shell and PowerShell helper
syntax and YAML structure are checked locally. There is no Docker/WSL runtime on
this PC, so the image build, Linux UID/mode behavior, Wine DLL loading, actual cloud
authorization/renewal and real-camera load are pending. Read LINUX-ACCEPTANCE.md.
No SSH, production database connection, VPS change or deployment was performed.

## Wine media package compatibility correction

The first operator Docker build failed while resolving av==19.0.1 for Windows
CPython 3.11. That PyAV release requires Python 3.12+. The Dockerfile now uses
runtime/requirements-wine.txt (PyAV 18.1.0, Pillow 12.3.0) for embedded Windows
Python, and preserves native/requirements.txt for Ubuntu Python 3.12+.

Both exact Windows CPython 3.11 wheels were downloaded successfully. A private
local copy of embedded Windows Python 3.11.9 loaded those packages and passed all
6 audio and 4 H264 encoder tests. Native Linux CPython 3.12 wheels were resolved
separately. These checks do not execute Wine or certify the completed image;
the operator still needs to pull and rebuild it on Linux.
