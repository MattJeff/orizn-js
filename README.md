# orizn

Official JavaScript/TypeScript SDK for the [Orizn Visa API](https://visa.orizn.app).

Check visa requirements for **39,585 passport-destination pairs** in **15 languages**.

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
| `getVisa(passport, destination, lang?)` | Key | Full details |
| `bulk(passport, lang?)` | Key (Pro) | All destinations |
| `changes(passport?, destination?)` | Key (Starter) | Policy changes |
| `stats()` | None | Coverage stats |

### Country codes

Use ISO 3166-1 alpha-3 codes: `FRA`, `USA`, `JPN`, `GBR`, `BRA`, `THA`, `CHN`, etc.

### Languages

`en` `fr` `es` `pt` `de` `ja` `ko` `zh` `ru` `it` `ar` `hi` `th` `vi` `tl`

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
