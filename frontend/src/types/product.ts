export type ProductListItem = {
  id: string;
  product_code: string;
  product_name_en: string;
  brand_name: string;
  product_type_name: string;
  status: string;
  compliance_status: "pending" | "reviewing" | "approved" | "blocked" | null;
};

export type ProductListResponse = {
  items: ProductListItem[];
  total: number;
  offset: number;
  limit: number;
};

export type PriceSuggestionStatus = "pending" | "reviewing" | "approved" | "blocked";

import type { Brand, Ingredient, ProductType, Taxonomy } from "./catalog";

export type Sku = {
  id: string;
  product_id: string;
  sku: string;
  barcode: string | null;
  variant_name_en: string | null;
  variant_name_zh: string | null;
  net_quantity: number | null;
  quantity_unit: string | null;
  suggested_price: number | null;
  suggested_price_currency: string;
  suggested_price_status: PriceSuggestionStatus;
  suggested_price_note: string | null;
  suggested_price_reviewed_at: string | null;
  suggested_price_reviewed_by: string | null;
  status: string;
};

export type ProductImage = {
  id: string;
  product_id: string;
  image_url: string;
  image_type: string;
  sort_order: number;
  alt_text_en: string | null;
  alt_text_zh: string | null;
  status: string;
};

export type ProductCanada = {
  id: string;
  product_id: string;
  importer_name: string | null;
  distributor_name: string | null;
  canadian_label_status: string;
  cosmetic_notification_status: string;
  compliance_status: "pending" | "reviewing" | "approved" | "blocked";
  notes: string | null;
  reviewed_at: string | null;
};

export type Product = {
  id: string;
  product_code: string;
  original_language: string;
  original_name: string;
  product_name_en: string;
  product_name_zh: string | null;
  description_en: string | null;
  description_zh: string | null;
  how_to_use_en: string | null;
  how_to_use_zh: string | null;
  warnings_en: string | null;
  warnings_zh: string | null;
  country_of_origin: string | null;
  source_inci: string | null;
  attributes: Record<string, unknown>;
  status: string;
  brand: Brand;
  product_type: ProductType;
  skus: Sku[];
  skin_types: Taxonomy[];
  skin_concerns: Taxonomy[];
  ingredients: ProductIngredient[];
  images: ProductImage[];
  canada: ProductCanada | null;
  claims: ProductClaim[];
};

export type ProductIngredient = {
  ingredient: Ingredient;
  position: number | null;
  is_key_ingredient: boolean;
};

export type ProductClaim = {
  id: string;
  product_id: string;
  claim_type: string;
  claim_text_en: string;
  claim_text_zh: string | null;
  sort_order: number;
  status: string;
};

export type ReadinessCheck = { key: string; label: string; passed: boolean; weight: number; detail: string | null };
export type ProductReadiness = { product_id: string; score: number; ready: boolean; checks: ReadinessCheck[]; blockers: string[] };

export type ProductCreatePayload = {
  product_code: string;
  brand_id: string;
  product_type_id: string;
  original_language: string;
  original_name: string;
  product_name_en: string;
  product_name_zh: string;
  description_en: string;
  description_zh: string;
  how_to_use_en: string;
  how_to_use_zh: string;
  warnings_en: string;
  warnings_zh: string;
  country_of_origin: string;
  source_inci: string;
  attributes: Record<string, unknown>;
  skus: Array<{
    sku: string;
    barcode?: string;
    variant_name_en?: string;
    variant_name_zh?: string;
    net_quantity?: number;
    quantity_unit?: string;
    suggested_price?: number;
    suggested_price_currency?: string;
    suggested_price_note?: string;
  }>;
  skin_type_ids: string[];
  skin_concern_ids: string[];
  ingredient_ids: string[];
  ingredients?: Array<{ ingredient_id: string; position?: number; is_key_ingredient?: boolean }>;
  claims: Array<{ claim_type?: string; claim_text_en: string; claim_text_zh?: string; sort_order?: number }>;
};

export type ProductUpdatePayload = Partial<Pick<
  ProductCreatePayload,
  "product_name_en" | "product_name_zh" | "description_en" | "description_zh" | "how_to_use_en" | "how_to_use_zh" | "warnings_en" | "warnings_zh" | "source_inci" | "attributes" | "brand_id" | "product_type_id" | "original_name" | "country_of_origin" | "skus" | "skin_type_ids" | "skin_concern_ids" | "ingredient_ids" | "ingredients" | "claims"
>>;
