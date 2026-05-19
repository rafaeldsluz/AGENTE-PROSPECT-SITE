import { z } from "zod";
import type { BusinessRaw } from "../types/business.types.js";

// Runtime validation schema for data arriving from the Google Maps scraper.
// Acts as the trust boundary — data beyond this point is structurally sound.
export const BusinessRawSchema: z.ZodType<BusinessRaw> = z.object({
  placeId: z.string().min(1).max(2000),
  name: z.string().min(1).max(500),
  category: z.string().max(200),
  address: z.string().max(500),
  city: z.string().min(1).max(200),
  phone: z.string().max(50).nullable(),
  whatsapp: z.string().max(50).nullable(),
  website: z.string().max(5000).nullable(),
  rating: z.number().min(0).max(5).nullable(),
  reviewCount: z.number().int().min(0).nullable(),
  photos: z.array(z.string().max(5000)).max(20),
  logoUrl: z.string().max(5000).nullable(),
  instagram: z.string().max(2000).nullable(),
  facebook: z.string().max(2000).nullable(),
  googleMapsUrl: z.string().min(1).max(10000),
  scrapedAt: z.date(),
});

export type ValidatedBusinessRaw = z.infer<typeof BusinessRawSchema>;
