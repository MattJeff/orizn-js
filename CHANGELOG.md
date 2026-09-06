# Changelog

## 1.2.0 — 2026-08-07

Audited every method against the live API. Three of the five were returning
`undefined` or 400ing against the current server. Upgrade before doing anything
else.

### Fixed (breaking, because the old behaviour did not work)

- **`check()` returned `undefined`.** The endpoint answers a flat payload; the
  SDK was reading a `data` wrapper that does not exist. It also needs an API key
  now — the SDK says so up front instead of round-tripping to a 401.
- **`bulk()` was broken and its signature changed.** `destination` is required
  server-side (max 25 per call, comma-separated), so `bulk("FRA")` 400'd every
  time — and still cost a request. New signature:
  `bulk(passport, destinations: string[], lang?)`. It returns
  `BulkDestination[]` (the API's `destinations` array), not `VisaData[]`.
- **`stats()`** now types what the endpoint really returns
  (`passport_index_pairs`, `translations`, `requirement_distribution`, …).
- `VisaData` matched no real response: added `visa_types`, `extension`,
  `processing_time`, `cost`, `validity`, `max_stay`, `source`; corrected
  `entry_by_mode` (objects per mode, not day counts), `reciprocity_history`
  (a `{ changes: [...] }` wrapper), `embassy` (lists, not single objects) and
  `transit_visa` hubs (`airport_code`, `default_transit_free_hours`).
- Plan-gated fields are typed as `Gated<T>` — the API replaces them with
  `{ upgrade: "..." }` on lower plans. Narrow with `isUpgradeNotice()`.
- `process.env` is no longer read unguarded, so the client works in a browser.
- `OriznRateLimitError.retryAfterSeconds` is `undefined` when the response has
  no `Retry-After` header, instead of `0` ("retry now").

### Removed

- **`changes()`**. The endpoint is disabled server-side (503): its feed was
  built from internal table diffs, not from official policy changes. It will
  come back only on verified sources.

### Added

- Distinct error classes with the URL that fixes the problem, and the API's own
  message: `OriznInvalidKeyError` (403 bad key), `OriznPlanError` (403 plan
  gate), `OriznBadRequestError` (400). `OriznAuthError`, `OriznRateLimitError`
  and `OriznNotFoundError` keep their names and now carry `serverMessage`.
- `normalizeRequirement()` — ~350 pairs still return legacy spellings
  (`"visa free"`, `"e-visa"`); this maps them to the six canonical values.
- `isUpgradeNotice()`, `LANGUAGES`, `MAX_BULK_DESTINATIONS`, and exported
  `SIGNUP_URL` / `DASHBOARD_URL` / `UPGRADE_URL`.
- ISO3 codes and bulk size are validated locally — a malformed call no longer
  costs a request against your quota.
- `test.mjs`: self-check over response unwrapping and status→error mapping.

### Docs

- The free tier is **50 requests/month** (5 until the email is confirmed), not
  3,000.
- **All 15 languages are available on the free plan.** The gate is gone.
- The npm package is `orizn`. `@orizn/visa-api` never existed.

## 1.1.0 — 2026-05

Extended-intelligence fields (transit, fees, photo specs, penalties, safety).

## 1.0.1 — 2026-05

First public release.
