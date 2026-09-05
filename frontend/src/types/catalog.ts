export type CatalogItem = {
  id: string;
  status: string;
};

export type Brand = CatalogItem & {
  brand_code: string | null;
  name: string;
  name_ko: string | null;
  name_ja: string | null;
  name_en: string | null;
  name_zh: string | null;
  slug: string;
  country_of_origin: string | null;
  website_url: string | null;
  logo_url: string | null;
};

export type ProductType = CatalogItem & {
  code: string;
  name_en: string;
  name_zh: string | null;
  parent_id: string | null;
  sort_order: number;
};

export type Taxonomy = CatalogItem & {
  code: string;
  name_en: string;
  name_zh: string | null;
};

export type Ingredient = CatalogItem & {
  inci_name: string;
  common_name_en: string | null;
  common_name_zh: string | null;
  common_name_ko: string | null;
  common_name_ja: string | null;
  description_en: string | null;
  description_zh: string | null;
  cosmetic_functions: string | null;
  search_keywords: string | null;
};
