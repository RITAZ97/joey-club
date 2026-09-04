# Scheduled AI resource importing

JoeyClub keeps the visitor-facing search path separate from AI importing:

- A visitor search reads only approved records from Neon via `GET /api/resources`.
- The importer discovers at most three candidate deep links from whitelisted source sitemaps, applies no-AI page preflight and rule tagging, then asks Flash-Lite only when essential structured metadata is missing.
- It never displays a candidate to visitors until its database status is `approved`.

## One-time configuration

1. Enable the Vertex AI API in the Google Cloud project and grant the caller the `Vertex AI User` role.
2. For local importing, authenticate once with ADC: `gcloud auth application-default login`, then run `gcloud auth application-default set-quota-project <project-id>`.
3. In `.env.local`, add `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION=global`, and `GOOGLE_GENAI_USE_VERTEXAI=true`. Do not add an AI Studio `GEMINI_API_KEY`; the importer now uses ADC.
4. In Google Cloud Billing, create a low budget alert for that project. A budget alert warns you; it is not a guaranteed automatic spending stop, so the application limits every import batch to three candidates and only incomplete pages reach Flash-Lite.
5. For Vercel, add `DATABASE_URL`, `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`, `GEMINI_DISCOVERY_MODEL`, `GEMINI_REVIEW_MODEL`, `CRON_SECRET`, and `GEMINI_IMPORT_ENABLED=true`. Vercel cannot use your computer's ADC file; configure a workload identity or a dedicated service-account credential before enabling the scheduled importer in production.
4. Deploy. `vercel.json` calls `GET /api/cron/ai-import` each Sunday at 20:00 UTC (Monday morning in Australia, with daylight-saving variation).

Vercel sends `Authorization: Bearer <CRON_SECRET>` when the `CRON_SECRET` environment variable is configured, so the endpoint does not accept public requests.

## Operating limits

- Gemini Search grounding is not used. Discovery reads only published sitemaps on allowed domains.
- Each run returns at most 3 candidates from allowed source domains.
- A URL must pass an HTTP 200, final-redirect, whitelist, non-home/non-login, readable-HTML and metadata preflight before it can be stored.
- Exact EYLF outcomes are only retained when page text explicitly names them.
- Low-confidence Flash-Lite output remains `needs_review`; deterministic source metadata can be stored as `source_linked`.

## Local test

After billing is enabled, a deliberate manual batch can be run with:

```bash
pnpm ai:import -- "early childhood outdoor nature activities"
```

Do not run this command casually: it uses Google Search grounding when `GEMINI_DISCOVERY_MODE=gemini_search`.
