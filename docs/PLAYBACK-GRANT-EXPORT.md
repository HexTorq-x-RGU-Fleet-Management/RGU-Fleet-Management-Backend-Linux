# One-click playback-grant export

On the Windows computer where iVMS-4200 is signed in and playing the shared camera,
double-click:

```text
tools/export-playback-grant.bat
```

The helper checks whether iVMS is installed and running, searches the standard
application/log directories for `opensdk.log`, selects the newest matching log and
prints a pass/warning/failure checklist. It validates the India playback login record
and creates:

```text
.local/migration/playback.json
```

The file is private and ignored by Git. Select it in the production portal at
**Settings → Hik-Connect account → Import playback authorization**. The backend still
verifies a shared channel before saving the grant.

The checklist reports where it searched, which log it selected, whether the India
login record and playback grant were found, and whether the log contains playback
activity. If it reports that no matching grant was found, sign into the correct
account in iVMS, open a shared camera until live video plays, and run the helper
again. The helper never displays the token contents.

For an unusual log location, pass it explicitly:

```cmd
tools\export-playback-grant.bat "C:\path\to\opensdk.log"
```
