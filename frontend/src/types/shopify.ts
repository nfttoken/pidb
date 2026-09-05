export type ShopifyJobStatus = "pending" | "processing" | "succeeded" | "failed";

export type ShopifyJob = {
  id: string;
  job_type: string;
  product_id: string;
  status: ShopifyJobStatus;
  attempts: number;
  max_attempts: number;
  available_at: string;
  started_at: string | null;
  completed_at: string | null;
  last_error: string | null;
  idempotency_key: string;
};

export type ShopifyMapping = {
  product_id: string;
  shopify_product_id: string | null;
  shopify_handle: string | null;
  sync_status: string;
  last_sync_at: string | null;
  last_sync_hash: string | null;
  last_error: string | null;
};

export type SyncLog = {
  id: string;
  product_id: string;
  shopify_product_id: string | null;
  action: string;
  attempt: number;
  status: string;
  error_code: string | null;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
};

export type ShopifySyncStatus = {
  product_id: string;
  mapping: ShopifyMapping | null;
  jobs: ShopifyJob[];
  logs: SyncLog[];
};
