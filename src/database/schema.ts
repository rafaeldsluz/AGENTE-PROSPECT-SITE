import {
  pgTable,
  text,
  integer,
  real,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const nicheEnum = pgEnum("niche", [
  "oficina",
  "clinica",
  "restaurante",
  "academia",
  "imoveis",
  "estetica",
  "loja",
  "servicos",
  "advogado",
  "outros",
]);

export const leadStatusEnum = pgEnum("lead_status", [
  "scraped",
  "validated",
  "scored",
  "page_generated",
  "screenshot_ready",
  "dispatched",
  "replied",
  "disqualified",
]);

export const leads = pgTable(
  "leads",
  {
    id: text("id").primaryKey(),
    placeId: text("place_id").notNull(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    address: text("address").notNull(),
    city: text("city").notNull(),
    phone: text("phone"),
    whatsapp: text("whatsapp"),
    website: text("website"),
    rating: real("rating"),
    reviewCount: integer("review_count"),
    photos: jsonb("photos").$type<string[]>().default([]),
    logoUrl: text("logo_url"),
    instagram: text("instagram"),
    facebook: text("facebook"),
    googleMapsUrl: text("google_maps_url").notNull(),

    // Validação
    hasOwnWebsite: boolean("has_own_website"),
    websiteUrl: text("website_url"),
    websiteConfidence: real("website_confidence"),
    validationReason: text("validation_reason"),

    // Classificação
    niche: nicheEnum("niche"),
    nicheConfidence: real("niche_confidence"),

    // Score
    score: real("score"),
    scoreBreakdown: jsonb("score_breakdown"),

    // Pipeline
    status: leadStatusEnum("status").default("scraped").notNull(),
    pagePath: text("page_path"),
    screenshotPath: text("screenshot_path"),

    // Timestamps
    scrapedAt: timestamp("scraped_at").defaultNow().notNull(),
    validatedAt: timestamp("validated_at"),
    dispatchedAt: timestamp("dispatched_at"),
    repliedAt: timestamp("replied_at"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    placeIdIdx: uniqueIndex("leads_place_id_idx").on(t.placeId),
    statusIdx: index("leads_status_idx").on(t.status),
    cityIdx: index("leads_city_idx").on(t.city),
    scoreIdx: index("leads_score_idx").on(t.score),
  })
);

export const dispatches = pgTable(
  "dispatches",
  {
    id: text("id").primaryKey(),
    leadId: text("lead_id")
      .notNull()
      .references(() => leads.id),
    whatsapp: text("whatsapp").notNull(),
    message: text("message").notNull(),
    screenshotPath: text("screenshot_path"),
    sentAt: timestamp("sent_at").defaultNow().notNull(),
    evolutionMessageId: text("evolution_message_id"),
    status: text("status").default("sent").notNull(),
    errorMessage: text("error_message"),
  },
  (t) => ({
    leadIdIdx: index("dispatches_lead_id_idx").on(t.leadId),
    sentAtIdx: index("dispatches_sent_at_idx").on(t.sentAt),
  })
);

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type Dispatch = typeof dispatches.$inferSelect;
export type NewDispatch = typeof dispatches.$inferInsert;
