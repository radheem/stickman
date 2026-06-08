import { CONFIG } from './config.js';

// Global leaderboard client for the Google Apps Script web app.
// See docs/04-leaderboard.md for the endpoint contract and CORS rationale.

// GET the top scores as JSON, normalized + sorted desc + capped.
export async function fetchTop() {
  const res = await fetch(CONFIG.LEADERBOARD.URL, { cache: 'no-store' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error('bad payload');
  return data
    .map((r) => ({ name: String(r.name ?? '').trim(), score: Number(r.score) || 0 }))
    .filter((r) => r.name)
    .sort((a, b) => b.score - a.score)
    .slice(0, CONFIG.LEADERBOARD.TOP_N);
}

// POST a score. Uses text/plain so the browser sends a CORS "simple request"
// (no preflight — Apps Script can't answer OPTIONS). Fire-and-forget: the row is
// written server-side regardless of whether we can read the redirected response.
export function submitScore(name, score) {
  return fetch(CONFIG.LEADERBOARD.URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      name: String(name).slice(0, CONFIG.LEADERBOARD.NAME_MAX_LEN),
      score: Math.floor(score),
    }),
  });
}
