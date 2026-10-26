# Linux backend rules

Keep the authenticated Windows API/SaaS contract: tenant isolation, forced RLS,
approval, member grants, provider recovery, fleet, recordings, audit and health.
Production camera inventory and media must use Hik-Connect and the authorized SDK.
GPS/fuel samples belong only in backend PostgreSQL with source=mock.
No browser UI, sample production cameras, sibling imports or Windows DPAPI runtime.
Keep secrets, SDK binaries, Wine state, clips, databases and logs out of Git.
No VPS/SSH/deployment work unless separately requested. Linux runtime acceptance
cannot be inferred from portable checks on Windows. Record test boundaries honestly.
Commit, push and verify remote synchronization before reporting changed work.
