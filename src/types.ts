/** The six canonical requirement values. */
export type CanonicalRequirement =
  | "visa_free"
  | "visa_required"
  | "e_visa"
  | "visa_on_arrival"
  | "eta"
  | "no_admission";

/**
 * Ten distinct values in the current dataset, none with spaces or hyphens.
 * 33 of the 40,027 pairs sit outside the six common ones (not_applicable,
 * partial_restrictions, admission_refused, special).
 * legacy spelling ("visa free", "e-visa", "partial restrictions"), so this is
 * deliberately NOT a closed union — run it through {@link normalizeRequirement}
 * before comparing.
 */
export type VisaRequirement = CanonicalRequirement | (string & {});

/** Maps every legacy spelling seen in the dataset to a canonical value. */
export function normalizeRequirement(raw: string | null | undefined): CanonicalRequirement | "unknown" {
  const r = String(raw ?? "").toLowerCase().trim().replace(/[\s-]+/g, "_");
  switch (r) {
    case "visa_free":
    case "freedom_of_movement":
      return "visa_free";
    case "visa_required":
    case "partial_restrictions":
      return "visa_required";
    case "e_visa":
      return "e_visa";
    case "visa_on_arrival":
      return "visa_on_arrival";
    case "eta":
      return "eta";
    case "no_admission":
    case "admission_refused":
      return "no_admission";
    default:
      return "unknown";
  }
}

/** The 15 languages, all available on every plan including free. */
export const LANGUAGES = [
  "en", "fr", "es", "pt", "de", "it", "ja", "ko",
  "zh", "ru", "ar", "hi", "th", "vi", "tl",
] as const;

export type Language = (typeof LANGUAGES)[number];

/**
 * Fields the API replaces with an upgrade notice on lower plans.
 * Narrow with {@link isUpgradeNotice} before reading the data.
 */
export type Gated<T> = T | UpgradeNotice;

export interface UpgradeNotice {
  upgrade: string;
}

export function isUpgradeNotice(value: unknown): value is UpgradeNotice {
  return typeof value === "object" && value !== null && typeof (value as UpgradeNotice).upgrade === "string";
}

/**
 * Several fields come straight from JSONB columns and carry extra keys
 * (`notes`, `details`, `source`, …) that vary by country. The documented keys
 * are typed; the index signature keeps the rest reachable instead of lying.
 */
export interface Extensible {
  [key: string]: unknown;
}

export interface CountryInfo {
  currency: string;
  language: string;
  timezone: string;
  capital: string;
}

export interface TransitHub extends Extensible {
  airport_code?: string;
  city?: string;
  default_transit_free_hours?: number;
  notes?: string;
}

export interface TransitVisa extends Extensible {
  hubs?: TransitHub[];
}

export interface Money {
  amount: number;
  currency: string;
}

export interface VisaFee extends Extensible {
  single_entry?: Money;
  multiple_entry?: Money;
}

export interface ProcessingDays extends Extensible {
  standard?: number;
  express?: number;
  rush?: number;
}

export interface PhotoSpecs extends Extensible {
  width_mm?: number;
  height_mm?: number;
  background?: string;
  glasses_allowed?: boolean;
  head_covering_allowed?: string;
  notes?: string;
}

export interface InsuranceRequired extends Extensible {
  required?: boolean;
  min_coverage?: number;
  currency?: string;
  notes?: string;
}

export interface MinorRules extends Extensible {
  solo_travel_min_age?: number | null;
  single_parent_letter_required?: boolean;
  notarized_consent_required?: boolean;
  both_parents_consent?: boolean;
  documents_needed?: string[];
  details?: string;
}

export interface OverstayPenalty extends Extensible {
  fine_per_day?: string | null;
  max_fine?: string;
  /** Ban length in days, keyed by scenario (`deportation_first_offense`, …). */
  ban_duration?: Record<string, number>;
  criminal?: boolean;
  detention_possible?: boolean;
  details?: string;
}

/** Stay rules per arrival mode — each mode is an object, not a day count. */
export interface EntryByMode extends Extensible {
  air?: Extensible & { visa_free_days?: number };
  land?: Extensible & { visa_free_days?: number };
  sea?: Extensible & { visa_free_days?: number };
  differences_exist?: boolean;
  notes?: string;
}

export interface RemoteWorkVisa extends Extensible {
  available?: boolean;
  visa_name?: string;
  duration_months?: number;
  renewable?: boolean;
  fee?: Money;
  requirements?: string[];
  url?: string;
}

export interface ExtensionRules extends Extensible {
  extension_possible?: boolean;
  max_extension_days?: number;
  fee?: string;
  where?: string;
  processing_time?: string;
  documents_needed?: string[];
  notes?: string;
}

export interface ReciprocityChange extends Extensible {
  date: string;
  from: string;
  to: string;
  note?: string;
  duration_days?: number;
}

/** Wrapper object — the changes live under `.changes`. */
export interface ReciprocityHistory extends Extensible {
  changes?: ReciprocityChange[];
  destination_iso3?: string;
}

export interface SafetyInfo extends Extensible {
  level?: number;
  advisory?: string;
  details?: string;
  source?: string;
  updated_at?: string;
}

export interface HealthRequirements extends Extensible {
  covid_test_required?: boolean;
  vaccination_proof_required?: boolean;
  health_declaration_required?: boolean;
  yellow_fever_certificate?: boolean;
  quarantine_days?: number;
  ebola_screening?: boolean;
  mpox_screening?: boolean;
  additional_requirements?: string[];
}

export interface EmbassyInfo extends Extensible {
  name?: string;
  type?: string;
  address?: string;
  city?: string;
  phone?: string;
  emergency_phone?: string;
  email?: string;
  website?: string;
  consular_services?: boolean;
}

/** Usually a list per direction; older rows may hold a single object. */
export type EmbassyList = EmbassyInfo[] | EmbassyInfo;

export interface EmbassyData {
  /** Your country's embassy/consulates at the destination (emergency help). */
  your_embassy_at_destination?: EmbassyList;
  /** Destination's embassy in your country (where you apply). */
  visa_application_embassy?: EmbassyList;
}

/** Visa category. Keys come from the source dataset and are French. */
export interface VisaType extends Extensible {
  nom?: string;
  cout?: string;
  duree?: string;
  description?: string;
}

/** Full record from `getVisa()`. Gated fields depend on the plan. */
export interface VisaData {
  passport: string;
  destination: string;
  requirement: VisaRequirement;
  visa_free_days: number | null;
  visa_required: boolean;
  description: string;
  documents_required: string[];
  process: string[];
  /** `[]` on the free plan. */
  visa_types: VisaType[];
  extension: Extensible;
  processing_time: string | null;
  cost: string | null;
  validity: string | null;
  max_stay: string | null;
  /** Pro plan and above; an upgrade notice below it. */
  embassy: Gated<EmbassyData>;
  /** A single upgrade line instead of tips on the free plan. */
  tips: string[];
  country_info: CountryInfo;
  verified: boolean;
  source: string;

  // Extended intelligence — data on paid plans, `{ upgrade }` on free.
  transit_visa: Gated<TransitVisa>;
  /** Never gated. */
  passport_validity_months: number | null;
  visa_fee: Gated<VisaFee>;
  processing_days: Gated<ProcessingDays>;
  photo_specs: Gated<PhotoSpecs>;
  vaccinations_required: Gated<string[]>;
  insurance_required: Gated<InsuranceRequired>;
  dual_nationality_warnings: Gated<string[]>;
  stamp_warnings: Gated<string[]>;
  minor_rules: Gated<MinorRules>;
  overstay_penalty: Gated<OverstayPenalty>;
  entry_by_mode: Gated<EntryByMode>;
  /** Pro plan and above. */
  remote_work_visa: Gated<RemoteWorkVisa>;
  extension_rules: Gated<ExtensionRules>;
  /** Pro plan and above. */
  reciprocity_history: Gated<ReciprocityHistory>;
  /** Never gated. */
  safety: SafetyInfo;
  best_apply_period: Gated<string | null>;
  health_requirements: Gated<HealthRequirements>;
}

export interface VisaResponse {
  data: VisaData;
  meta: {
    lang: string;
    api_version: string;
    coverage: string;
    languages: number;
    powered_by?: string;
  };
}

/** Affiliate link, present only on keyless (widget/demo) calls. */
export interface PartnerLink extends Extensible {
  url: string;
  label?: string;
  partner?: string;
}

/** Flat payload from `check()` — no `data` wrapper. */
export interface VisaCheckResult {
  passport: string;
  destination: string;
  requirement: VisaRequirement;
  visa_free_days: number | null;
  visa_required: boolean;
  /** Date the pair was last verified, or null when unknown. Never fabricated. */
  last_verified: string | null;
  partner_links?: PartnerLink[];
  partner_disclosure?: string;
}

/** One destination from `bulk()` — a subset of {@link VisaData}. */
export interface BulkDestination {
  destination: string;
  requirement: VisaRequirement;
  visa_free_days: number | null;
  description: string;
  passport_validity_months: number | null;
  visa_fee: VisaFee;
  safety: SafetyInfo;
  health_requirements: HealthRequirements;
  vaccinations_required: string[];
  insurance_required: InsuranceRequired;
  entry_by_mode: EntryByMode;
  remote_work_visa: RemoteWorkVisa;
}

export interface BulkResponse {
  passport: string;
  lang: string;
  total: number;
  destinations: BulkDestination[];
}

export interface CoverageStats {
  coverage: {
    visa_details: number;
    passports: number;
    destinations: number;
    passport_index_pairs: number;
    translations: number;
    languages: number;
  };
  supported_languages: Array<{ code: string; name: string }>;
  /** Raw counts per requirement string, legacy spellings included. */
  requirement_distribution: Record<string, number>;
  api_version: string;
  docs: string;
}

export interface OriznConfig {
  /** Defaults to `process.env.ORIZN_API_KEY` when running on Node. */
  apiKey?: string;
  baseUrl?: string;
  /** Request timeout in ms (default 10000). */
  timeout?: number;
  /**
   * Widget identifier for Orizn's own keyless surfaces (@orizn/react).
   * Not a way around signing up: keyless calls are capped at 30/day/IP and
   * only reach `check()`.
   */
  source?: string;
}
