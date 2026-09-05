export type PublicImage = {
  image_url: string;
  image_type: string;
  sort_order: number;
  alt_text_en: string | null;
  alt_text_zh: string | null;
};

export type PublicIngredient = {
  inci_name: string;
  common_name_en: string | null;
  common_name_zh: string | null;
  is_key_ingredient: boolean;
};

export type PublicProduct = {
  id: string;
  product_code: string;
  product_name_en: string;
  product_name_zh: string | null;
  brand_name: string;
  product_type_en: string;
  product_type_zh: string | null;
  country_of_origin: string | null;
  description_en: string | null;
  description_zh: string | null;
  how_to_use_en: string | null;
  how_to_use_zh: string | null;
  warnings_en: string | null;
  warnings_zh: string | null;
  skin_types: string[];
  skin_concerns: string[];
  ingredients: PublicIngredient[];
  source_inci: string | null;
  images: PublicImage[];
  shopify_handle: string | null;
  shopify_url: string | null;
};
