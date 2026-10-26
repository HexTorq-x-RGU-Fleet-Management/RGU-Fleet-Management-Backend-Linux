# Camera receiver provenance

Shared account/cloud/media source comes from Windows backend commit 6a45b48.
Pooled receiver (`pool-runner.mjs`, `native/pool.py`, `native/probe.py`) comes from
the preserved standalone Hik-Vision Linux pilot, with local routing/stop adaptations.
The server uses the V3 SaaS API, not the pilot's single-owner server or vanilla UI.

Linux Node launches an isolated Windows Python under Wine. The vendor DLLs remain
Windows PE binaries; they are not recompiled Linux libraries. One native SDK context
is shared per grant within a process; separate camera output remains routed by
stream ID. Different grants use separate processes. Limits are enforced by MediaHub.
PC microphone forwarding is unsupported, as in the current separate Windows API.

Mount the authorized complete x64 SDK dependency tree read-only at /opt/hik-sdk.
Set HIK_SDK_APP_ID to the installed SDK identity. Do not substitute a random key.
No SDK binaries, account tokens, provider passwords or client log files are bundled.
Native codec requirements are pinned in native/requirements.txt. Wine has a
separate runtime/requirements-wine.txt pin: PyAV 18.1.0 supports embedded Python
3.11, while native Python 3.12+ can use PyAV 19.0.1. The container uses the
pilot's Windows Python 3.11.9 baseline, with the official archive SHA-256 checked.
This old embedded runtime must be evaluated/updated as part of production security
maintenance; the container recipe has not been built or certified on this Windows PC.
