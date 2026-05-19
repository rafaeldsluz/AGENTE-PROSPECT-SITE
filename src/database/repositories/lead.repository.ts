import { eq, desc, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "../client.js";
import { leads, type Lead, type NewLead } from "../schema.js";
import { BusinessRawSchema } from "../../validation/business.schema.js";
import type { BusinessRaw, BusinessValidated, BusinessEnriched, LeadStatus } from "../../types/business.types.js";

export class LeadRepository {
  async findByPlaceId(placeId: string): Promise<Lead | null> {
    const rows = await db.select().from(leads).where(eq(leads.placeId, placeId)).limit(1);
    return rows[0] ?? null;
  }

  async findById(id: string): Promise<Lead | null> {
    const rows = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
    return rows[0] ?? null;
  }

  async existsByPlaceId(placeId: string): Promise<boolean> {
    const result = await db
      .select({ one: sql<number>`1` })
      .from(leads)
      .where(eq(leads.placeId, placeId))
      .limit(1);
    return result.length > 0;
  }

  /**
   * Validates and inserts a new lead.
   * Uses ON CONFLICT DO NOTHING to prevent TOCTOU race conditions
   * when multiple scrape jobs process the same location simultaneously.
   * Returns `created: false` when the lead already existed.
   */
  async upsertFromRaw(business: BusinessRaw): Promise<{ lead: Lead; created: boolean }> {
    const validated = BusinessRawSchema.parse(business);

    const newLead: NewLead = {
      id: randomUUID(),
      placeId: validated.placeId,
      name: validated.name,
      category: validated.category,
      address: validated.address,
      city: validated.city,
      phone: validated.phone,
      whatsapp: validated.whatsapp,
      website: validated.website,
      rating: validated.rating,
      reviewCount: validated.reviewCount,
      photos: validated.photos,
      logoUrl: validated.logoUrl,
      instagram: validated.instagram,
      facebook: validated.facebook,
      googleMapsUrl: validated.googleMapsUrl,
      status: "scraped",
      scrapedAt: validated.scrapedAt,
      updatedAt: new Date(),
    };

    const rows = await db.insert(leads).values(newLead).onConflictDoNothing().returning();

    if (rows[0]) {
      return { lead: rows[0], created: true };
    }

    // Conflict: lead with this placeId already exists
    const existing = await this.findByPlaceId(validated.placeId);
    if (!existing) throw new Error(`Conflito no insert mas lead não encontrado: ${validated.placeId}`);
    return { lead: existing, created: false };
  }

  async updateValidation(id: string, validated: BusinessValidated): Promise<void> {
    await db
      .update(leads)
      .set({
        hasOwnWebsite: validated.validation.hasOwnWebsite,
        websiteUrl: validated.validation.websiteUrl,
        websiteConfidence: validated.validation.confidence,
        validationReason: validated.validation.reason,
        validatedAt: validated.validation.checkedAt,
        status: validated.validation.hasOwnWebsite ? "disqualified" : "validated",
        updatedAt: new Date(),
      })
      .where(eq(leads.id, id));
  }

  async updateEnrichment(id: string, enriched: BusinessEnriched, status: LeadStatus = "scored"): Promise<void> {
    await db
      .update(leads)
      .set({
        niche: enriched.niche,
        nicheConfidence: enriched.nicheConfidence,
        score: enriched.score,
        scoreBreakdown: enriched.scoreBreakdown,
        status,
        updatedAt: new Date(),
      })
      .where(eq(leads.id, id));
  }

  async updateStatus(id: string, status: LeadStatus): Promise<void> {
    await db
      .update(leads)
      .set({ status, updatedAt: new Date() })
      .where(eq(leads.id, id));
  }

  async updatePagePath(id: string, pagePath: string): Promise<void> {
    await db
      .update(leads)
      .set({ pagePath, status: "page_generated", updatedAt: new Date() })
      .where(eq(leads.id, id));
  }

  async updateScreenshotPath(id: string, screenshotPath: string): Promise<void> {
    await db
      .update(leads)
      .set({ screenshotPath, status: "screenshot_ready", updatedAt: new Date() })
      .where(eq(leads.id, id));
  }

  async markDispatched(id: string): Promise<void> {
    await db
      .update(leads)
      .set({ status: "dispatched", dispatchedAt: new Date(), updatedAt: new Date() })
      .where(eq(leads.id, id));
  }

  async getReadyToDispatch(limit = 10): Promise<Lead[]> {
    return db
      .select()
      .from(leads)
      .where(eq(leads.status, "screenshot_ready"))
      .orderBy(desc(leads.score))
      .limit(limit);
  }

  async getValidatedNotScored(limit = 20): Promise<Lead[]> {
    return db.select().from(leads).where(eq(leads.status, "validated")).limit(limit);
  }

  async countByStatus(): Promise<Record<string, number>> {
    const rows = await db
      .select({ status: leads.status, count: sql<number>`count(*)` })
      .from(leads)
      .groupBy(leads.status);

    return Object.fromEntries(rows.map((r) => [r.status, Number(r.count)]));
  }
}

export const leadRepository = new LeadRepository();
