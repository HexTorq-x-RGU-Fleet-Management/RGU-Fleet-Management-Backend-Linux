# Windows to Linux synchronization

Baseline: Windows backend `6a45b48206c67bf309a36bb13db1719815de287e`.
The Linux repo owns all source; no runtime imports of sibling repos are allowed.
`npm run check:parity` verifies hashes of 45 unchanged shared files after the SDK
directory rename. Platform adapters are intentionally different and tested separately.

| Feature                                                       | Linux implementation                                                                |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Platform owner, signup approval, suspension, password support | Same API and PostgreSQL policies                                                    |
| Admin/member workspaces and channel grants                    | Same forced RLS and session revocation                                              |
| Direct Hik-Connect ID/password sign-in                        | Same provider client and real inventory                                             |
| Web-account recovery                                          | Same encrypted opt-in secret, leases, backoff, account-switch protection            |
| Playback authorization                                        | Migrated grants or admin-only verified import; no installed Windows client on Linux |
| Live frames, H264/JPEG, PCM audio, previews                   | Wine receiver, pooled by grant, existing media API                                  |
| Stream limits, failures, revocation, reconnect support        | Same MediaHub and connection codes; native shutdown adapted                         |
| Buses, recorder mapping, GPS/fuel history                     | Same PostgreSQL fleet and JSONB telemetry API                                       |
| Vendor GPS/fuel                                               | Still phase 2; simulator remains backend-only and labelled mock                     |
| UI preferences, favourites, layouts                           | Same per-user PostgreSQL persistence                                                |
| Clip uploads, range playback, grants, retention and storage   | Same tenant storage and recording API                                               |
| Audit and superadmin monitoring                               | Same persisted API and scope                                                        |
| Frontend camera controls/grid/zoom/rotation/adaptive quality  | Existing React frontend; shared API/media contract                                  |

There is no independent automatic SDK login/refresh implementation on Linux.
Migrating a saved token does not extend its expiry. When it expires or is revoked,
reconnect web access if needed and import a newly authorized playback grant.
Import is validated against a channel in the current web account's shared inventory;
the imported token never grants access outside the intersection of web and SDK access.
Failed validation leaves the previous grant unchanged. Tokens are never returned in
status, audit or frontend responses. A provider can still demand CAPTCHA/verification.

Push-to-talk/browser microphone forwarding and historical DVR archive playback
remain unavailable/deferred in the current separate Windows API too. Browser clips
require the browser to remain open until recording/upload finishes. These limits
are not represented as completed Linux features.

Local portable tests exercise the API on Windows with a real disposable PostgreSQL
database. Wine/DLL loading, Linux filesystem behavior, actual provider renewal and
long-running real-camera capacity still require the Linux acceptance checklist.
