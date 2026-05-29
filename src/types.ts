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

export interface TransitHub {
  airport: string;
  city: string;
  transit_visa_required: boolean;
  transit_free_hours: number;
  conditions?: string;
}

export interface TransitVisa {
  hubs?: TransitHub[];
}

export interface VisaFee {
  single_entry?: { amount: number; currency: string };
  multiple_entry?: { amount: number; currency: string };
}

export interface ProcessingDays {
  standard?: number;
  express?: number;
  rush?: number;
}

export interface PhotoSpecs {
  width_mm?: number;
  height_mm?: number;
  background?: string;
  glasses_allowed?: boolean;
  head_covering_allowed?: string;
}

export interface InsuranceRequired {
  required?: boolean;
  min_coverage?: number;
  currency?: string;
}

export interface MinorRules {
  solo_travel_min_age?: number;
  single_parent_letter_required?: boolean;
  notarized_consent_required?: boolean;
}

export interface OverstayPenalty {
  fine_per_day?: string;
  ban_days?: number;
  criminal?: boolean;
  details?: string;
}

export interface EntryByMode {
  air?: number;
  land?: number;
  sea?: number;
}

export interface RemoteWorkVisa {
  available?: boolean;
  duration_months?: number;
  fee?: { amount: number; currency: string };
  requirements?: string[];
}

export interface ExtensionRules {
  possible?: boolean;
  max_days?: number;
  fee?: string;
  where?: string;
  notes?: string;
}

export interface ReciprocityChange {
  date: string;
  from: string;
  to: string;
  note?: string;
}

export interface SafetyInfo {
  level?: number;
  advisory?: string;
  source?: string;
  updated_at?: string;
}

export interface HealthRequirements {
  covid_test?: boolean;
  vaccination_proof?: boolean;
  health_declaration?: boolean;
  quarantine_days?: number;
  ebola_screening?: boolean;
}

export interface EmbassyInfo {
  name?: string;
  address?: string;
  city?: string;
  phone?: string;
  emergency_phone?: string;
  email?: string;
  website?: string;
}

export interface EmbassyData {
  /** Your country's embassy at the destination (emergency help) */
  your_embassy_at_destination?: EmbassyInfo;
  /** Destination country's embassy in your country (where to apply for visa) */
  visa_application_embassy?: EmbassyInfo;
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
  embassy?: EmbassyData;
  tips: string[];
  country_info: CountryInfo;
  verified: boolean;

  // Extended intelligence
  transit_visa?: TransitVisa;
  passport_validity_months?: number | null;
  visa_fee?: VisaFee;
  processing_days?: ProcessingDays;
  photo_specs?: PhotoSpecs;
  vaccinations_required?: string[];
  insurance_required?: InsuranceRequired;
  dual_nationality_warnings?: string[];
  stamp_warnings?: string[];
  minor_rules?: MinorRules;
  overstay_penalty?: OverstayPenalty;
  entry_by_mode?: EntryByMode;
  remote_work_visa?: RemoteWorkVisa;
  extension_rules?: ExtensionRules;
  reciprocity_history?: ReciprocityChange[];
  safety?: SafetyInfo;
  best_apply_period?: string | null;
  health_requirements?: HealthRequirements;
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
