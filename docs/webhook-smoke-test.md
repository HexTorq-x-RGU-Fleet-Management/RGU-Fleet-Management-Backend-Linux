# Webhook smoke-test marker

This documentation-only commit verifies that the GitHub push webhook reaches the VPS pipeline. It intentionally contains no runtime or deployment changes.

Expected pipeline result:

```text
Deployment skipped: only documentation changes for .../RGU-Fleet-Management-Backend-Linux
```

Use `?force=true` only when a complete deployment is intentionally required.
