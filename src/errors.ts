export class OriznError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string
  ) {
    super(message);
    this.name = "OriznError";
  }
}

export class OriznAuthError extends OriznError {
  constructor(message = "API key required. Get one free at https://visa.orizn.app") {
    super(message, 401, "AUTH_REQUIRED");
    this.name = "OriznAuthError";
  }
}

export class OriznRateLimitError extends OriznError {
  constructor(message = "Rate limit exceeded. Upgrade at https://visa.orizn.app") {
    super(message, 429, "RATE_LIMIT");
    this.name = "OriznRateLimitError";
  }
}

export class OriznNotFoundError extends OriznError {
  constructor(passport: string, destination: string) {
    super(
      `No visa data found for ${passport} → ${destination}`,
      404,
      "NOT_FOUND"
    );
    this.name = "OriznNotFoundError";
  }
}
