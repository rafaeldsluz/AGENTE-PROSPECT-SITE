import { db } from "../client.js";
import { messageTemplates } from "../schema.js";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import type { Niche } from "../../types/business.types.js";

export const messageTemplateRepository = {
  async getForNiche(niche: Niche): Promise<string | null> {
    const [specific] = await db
      .select({ template: messageTemplates.template })
      .from(messageTemplates)
      .where(eq(messageTemplates.niche, niche))
      .limit(1);
    if (specific) return specific.template;

    const [global] = await db
      .select({ template: messageTemplates.template })
      .from(messageTemplates)
      .where(eq(messageTemplates.niche, "global"))
      .limit(1);
    return global?.template ?? null;
  },

  async upsert(niche: string, template: string): Promise<void> {
    await db
      .insert(messageTemplates)
      .values({ id: randomUUID(), niche, template, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: messageTemplates.niche,
        set: { template, updatedAt: new Date() },
      });
  },

  async deleteByNiche(niche: string): Promise<void> {
    await db.delete(messageTemplates).where(eq(messageTemplates.niche, niche));
  },

  async getAll(): Promise<Array<{ niche: string; template: string; updatedAt: Date }>> {
    return db
      .select({
        niche: messageTemplates.niche,
        template: messageTemplates.template,
        updatedAt: messageTemplates.updatedAt,
      })
      .from(messageTemplates);
  },
};
