import type {
  OriznConfig,
  VisaResponse,
  VisaCheckResponse,
  CoverageStats,
  VisaData,
  VisaCheckResult,
  VisaChange,
  Language,
} from "./types.js";
import {
  OriznError,
  OriznAuthError,
  OriznRateLimitError,
  OriznNotFoundError,
} from "./errors.js";

const DEFAULT_BASE_URL = "https://visa.orizn.app";
const DEFAULT_TIMEOUT = 10_000;

export class Orizn {
  private apiKey?: string;
  private baseUrl: string;
  private timeout: number;

  private static _hinted = false;

  constructor(config: OriznConfig = {}) {
    this.apiKey = config.apiKey ?? process.env.ORIZN_API_KEY;
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;

    if (!this.apiKey && !Orizn._hinted) {
      Orizn._hinted = true;
      console.warn(
        "[orizn] No API key found. Free mode: quick checks only.\n" +
        "[orizn] Get your free key → https://visa.orizn.app\n" +
        "[orizn] Then pass it: new Orizn({ apiKey: \"orizn_visa_...\" })"
      );
    }
  }

  async getVisa(
    passport: string,
    destination: string,
    lang: Language = "en"
  ): Promise<VisaData> {
    const data = await this.request<VisaResponse>("/api/v1/visa", {
      passport: passport.toUpperCase(),
      destination: destination.toUpperCase(),
      lang,
    }, true);
    return data.data;
  }

  async check(
    passport: string,
    destination: string
  ): Promise<VisaCheckResult> {
    const data = await this.request<VisaCheckResponse>("/api/v1/visa/check", {
      passport: passport.toUpperCase(),
      destination: destination.toUpperCase(),
    }, false);
    return data.data;
  }

  async bulk(
    passport: string,
    lang: Language = "en"
  ): Promise<VisaData[]> {
    const data = await this.request<{ data: VisaData[] }>("/api/v1/visa/bulk", {
      passport: passport.toUpperCase(),
      lang,
    }, true);
    return data.data;
  }

  async changes(
    passport?: string,
    destination?: string
  ): Promise<VisaChange[]> {
    const params: Record<string, string> = {};
    if (passport) params.passport = passport.toUpperCase();
    if (destination) params.destination = destination.toUpperCase();
    const data = await this.request<{ data: VisaChange[] }>("/api/v1/visa/changes", params, true);
    return data.data;
  }

  async stats(): Promise<CoverageStats> {
    return this.request<CoverageStats>("/api/v1/visa/stats", {}, false);
  }

  private async request<T>(
    path: string,
    params: Record<string, string>,
    requiresAuth: boolean
  ): Promise<T> {
    if (requiresAuth && !this.apiKey) {
      throw new OriznAuthError();
    }

    const url = new URL(path, this.baseUrl);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }

    const headers: Record<string, string> = {
      "Accept": "application/json",
      "User-Agent": "orizn-js/1.0.0",
    };
    if (this.apiKey) {
      headers["x-api-key"] = this.apiKey;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(url.toString(), {
        headers,
        signal: controller.signal,
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) throw new OriznAuthError();
        if (res.status === 429) throw new OriznRateLimitError();
        if (res.status === 404) {
          throw new OriznNotFoundError(
            params.passport ?? "?",
            params.destination ?? "?"
          );
        }
        throw new OriznError(
          `API error: ${res.status} ${res.statusText}`,
          res.status,
          "API_ERROR"
        );
      }

      return (await res.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }
}
