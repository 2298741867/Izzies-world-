# Federated AI Rewards Covenant

## Gemini audit token usage

Set `GEMINI_API_KEY` on the server to enable Gemini audits and dispute rulings.
Set `GEMINI_MODEL` to override the default `gemini-2.5-flash`. Never expose the
API key in client-side code.

Audit and dispute responses return `usage` with Gemini's actual `promptTokens`,
`outputTokens`, `totalTokens`, `model`, and optional `thinkingTokens`. These are
API tokens, not the simulation's COV currency. Fallback responses have
`usage: null`, `source`, and `fallbackReason`; no counts are invented. A failed
model attempt may consume tokens even when no usage metadata is returned.

`GET /api/arbiter/usage` returns `{ promptTokens, outputTokens, totalTokens,
calls, model }`. Totals are server-wide, in memory, and reset on restart.
`calls` counts Gemini attempts (including failures); token totals include only
metadata returned by Gemini, including responses whose content cannot be used.
The UI refreshes this server-session badge after each audit or ruling.

The two POST arbiter endpoints share a limit of 20 requests per minute per IP.
This is basic quota protection, not authentication; restrict access before
exposing a server with a paid API key publicly.

Install dependencies with `npm install --legacy-peer-deps` (the current
Vite/esbuild peer ranges conflict), then use `npm run dev`. Validate with
`npm run lint` and `npm run build`.
