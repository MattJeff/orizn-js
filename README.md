# orizn

Official JavaScript/TypeScript SDK for the [Orizn Visa API](https://visa.orizn.app).

Check visa requirements for **39,585 passport-destination pairs** in **15 languages**, with **32 data points per visa** — fees, processing times, photo specs, transit visas, embassies, overstay penalties, safety advisories, and more.

## Install

```bash
npm install orizn
```

## Quick start

```typescript
import { Orizn } from "orizn";

// No API key needed for quick checks
const orizn = new Orizn();
const result = await orizn.check("FRA", "JPN");
console.log(result.requirement); // "visa_free"
console.log(result.visa_free_days); // 90

// Full details (needs API key — get one free at visa.orizn.app)
const client = new Orizn({ apiKey: "your-key" });
const visa = await client.getVisa("USA", "CHN", "en");
console.log(visa.documents_required);
console.log(visa.process);
console.log(visa.tips);
```

## API

### `new Orizn(config?)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | `process.env.ORIZN_API_KEY` | Your API key |
| `baseUrl` | `string` | `https://visa.orizn.app` | API base URL |
| `timeout` | `number` | `10000` | Request timeout (ms) |

### Methods

| Method | Auth | Description |
|--------|------|-------------|
| `check(passport, destination)` | None | Quick visa check |
| `getVisa(passport, destination, lang?)` | Key | Full details (32 data points) |
| `bulk(passport, lang?)` | Key (Pro) | All destinations |
| `changes(passport?, destination?)` | Key (Starter) | Policy changes |
| `stats()` | None | Coverage stats |

### Country codes

Use ISO 3166-1 alpha-3 codes: `FRA`, `USA`, `JPN`, `GBR`, `BRA`, `THA`, `CHN`, etc.

### Languages

`en` `fr` `es` `pt` `de` `ja` `ko` `zh` `ru` `it` `ar` `hi` `th` `vi` `tl`

## What's in `getVisa()`: 32 data points

Every full visa response now includes the following fields. Anything not relevant to a given pair is omitted (e.g. `remote_work_visa` only appears if a digital nomad visa exists for that destination).

### Core (always present)

| Field | Type | Description |
|---|---|---|
| `passport` | `string` | ISO 3166-1 alpha-3 (e.g. `"FRA"`) |
| `destination` | `string` | ISO 3166-1 alpha-3 (e.g. `"JPN"`) |
| `requirement` | `VisaRequirement` | `visa_free` \| `visa_required` \| `e_visa` \| `visa_on_arrival` \| `eta` \| `no_admission` |
| `visa_free_days` | `number \| null` | Max stay in days for visa-free travel |
| `visa_required` | `boolean` | True if any visa formality is needed |
| `description` | `string` | Localized human-readable summary |
| `documents_required` | `string[]` | Documents to bring/submit |
| `process` | `string[]` | Step-by-step application process |
| `tips` | `string[]` | Travel tips |
| `country_info` | `CountryInfo` | Currency, language, timezone, capital |
| `verified` | `boolean` | Verified against an official source |

### Extended intelligence (optional)

| Field | Type | What it tells you |
|---|---|---|
| `transit_visa` | `TransitVisa` | Whether a transit visa is needed at airports like DXB, IST, DOH, plus free transit hours |
| `passport_validity_months` | `number` | Minimum passport validity required at entry (typically 3 or 6) |
| `visa_fee` | `VisaFee` | Cost of single-entry and multiple-entry visas, with currency |
| `processing_days` | `ProcessingDays` | Standard / express / rush processing times |
| `photo_specs` | `PhotoSpecs` | Dimensions in mm, background color, glasses & head covering rules |
| `vaccinations_required` | `string[]` | Mandatory vaccines (e.g. `"yellow_fever"`) |
| `insurance_required` | `InsuranceRequired` | Min travel insurance coverage required |
| `dual_nationality_warnings` | `string[]` | Warnings for dual-nationals (e.g. mandatory military service) |
| `stamp_warnings` | `string[]` | Passports stamps that may block entry (e.g. Israeli stamp in some countries) |
| `minor_rules` | `MinorRules` | Rules for travelers under 18 (consent letters, solo travel age) |
| `overstay_penalty` | `OverstayPenalty` | Fine per day, ban duration, criminal liability |
| `entry_by_mode` | `EntryByMode` | Different stay limits for `air` / `land` / `sea` arrivals |
| `remote_work_visa` | `RemoteWorkVisa` | Digital nomad visa availability, duration, fee, requirements |
| `extension_rules` | `ExtensionRules` | Whether the stay can be extended, max days, fee, where |
| `reciprocity_history` | `ReciprocityChange[]` | Historical policy changes between the two countries |
| `safety` | `SafetyInfo` | Travel advisory level (1–4) with source and last update |
| `best_apply_period` | `string` | Recommended window to apply (e.g. `"30–90 days before"`) |
| `health_requirements` | `HealthRequirements` | COVID test, vaccination proof, quarantine days, screenings |
| `embassy` | `EmbassyData` | Your embassy at destination (emergency) + destination's embassy in your country (where to apply) |

### Example: full response shape

```typescript
const visa = await client.getVisa("FRA", "JPN", "en");

// Core
visa.requirement;          // "visa_free"
visa.visa_free_days;       // 90
visa.documents_required;   // ["Valid passport (6 months)", ...]

// Cost & timing
visa.visa_fee?.single_entry;        // { amount: 0, currency: "JPY" }
visa.processing_days?.standard;     // null (visa-free)

// Transit
visa.transit_visa?.hubs?.[0];       // { airport: "NRT", transit_free_hours: 24, ... }

// Health & safety
visa.health_requirements?.covid_test;          // false
visa.safety?.level;                            // 1
visa.vaccinations_required;                    // []

// Penalties & rules
visa.overstay_penalty?.fine_per_day;           // "300,000 JPY + deportation"
visa.passport_validity_months;                 // 3
visa.entry_by_mode?.air;                       // 90

// Remote work
visa.remote_work_visa?.available;              // false (or true with duration_months, fee, requirements)

// Embassy
visa.embassy?.your_embassy_at_destination;     // French embassy in Tokyo
visa.embassy?.visa_application_embassy;        // Japanese embassy in Paris
```

All types are exported — `import type { VisaData, TransitVisa, EmbassyData, ... } from "orizn"`.

## Error handling

```typescript
import { Orizn, OriznAuthError, OriznRateLimitError } from "orizn";

try {
  const visa = await orizn.getVisa("FRA", "JPN");
} catch (e) {
  if (e instanceof OriznAuthError) console.log("Need API key");
  if (e instanceof OriznRateLimitError) console.log("Upgrade plan");
}
```

## Feedback

Building a travel agent or visa tool? We'd love to hear what you're building.

→ **api@orizn.app** — Feature requests, partnerships, and questions welcome.

## Links

- [Get free API key](https://visa.orizn.app)
- [API Documentation](https://visa.orizn.app/visa-api/dashboard/docs)
- [MCP Server](https://github.com/MattJeff/orizn-mcp-server)
- [GitHub](https://github.com/MattJeff/orizn-js)
