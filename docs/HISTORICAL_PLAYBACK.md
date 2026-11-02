# Historical DVR playback

The Linux backend exposes recorded-footage search and playback through the same
Wine-hosted vendor SDK context used for live viewing:

- `POST /api/playback/search` searches a selected recorder channel and time range.
- `POST /api/playback/start` opens the selected DVR range.
- `POST /api/playback/control` supports pause, resume, restart/seek and 1x-16x speed.

Search metadata is bounded and whitelisted. Provider tokens and opaque SDK callback
content are never returned to the browser or written to normal application logs.
