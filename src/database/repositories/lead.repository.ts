import { eq, and, isNull, desc, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "../client.js";
import { leads, type Lead, type NewLead } from "../schema.js";
import type { BusinessRaw, BusinessValidated, BusinessEnriched, LeadStatus } from "../../types/business.types.js";

export class LeadRepository {
  async findByPlaceId(placeId: string): Promise<Lead | null> {
    const rows = await db.select().from(leads).where(eq(leads.placeId, placeId)).limit(1);
    return rows[0] ?? null;
  }

  async existsByPlaceId(placeId: string): Promise<boolean> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(eq(leads.placeId, placeId));
    return (result[0]?.count ?? 0) > 0;
  }

  async createFromRaw(business: BusinessRaw): Promise<Lead> {
    const newLead: NewLead = {
      id: randomUUID(),
      placeId: business.placeId,
      name: business.name,
      category: business.category,
      address: business.address,
      city: business.city,
      phone: business.phone,
      whatsapp: business.whatsapp,
      website: business.website,
      rating: business.rating,
      reviewCount: business.reviewCount,
      photos: business.photos,
      logoUrl: business.logoUrl,
      instagram: business.instagram,
      facebook: business.facebook,
      googleMapsUrl: business.googleMapsUrl,
      status: "scraped",
      scrapedAt: business.scrapedAt,
      updatedAt: new Date(),
    };

    const rows = await db.insert(leads).values(newLead).returning();
    const row = rows[0];
    if (!row) throw new Error("Falha ao inserir lead");
    return row;
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

  async updateEnrichment(id: string, enriched: BusinessEnriched): Promise<void> {
    await db
      .update(leads)
      .set({
        niche: enriched.niche,
        nicheConfidence: enriched.nicheConfidence,
        score: enriched.score,
        scoreBreakdown: enriched.scoreBreakdown,
        status: "scored",
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
      .where(
        and(
          eq(leads.status, "screenshot_ready"),
          isNull(leads.dispatchedAt)
        )
      )
      .orderBy(desc(leads.score))
      .limit(limit);
  }

  async getValidatedNotScored(limit = 20): Promise<Lead[]> {
    return db
      .select()
      .from(leads)
      .where(eq(leads.status, "validated"))
      .limit(limit);
  }

  async countByStatus(): Promise<Record<string, number>> {
    const rows = await db
      .select({
        status: leads.status,
        count: sql<number>`count(*)`,
      })
      .from(leads)
      .groupBy(leads.status);

    return Object.fromEntries(rows.map((r) => [r.status, Number(r.count)]));
  }

  async findById(id: string): Promise<Lead | null> {
    const rows = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
    return rows[0] ?? null;
  }
}

export const leadRepository = new LeadRepository();
