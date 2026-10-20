# BrainLab AI Tutor API

The tutor endpoint is `POST /api/ai`. It streams plain-text chunks for the existing client helper to consume, using Groq's OpenAI-compatible chat completions endpoint.

## Environment

Set these only in local `.env.local` or Vercel Project Settings → Environment Variables:

- `GROQ_API_KEY`: private Groq API key.
- `GROQ_MODEL`: exact model identifier enabled for the Gateway account (for example, choose from the Groq's supported models list; do not guess a model ID).

The route also needs `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to validate the signed-in user's access token. The AI Gateway key must never be prefixed with `NEXT_PUBLIC_`, committed, or sent by the browser.

## Client contract

Send a valid Supabase access token in `Authorization: Bearer <access-token>` and JSON with one of these modes:

- `explain` or `why_wrong`: `{ mode, question }`
- `chat`: `{ mode, question, messages }`
- `coach`: `{ mode, context, messages }`

The response body is a streamed plain-text response. The endpoint validates the Supabase token server-side and applies basic per-user request throttling. The in-memory throttle is best-effort only on serverless deployments; add a durable rate limiter or Vercel Firewall rule before broad public launch.

## Safety notes

Question answers and explanations supplied by the client are treated as unverified context, not trusted database truth. This endpoint does not read or change CBT records and makes no database schema changes. Do not send protected live-exam answer keys to this endpoint. Configure a model available to your Groq account before testing.
