import type { Niche } from "./business.types.js";

export interface ServiceItem {
  icon: string;
  name: string;
  description: string;
}

export interface Testimonial {
  author: string;
  rating: number;
  text: string;
}

export interface TemplateData {
  companyName: string;
  niche: Niche;
  phone: string;
  whatsapp: string;
  address: string;
  city: string;
  logoUrl: string | null;
  heroHeadline: string;
  heroSubtitle: string;
  ctaText: string;
  services: ServiceItem[];
  differentials: string[];
  testimonials: Testimonial[];
  primaryColor: string;
  accentColor: string;
  instagram: string | null;
  facebook: string | null;
  rating?: number | null;
  reviewCount?: number | null;
}

export interface RenderedPage {
  html: string;
  filePath: string;
  companyName: string;
  niche: Niche;
}

export interface TemplateVariant {
  id: string;
  niche: Niche;
  label: string;
  render: (data: TemplateData) => string;
}
