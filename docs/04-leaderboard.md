# Global Leaderboard — Google Sheet via Apps Script Web App

The leaderboard is backed by a **Google Apps Script web app** that reads from and
writes to a Google Sheet. No backend to host, no API key, no auth — the deployed
`/exec` URL is called directly from the game. This supersedes the earlier
Google-Forms idea; the Apps Script approach gives us a real JSON API (sorted reads,
structured writes) instead of scraping CSV.

The basic setup is **already built and tested** — see `stickman/scripts/`
(`getTest.sh`, `postTest.sh`, `.env`).

## The endpoint
A single deployed web-app URL (in `scripts/.env` as `LEADERBOARD_URL`):
```
https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec
```
- **GET** `/exec` → `doGet` returns the top scores as JSON, sorted descending:
  ```json
  [{"name":"BetaTester","score":150},{"name":"rando1","score":45}]
  ```
- **POST** `/exec` with a JSON body → `doPost` appends a row to the Sheet:
  ```json
  {"name": "rando1", "score": 45}
  ```

## Why it works from a browser (two critical details)
1. **CORS is open.** The endpoint responds with `access-control-allow-origin: *` on
   both the `302` redirect and the final `200` (verified). So `fetch()` from the
   game page can **read the GET response directly** — no proxy, no CSV snapshot
   needed.
2. **POST uses `Content-Type: text/plain` — keep it that way.** Apps Script web apps
   cannot answer a CORS **preflight** (`OPTIONS`) request. Sending
   `application/json` would trigger a preflight and fail in the browser.
   `text/plain` is a CORS "simple request" → no preflight → the POST goes through.
   `doPost` parses the raw body (`e.postData.contents`) as JSON regardless of the
   stated content-type. `postTest.sh` already does this correctly.

### The harmless POST redirect quirk
A POST to `/exec` returns a `302` to a `script.googleusercontent.com/echo?…` URL.
The write happens on Google's side **before** the redirect, so the row is committed
even though following the redirect (e.g. `curl -L`) may render Google's
"Sorry, unable to open the file at this time" HTML page. In a browser, `fetch`
follows `302→200` and can read the JSON. **Practical stance for the game: treat the
write as fire-and-forget and re-GET the board to confirm** — don't depend on parsing
the POST response.

## Browser integration (`leaderboard.js`)

### Read — fetch top scores
```js
async function fetchTop() {
  try {
    const res = await fetch(CONFIG.LEADERBOARD_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();              // [{name, score}, …], already sorted desc
  } catch (e) {
    // Optional resilience: committed snapshot fallback.
    const snap = await fetch('data/leaderboard-snapshot.json', { cache: 'no-store' });
    return await snap.json();
  }
}
```

### Write — submit a score
```js
async function submitScore(name, score) {
  // text/plain => no CORS preflight (Apps Script can't answer OPTIONS).
  await fetch(CONFIG.LEADERBOARD_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ name: name.slice(0, 16), score: Math.floor(score) }),
    // redirect:'follow' is the default; we don't rely on reading the response.
  }).catch(() => {/* fire-and-forget; confirm via re-GET */});
}
```

### Game Over flow
1. Show final score + personal best (localStorage).
2. Prefill name from `localStorage["stickman.name"]`; let the player edit.
3. `await submitScore(name, score)` → short delay (~1-2s for the row to commit) →
   `fetchTop()` → render the top-N board with the player's row highlighted.
4. Cache the name for next time.

## Config (`config.js`)
```js
LEADERBOARD: {
  URL: 'https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec',
  TOP_N: 25,                  // server should also enforce this in doGet
  REFRESH_DELAY_MS: 1500,
  NAME_MAX_LEN: 16,
}
```
Note: the URL is not a secret — the client must embed it to call it. It currently
lives in `scripts/.env` for the test scripts.

## Server side (Apps Script) — to commit & confirm
The `.gs` source currently lives only in the Apps Script editor. **Action: commit a
copy into `stickman/scripts/Code.gs`** so the API is version-controlled. The handler
shape (for reference / to verify against the live deployment):
```js
function doGet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  const data = sheet.getDataRange().getValues();        // [[name, score], …] (+header?)
  const rows = data.slice(1)                              // drop header if present
    .map(r => ({ name: String(r[0]), score: Number(r[1]) }))
    .filter(r => r.name && !isNaN(r.score))
    .sort((a, b) => b.score - a.score)
    .slice(0, 25);                                        // enforce TOP_N server-side
  return ContentService
    .createTextOutput(JSON.stringify(rows))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const body = JSON.parse(e.postData.contents);           // text/plain body, parsed as JSON
  const name  = String(body.name || '').slice(0, 16).trim();
  const score = Math.floor(Number(body.score));
  if (name && Number.isFinite(score)) {
    SpreadsheetApp.getActiveSpreadsheet().getSheets()[0].appendRow([name, score]);
  }
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
```
Confirm the live deployment: (a) `doGet` limits to TOP_N, (b) `doPost` coerces score
to a number and caps name length, (c) deployment access is "Anyone".

## Caveats & expectations
- **Anti-cheat:** client-only, so anyone with the `/exec` URL can POST an arbitrary
  score. Inherent to the no-backend approach and acceptable for an arcade prototype.
  Mitigations if it ever matters: an obfuscated/signed score token validated in
  `doPost`, basic rate limiting, or a real backend (out of scope for v1). The board
  is **not authoritative**.
- **Validation belongs server-side** too — never trust the client to cap name length
  or keep score an integer.
- **PII:** store only name + score.
- **Redeploys:** creating a *new* Apps Script deployment changes the `/exec` URL;
  use "Manage deployments → edit (same version)" to keep the URL stable, and update
  `config.js`/`.env` if it ever changes.
- **Reliability:** the optional JSON snapshot fallback covers Apps Script outages /
  quota limits.

## Test scripts (already in `scripts/`)
- `getTest.sh` — `curl -L "$LEADERBOARD_URL"` → prints the JSON board.
- `postTest.sh <name> <score>` — POSTs `{"name","score"}` as `text/plain`.
- `.env` — holds `LEADERBOARD_URL`.
These are the canonical reference for the request shapes the game must reproduce.
