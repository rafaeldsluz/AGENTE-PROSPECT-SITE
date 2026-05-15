export interface ScrapeJobData {
  city: string;
  niche: string;
  searchQuery: string;
  maxResults: number;
}

export interface PipelineJobData {
  leadId: string;
  placeId: string;
}

export interface DispatchJobData {
  leadId: string;
  whatsapp: string;
  companyName: string;
  screenshotPath: string;
  message: string;
}

export type QueueName =
  | "scrape"
  | "pipeline"
  | "dispatch";
