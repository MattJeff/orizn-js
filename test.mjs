// Self-check: run `npm run build && node test.mjs`.
// Fakes fetch so it exercises the real request path — unwrapping and error
// mapping — without touching the network or burning quota.
import assert from "node:assert/strict";
import {
  Orizn,
  OriznAuthError,
  OriznInvalidKeyError,
  OriznPlanError,
  OriznRateLimitError,
  OriznNotFoundError,
  OriznBadRequestError,
  normalizeRequirement,
  isUpgradeNotice,
} from "./dist/index.js";

let lastUrl = "";
function stub(status, body, headers = {}) {
  globalThis.fetch = async (url) => {
    lastUrl = url;
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: { get: (h) => headers[h] ?? null },
      text: async () => JSON.stringify(body),
    };
  };
}

const client = new Orizn({ apiKey: "orizn_visa_test" });

// ── Response unwrapping: each endpoint has a DIFFERENT envelope ──────────────
stub(200, { data: { passport: "FRA", requirement: "visa_free" }, meta: {} });
assert.equal((await client.getVisa("fra", "jpn")).requirement, "visa_free");
assert.ok(lastUrl.includes("lang=en"));

// /check is FLAT — no `data` wrapper. This is what 1.0.1 got wrong.
stub(200, { passport: "FRA", destination: "JPN", requirement: "visa free", visa_free_days: 90 });
assert.equal((await client.check("FRA", "JPN")).visa_free_days, 90);

// /bulk answers { passport, lang, total, destinations }
stub(200, { passport: "FRA", lang: "en", total: 1, destinations: [{ destination: "JPN" }] });
assert.deepEqual(await client.bulk("FRA", ["JPN", "JPN"]), [{ destination: "JPN" }]);
assert.ok(lastUrl.includes("destination=JPN") && !lastUrl.includes("JPN%2CJPN"));

// ── Status → error class, with the conversion URL in the message ─────────────
const cases = [
  [401, { error: "Missing API key" }, OriznAuthError, "visa.orizn.app/visa-api"],
  [403, { error: "Invalid or inactive API key" }, OriznInvalidKeyError, "dashboard"],
  [403, { error: "Bulk endpoint requires Hobby plan or above" }, OriznPlanError, "plan%3Dstarter"],
  [429, { error: "Monthly limit exceeded" }, OriznRateLimitError, "plan%3Dstarter"],
  [404, { error: "not found" }, OriznNotFoundError, "FRA -> JPN"],
];
for (const [status, body, cls, needle] of cases) {
  stub(status, body, { "Retry-After": "60" });
  await assert.rejects(() => client.getVisa("FRA", "JPN"), (e) => {
    assert.ok(e instanceof cls, `${status} -> ${e.name}, expected ${cls.name}`);
    assert.ok(e.message.includes(needle), `${cls.name} message missing "${needle}"`);
    return true;
  });
}

// Envelope since 2026-08-13: error is an object whose message already carries
// price + checkout link → shown as-is, no second link, no "[object Object]".
stub(429, { error: { code: "QUOTA_EXCEEDED", message: "Monthly quota reached. Starter is $49/mo for 30,000 requests: https://visa.orizn.app/visa-api/login?next=%2Fvisa-api%2Fdashboard%2Fbilling%3Fplan%3Dstarter", docs_url: "https://visa.orizn.app/docs" } });
await assert.rejects(() => client.getVisa("FRA", "JPN"), (e) => {
  assert.equal((e.message.match(/https?:\/\//g) || []).length, 1, e.message);
  assert.ok(!/Hobby|object/.test(e.message), e.message);
  return true;
});

// ── Local guards: refuse calls the server would bill and then reject ─────────
stub(200, {});
await assert.rejects(() => client.getVisa("FR", "JPN"), OriznBadRequestError);
await assert.rejects(() => client.bulk("FRA", []), OriznBadRequestError);
// 26 VALID codes (AAA…AAZ): must fail on the size cap, not on ISO validation.
await assert.rejects(
  () => client.bulk("FRA", Array.from({ length: 26 }, (_, i) => `AA${String.fromCharCode(65 + i)}`)),
  (e) => e instanceof OriznBadRequestError && /at most 25/.test(e.message)
);

// No key at all: fail before the network, with the signup link.
await assert.rejects(() => new Orizn({ apiKey: "" }).getVisa("FRA", "JPN"), OriznAuthError);
// Keyless widget mode — the path @orizn/react rides on, and the only coverage
// it has: `source` stands in for the key and must reach the server.
stub(200, { passport: "FRA", destination: "JPN", requirement: "visa free" });
const widget = new Orizn({ apiKey: "", source: "embed" });
assert.equal(normalizeRequirement((await widget.check("FRA", "JPN")).requirement), "visa_free");
assert.ok(lastUrl.includes("source=embed"), `source missing from ${lastUrl}`);

// …but stats() is public.
stub(200, { coverage: { languages: 15 } });
assert.equal((await new Orizn({ apiKey: "" }).stats()).coverage.languages, 15);

// ── Helpers ─────────────────────────────────────────────────────────────────
assert.equal(normalizeRequirement("visa free"), "visa_free");
assert.equal(normalizeRequirement("e-visa"), "e_visa");
assert.equal(normalizeRequirement("admission refused"), "no_admission");
assert.equal(normalizeRequirement(null), "unknown");
assert.equal(isUpgradeNotice({ upgrade: "Pro" }), true);
assert.equal(isUpgradeNotice({ amount: 0 }), false);

console.log("orizn: all checks passed");
