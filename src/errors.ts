/** Where a developer gets a free key (100 req/month, no credit card). */
export const SIGNUP_URL = "https://visa.orizn.app/visa-api";
/** Where an existing account checks/regenerates its key. */
export const DASHBOARD_URL = "https://visa.orizn.app/visa-api/dashboard";
/** Direct checkout for the Starter plan ($49/mo, 30,000 req/month). */
export const UPGRADE_URL =
  "https://visa.orizn.app/visa-api/login?next=%2Fvisa-api%2Fdashboard%2Fbilling%3Fplan%3Dstarter%26source%3Djs";

export class OriznError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string,
    /** Raw `error`/`message` string returned by the API, when there was one. */
    public serverMessage?: string
  ) {
    super(message);
    this.name = "OriznError";
  }
}

/** 401 — no API key was sent (or none configured). */
export class OriznAuthError extends OriznError {
  constructor(serverMessage?: string) {
    super(
      [
        "No API key. Every Orizn endpoint except stats() needs one.",
        `  1. Get a free key in 10s (100 req/month, no credit card): ${SIGNUP_URL}`,
        '  2. export ORIZN_API_KEY=orizn_visa_...   (or: new Orizn({ apiKey: "orizn_visa_..." }))',
        serverMessage ? `  API said: ${serverMessage}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      401,
      "AUTH_REQUIRED",
      serverMessage
    );
    this.name = "OriznAuthError";
  }
}

/** 403 — the key was sent but the API rejected it (unknown or deactivated). */
export class OriznInvalidKeyError extends OriznError {
  constructor(serverMessage?: string) {
    super(
      [
        `API key rejected: ${serverMessage || "invalid or inactive"}.`,
        `  Check the key on your dashboard: ${DASHBOARD_URL}`,
        `  Or create a new free one: ${SIGNUP_URL}`,
      ].join("\n"),
      403,
      "INVALID_KEY",
      serverMessage
    );
    this.name = "OriznInvalidKeyError";
  }
}

/** 403 — valid key, but the current plan does not include this endpoint. */
export class OriznPlanError extends OriznError {
  constructor(serverMessage?: string) {
    super(
      [
        serverMessage || "Your plan does not include this endpoint.",
        `  Starter is $49/month for 30,000 requests: ${UPGRADE_URL}`,
      ].join("\n"),
      403,
      "PLAN_REQUIRED",
      serverMessage
    );
    this.name = "OriznPlanError";
  }
}

/** 429 — monthly quota exhausted, or an anti-abuse daily cap was hit. */
export class OriznRateLimitError extends OriznError {
  constructor(
    serverMessage?: string,
    /** Seconds to wait, from the `Retry-After` header, when the API sent one. */
    public retryAfterSeconds?: number
  ) {
    super(
      [
        serverMessage || "Monthly request quota exhausted.",
        "  Free plan = 100 requests/month (5 until you confirm your email).",
        // The server's 429 may already carry the price and checkout link.
        /https?:\/\//.test(serverMessage || "")
          ? ""
          : `  Starter is $49/month for 30,000 requests: ${UPGRADE_URL}`,
      ]
        .filter(Boolean)
        .join("\n"),
      429,
      "RATE_LIMIT",
      serverMessage
    );
    this.name = "OriznRateLimitError";
  }
}

/** 404 — no data for that passport → destination pair. */
export class OriznNotFoundError extends OriznError {
  constructor(passport: string, destination: string, serverMessage?: string) {
    super(
      `No visa data for ${passport} -> ${destination}. Both must be ISO 3166-1 alpha-3 codes (FRA, JPN, USA).`,
      404,
      "NOT_FOUND",
      serverMessage
    );
    this.name = "OriznNotFoundError";
  }
}

/** 400 — bad parameters, caught locally or reported by the API. */
export class OriznBadRequestError extends OriznError {
  constructor(serverMessage: string) {
    super(serverMessage, 400, "BAD_REQUEST", serverMessage);
    this.name = "OriznBadRequestError";
  }
}

/**
 * Maps an HTTP status + parsed error body to the right error class.
 * 403 is overloaded server-side (bad key vs. plan gate) — the message
 * discriminates: plan gates always name the plan.
 */
export function errorFromResponse(
  status: number,
  serverMessage: string | undefined,
  ctx: { passport?: string; destination?: string; retryAfterSeconds?: number }
): OriznError {
  switch (status) {
    case 400:
      return new OriznBadRequestError(serverMessage || "Bad request");
    case 401:
      return new OriznAuthError(serverMessage);
    case 403:
      return /plan/i.test(serverMessage || "")
        ? new OriznPlanError(serverMessage)
        : new OriznInvalidKeyError(serverMessage);
    case 404:
      return new OriznNotFoundError(
        ctx.passport || "?",
        ctx.destination || "?",
        serverMessage
      );
    case 429:
      return new OriznRateLimitError(serverMessage, ctx.retryAfterSeconds);
    default:
      return new OriznError(
        serverMessage || `API error ${status}`,
        status,
        "API_ERROR",
        serverMessage
      );
  }
}
