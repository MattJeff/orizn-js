export type VisaRequirement =
  | "visa_free"
  | "visa_required"
  | "e_visa"
  | "visa_on_arrival"
  | "eta"
  | "no_admission";

export type Language =
  | "en" | "fr" | "es" | "pt" | "de"
  | "ja" | "ko" | "zh" | "ru" | "it"
  | "ar" | "hi" | "th" | "vi" | "tl";

export interface CountryInfo {
  currency: string;
  language: string;
  timezone: string;
  capital: string;
}

export interface VisaData {
  passport: string;
  destination: string;
  requirement: VisaRequirement;
  visa_free_days: number | null;
  visa_required: boolean;
  description: string;
  documents_required: string[];
  process: string[];
  tips: string[];
  country_info: CountryInfo;
  verified: boolean;
}

export interface VisaCheckResult {
  passport: string;
  destination: string;
  requirement: VisaRequirement;
  visa_free_days: number | null;
  visa_required: boolean;
}

export interface VisaResponse {
  data: VisaData;
  meta: {
    lang: string;
    api_version: string;
    coverage: string;
    languages: number;
  };
}

export interface VisaCheckResponse {
  data: VisaCheckResult;
}

export interface CoverageStats {
  coverage: {
    visa_details: number;
    passports: number;
    destinations: number;
    languages: number;
  };
  supported_languages: Array<{ code: string; name: string }>;
}

export interface VisaChange {
  passport: string;
  destination: string;
  old_requirement: VisaRequirement;
  new_requirement: VisaRequirement;
  changed_at: string;
}

export interface OriznConfig {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
}
