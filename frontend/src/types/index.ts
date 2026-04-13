// ── Suggestion + Geo types ──

export interface GeoData {
  city: string;
  region: string;
  country: string;
}

export interface RoleSuggestionsResponse {
  roles: string[];
}

export interface CitySuggestionsResponse {
  cities: string[];
}

export interface TaskSuggestionsResponse {
  tasks: string[];
}

// ── Existing types (unchanged) ──

export interface EstimateRequest {
  role: string;
  location: string;
  company_size: string;
  company_name: string;
  tasks: string[];
  ai_usage: number;
}

export interface FeedRequest {
  role: string;
  location: string;
  company_size: string;
  tasks: string[];
}

export interface Factor {
  name: string;
  value: number;
}

export interface Tip {
  icon: string;
  title: string;
  text: string;
}

export interface OccupationMatch {
  soc_code: string;
  title: string;
  matched: boolean;
}

export interface DataSources {
  eloundou_alpha: number | null;
  eloundou_beta: number | null;
  eloundou_score: number;
  eloundou_available: boolean;
  aioe_raw: number | null;
  aioe_normalized: number;
  aioe_available: boolean;
  task_exposure: number | null;
  tasks_analyzed: number;
  company_modifier: number;
  ai_usage_modifier: number;
  bls_employment_national: number | null;
  bls_median_wage_national: number | null;
  final_exposure: number;
}

export interface EstimateResponse {
  years: number;
  risk: string;
  description: string;
  factors: Factor[];
  tips: Tip[];
  occupation?: OccupationMatch | null;
  data_sources?: DataSources | null;
}

export interface FeedItem {
  type: "news" | "social" | "research";
  title: string;
  source: string;
  url: string;
  time: string;
  tag: string;
}

export interface FeedResponse {
  items: FeedItem[];
}

export interface UserProfile {
  role: string;
  location: string;
  companySize: string;
  companyName: string;
  tasks: string[];
  aiUsage: number;
}
