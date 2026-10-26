# One-click playback-grant export

On the Windows computer where iVMS-4200 is signed in and playing the shared camera,
double-click:

```text
tools/export-playback-grant.bat
```

The helper uses the known local OpenSDK log when it exists. Otherwise it asks for the
full path to `opensdk.log`. It validates the India playback login record and creates:

```text
.local/migration/playback.json
```

The file is private and ignored by Git. Select it in the production portal at
**Settings → Hik-Connect account → Import playback authorization**. The backend still
verifies a shared channel before saving the grant.

If the helper reports that no matching grant was found, sign into the correct account
in iVMS, open a shared camera until live video plays, and run the helper again.
The helper never displays the token contents.
