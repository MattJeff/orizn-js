import type {
  OriznConfig,
  VisaResponse,
  VisaCheckResult,
  CoverageStats,
  VisaData,
  BulkResponse,
  BulkDestination,
  Language,
} from "./types.js";
import {
  OriznAuthError,
  OriznBadRequestError,
  errorFromResponse,
  SIGNUP_URL,
} from "./errors.js";

const DEFAULT_BASE_URL = "https://visa.orizn.app";
const DEFAULT_TIMEOUT = 10_000;
const VERSION = "1.2.1";

/** Server cap: destinations per bulk() call. */
export const MAX_BULK_DESTINATIONS = 25;

function envApiKey(): string | undefined {
  // Browsers (and some bundlers) have no `process` — @orizn/react runs there.
  return typeof process !== "undefined" ? process.env?.ORIZN_API_KEY : undefined;
}

function iso3(code: string, field: string): string {
  const up = code?.toUpperCase?.() ?? "";
  if (!/^[A-Z]{3}$/.test(up)) {
    throw new OriznBadRequestError(
      `${field} must be an ISO 3166-1 alpha-3 code (FRA, JPN, USA) — got "${code}".`
    );
  }
  return up;
}

export class Orizn {
  private apiKey?: string;
  private baseUrl: string;
  private timeout: number;
  private source?: string;

  private static _hinted = false;

  constructor(config: OriznConfig = {}) {
    this.apiKey = config.apiKey ?? envApiKey();
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
    this.source = config.source;

    if (!this.apiKey && !this.source && !Orizn._hinted) {
      Orizn._hinted = true;
      console.warn(
        `[orizn] No API key — every method except stats() will fail.\n` +
          `[orizn] Free key, 10 seconds, no credit card: ${SIGNUP_URL}\n` +
          `[orizn] Then: export ORIZN_API_KEY=orizn_visa_...`
      );
    }
  }

  /**
   * Full visa record: 30+ fields, in any of the 15 languages (all plans,
   * including free). Plan-gated fields come back as `{ upgrade: "..." }` —
   * narrow them with `isUpgradeNotice()`.
   */
  async getVisa(
    passport: string,
    destination: string,
    lang: Language = "en"
  ): Promise<VisaData> {
    const res = await this.request<VisaResponse>("/api/v1/visa", {
      passport: iso3(passport, "passport"),
      destination: iso3(destination, "destination"),
      lang,
    });
    return res.data;
  }

  /** Requirement + visa-free days only. Cheapest call; still needs a key. */
  async check(passport: string, destination: string): Promise<VisaCheckResult> {
    return this.request<VisaCheckResult>("/api/v1/visa/check", {
      passport: iso3(passport, "passport"),
      destination: iso3(destination, "destination"),
    });
  }

  /**
   * Up to 25 destinations for one passport in a single call — Starter plan and
   * above. Each destination returned counts as one request against the quota.
   */
  async bulk(
    passport: string,
    destinations: string[],
    lang: Language = "en"
  ): Promise<BulkDestination[]> {
    if (!Array.isArray(destinations) || destinations.length === 0) {
      throw new OriznBadRequestError(
        `bulk() needs 1 to ${MAX_BULK_DESTINATIONS} destinations: bulk("FRA", ["JPN", "USA"]).`
      );
    }
    const codes = [...new Set(destinations.map((d) => iso3(d, "destination")))];
    if (codes.length > MAX_BULK_DESTINATIONS) {
      throw new OriznBadRequestError(
        `bulk() accepts at most ${MAX_BULK_DESTINATIONS} destinations per call — got ${codes.length}.`
      );
    }
    const res = await this.request<BulkResponse>("/api/v1/visa/bulk", {
      passport: iso3(passport, "passport"),
      destination: codes.join(","),
      lang,
    });
    return res.destinations;
  }

  /** Public coverage stats. The only method that works without a key. */
  async stats(): Promise<CoverageStats> {
    return this.request<CoverageStats>("/api/v1/visa/stats", {});
  }

  private async request<T>(path: string, params: Record<string, string>): Promise<T> {
    const isPublic = path.endsWith("/stats");
    if (!isPublic && !this.apiKey && !this.source) throw new OriznAuthError();

    const url = new URL(path, this.baseUrl);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    if (!this.apiKey && this.source) url.searchParams.set("source", this.source);

    const headers: Record<string, string> = {
      Accept: "application/json",
      "X-Orizn-Client": `orizn-js/${VERSION}`,
    };
    if (this.apiKey) headers["x-api-key"] = this.apiKey;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(url.toString(), { headers, signal: controller.signal });
      const text = await res.text();
      let body: unknown = null;
      try {
        body = JSON.parse(text);
      } catch {
        /* non-JSON body: surfaced raw (truncated) below */
      }

      if (!res.ok) {
        // Since 2026-08-13 errors are wrapped: { error: { code, message, ... } }.
        const b = (body ?? {}) as { error?: string | { message?: string }; message?: string };
        const err = typeof b.error === "object" && b.error ? b.error.message : b.error;
        // Number(null) is 0, not NaN — without the null check a missing header
        // would say "retry in 0 seconds".
        const retryAfter = res.headers.get("Retry-After");
        throw errorFromResponse(res.status, err || b.message || text.slice(0, 300) || undefined, {
          passport: params.passport,
          destination: params.destination,
          retryAfterSeconds:
            retryAfter && Number.isFinite(Number(retryAfter)) ? Number(retryAfter) : undefined,
        });
      }

      return body as T;
    } finally {
      clearTimeout(timer);
    }
  }
}
