export type Niche =
  | "oficina"
  | "clinica"
  | "restaurante"
  | "academia"
  | "imoveis"
  | "estetica"
  | "loja"
  | "servicos"
  | "advogado"
  | "outros";

export type LeadStatus =
  | "scraped"
  | "validated"
  | "scored"
  | "page_generated"
  | "screenshot_ready"
  | "dispatched"
  | "replied"
  | "disqualified";

export interface BusinessRaw {
  placeId: string;
  name: string;
  category: string;
  address: string;
  city: string;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  rating: number | null;
  reviewCount: number | null;
  photos: string[];
  logoUrl: string | null;
  instagram: string | null;
  facebook: string | null;
  googleMapsUrl: string;
  scrapedAt: Date;
}

export interface WebsiteValidationResult {
  hasOwnWebsite: boolean;
  websiteUrl: string | null;
  confidence: number;
  reason: string;
  checkedAt: Date;
}

export interface BusinessValidated extends BusinessRaw {
  validation: WebsiteValidationResult;
}

export interface ScoreBreakdown {
  hasWhatsApp: number;
  reviewCount: number;
  rating: number;
  photoCount: number;
  hasInstagram: number;
  hasLogo: number;
  categoryRelevance: number;
  instagramOnly: number;
}

export interface BusinessEnriched extends BusinessValidated {
  niche: Niche;
  nicheConfidence: number;
  score: number;
  scoreBreakdown: ScoreBreakdown;
}
