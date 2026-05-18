import { eq, and, gte, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "../client.js";
import { dispatches, type Dispatch, type NewDispatch } from "../schema.js";

export class DispatchRepository {
  async create(data: Omit<NewDispatch, "id" | "sentAt">): Promise<Dispatch> {
    const newDispatch: NewDispatch = {
      id: randomUUID(),
      ...data,
      sentAt: new Date(),
    };

    const rows = await db.insert(dispatches).values(newDispatch).returning();
    const row = rows[0];
    if (!row) throw new Error("Falha ao inserir dispatch");
    return row;
  }

  async countDispatchedInLastHour(): Promise<number> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(dispatches)
      .where(
        and(
          eq(dispatches.status, "sent"),
          gte(dispatches.sentAt, oneHourAgo)
        )
      );
    return Number(result[0]?.count ?? 0);
  }

  async hasDispatchedToLead(leadId: string): Promise<boolean> {
    const result = await db
      .select({ one: sql<number>`1` })
      .from(dispatches)
      .where(eq(dispatches.leadId, leadId))
      .limit(1);
    return result.length > 0;
  }

  async updateStatus(id: string, status: string, errorMessage?: string): Promise<void> {
    await db
      .update(dispatches)
      .set({ status, errorMessage })
      .where(eq(dispatches.id, id));
  }
}

export const dispatchRepository = new DispatchRepository();
