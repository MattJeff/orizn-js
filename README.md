# orizn

Official JavaScript/TypeScript SDK for the [Orizn Visa API](https://visa.orizn.app/visa-api).

Visa requirements for **40,027 passport × destination pairs**, in **15 languages**, with **30+ data points per pair** — fees, processing times, photo specs, transit visas, embassies, overstay penalties, safety advisories.

## 60-second start

```bash
npm install orizn
```

1. Get a free key (10 seconds, no credit card): **https://visa.orizn.app/visa-api**
2. `export ORIZN_API_KEY=orizn_visa_...`
3. Run this:

```typescript
import { Orizn } from "orizn";

const orizn = new Orizn(); // reads ORIZN_API_KEY

const visa = await orizn.getVisa("FRA", "JPN", "en");
console.log(visa.requirement);        // "visa_free"
console.log(visa.visa_free_days);     // 90
console.log(visa.documents_required); // ["Valid passport (6 months minimum)", ...]
console.log(visa.process);            // ["No prior formalities required", ...]
```

Free tier: **100 requests/month** (5 until you confirm your email address). All 15 languages included. Need more? Starter is **$49/month for 30,000 requests** → [upgrade](https://visa.orizn.app/visa-api/login?next=%2Fvisa-api%2Fdashboard%2Fbilling%3Fplan%3Dstarter%26source%3Djs).

## Methods

| Method | Plan | Returns |
|--------|------|---------|
| `getVisa(passport, destination, lang?)` | Free+ | `VisaData` — the full record |
| `check(passport, destination)` | Free+ | `VisaCheckResult` — requirement + days only |
| `bulk(passport, destinations[], lang?)` | Starter+ | `BulkDestination[]` — up to 25 per call |
| `stats()` | no key | `CoverageStats` — dataset coverage |

```typescript
// One pair, cheapest call
const quick = await orizn.check("USA", "BRA");
quick.requirement;    // "e_visa"
quick.last_verified;  // "2026-05-10" | null

// Up to 25 destinations at once (Starter+). Each destination counts as 1 request.
const many = await orizn.bulk("FRA", ["JPN", "USA", "THA"], "fr");
many.map((d) => `${d.destination}: ${d.requirement}`);

// No key needed
const { coverage } = await orizn.stats();
```

Country codes are ISO 3166-1 alpha-3: `FRA`, `USA`, `JPN`, `GBR`, `BRA`, `THA`, `CHN`…

Languages (all on every plan, free included):
`en` `fr` `es` `pt` `de` `it` `ja` `ko` `zh` `ru` `ar` `hi` `th` `vi` `tl`

## Errors

Every failure is a typed error carrying the URL that fixes it.

```typescript
import {
  Orizn,
  OriznAuthError,       // 401 — no key sent
  OriznInvalidKeyError, // 403 — key unknown or deactivated
  OriznPlanError,       // 403 — your plan lacks this endpoint
  OriznRateLimitError,  // 429 — monthly quota or anti-abuse cap
  OriznNotFoundError,   // 404 — no data for that pair
  OriznBadRequestError, // 400 — bad ISO code, too many destinations…
} from "orizn";

try {
  await orizn.getVisa("FRA", "JPN");
} catch (e) {
  if (e instanceof OriznRateLimitError) console.log(e.message); // includes the upgrade URL
  if (e instanceof OriznAuthError) console.log(e.message);      // includes the signup URL
}
```

All inherit `OriznError` (`statusCode`, `code`, `serverMessage`).

## Reading a response

`requirement` is mostly canonical, but ~350 pairs still carry a legacy spelling (`"visa free"`, `"e-visa"`). Normalize before comparing:

```typescript
import { normalizeRequirement } from "orizn";

normalizeRequirement(visa.requirement); // "visa_free" | "visa_required" | "e_visa"
                                        // | "visa_on_arrival" | "eta" | "no_admission" | "unknown"
```

Fields your plan doesn't include come back as `{ upgrade: "..." }` instead of data:

```typescript
import { isUpgradeNotice } from "orizn";

if (isUpgradeNotice(visa.visa_fee)) {
  console.log(visa.visa_fee.upgrade); // "Available on Starter plan or above"
} else {
  console.log(visa.visa_fee.single_entry); // { amount: 0, currency: "JPY" }
}
```

Always present, every plan: `requirement`, `visa_free_days`, `visa_required`, `description`, `documents_required`, `process`, `country_info`, `passport_validity_months`, `safety`, `verified`.

On the free plan every other field comes back as `{ upgrade: "..." }`. Any paid plan (Starter and above) returns the data: `transit_visa`, `visa_fee`, `processing_days`, `photo_specs`, `vaccinations_required`, `insurance_required`, `dual_nationality_warnings`, `stamp_warnings`, `minor_rules`, `overstay_penalty`, `entry_by_mode`, `extension_rules`, `best_apply_period`, `health_requirements`, plus `visa_types` and full `tips`.

`embassy` (both directions), `remote_work_visa` and `reciprocity_history` still show an upgrade notice on the Starter plan.

All types are exported: `import type { VisaData, VisaFee, EmbassyData } from "orizn"`.

## Also from Orizn

- [`@orizn/react`](https://www.npmjs.com/package/@orizn/react) — drop-in `<VisaChecker />` component
- [MCP server](https://github.com/MattJeff/orizn-mcp-server) — visa data inside Claude and other MCP clients

## Links

- [Get a free API key](https://visa.orizn.app/visa-api)
- [API documentation](https://visa.orizn.app/visa-api/dashboard/docs)
- [GitHub](https://github.com/MattJeff/orizn-js) — issues and feature requests
- **api@orizn.app** — tell us what you're building

MIT
