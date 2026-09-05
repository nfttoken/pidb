import type { ApiResponse } from "../types/auth";
import type { Brand, Ingredient, ProductType, Taxonomy } from "../types/catalog";
import api from "./client";

async function getList<T>(path: string): Promise<T[]> {
  const { data } = await api.get<ApiResponse<T[]>>(path);
  return data.data;
}

export const listBrands = () => getList<Brand>("/brands");
export const listProductTypes = () => getList<ProductType>("/product-types");
export const listSkinTypes = () => getList<Taxonomy>("/skin-types");
export const listSkinConcerns = () => getList<Taxonomy>("/skin-concerns");
export const listIngredients = () => getList<Ingredient>("/ingredients");

export async function createBrand(payload: { name: string; slug: string; country_of_origin?: string }): Promise<Brand> {
  const { data } = await api.post<ApiResponse<Brand>>("/brands", payload);
  return data.data;
}

export async function createProductType(payload: { code: string; name_en: string; name_zh?: string; sort_order?: number }): Promise<ProductType> {
  const { data } = await api.post<ApiResponse<ProductType>>("/product-types", payload);
  return data.data;
}

export async function createTaxonomy(kind: "skin-types" | "skin-concerns", payload: { code: string; name_en: string; name_zh?: string }): Promise<Taxonomy> {
  const { data } = await api.post<ApiResponse<Taxonomy>>(`/${kind}`, payload);
  return data.data;
}

export async function createIngredient(payload: { inci_name: string; common_name_en?: string; common_name_zh?: string }): Promise<Ingredient> {
  const { data } = await api.post<ApiResponse<Ingredient>>("/ingredients", payload);
  return data.data;
}

export async function updateBrand(id: string, payload: { name: string; slug: string; country_of_origin?: string }): Promise<Brand> {
  const { data } = await api.patch<ApiResponse<Brand>>(`/brands/${id}`, payload);
  return data.data;
}

export async function updateProductType(id: string, payload: { code: string; name_en: string; name_zh?: string; sort_order?: number }): Promise<ProductType> {
  const { data } = await api.patch<ApiResponse<ProductType>>(`/product-types/${id}`, payload);
  return data.data;
}

export async function updateTaxonomy(kind: "skin-types" | "skin-concerns", id: string, payload: { code: string; name_en: string; name_zh?: string }): Promise<Taxonomy> {
  const { data } = await api.patch<ApiResponse<Taxonomy>>(`/${kind}/${id}`, payload);
  return data.data;
}

export async function updateIngredient(id: string, payload: { inci_name: string; common_name_en?: string; common_name_zh?: string }): Promise<Ingredient> {
  const { data } = await api.patch<ApiResponse<Ingredient>>(`/ingredients/${id}`, payload);
  return data.data;
}

export async function deactivateCatalog(kind: CatalogKind, id: string): Promise<CatalogEntity> {
  const { data } = await api.post<ApiResponse<CatalogEntity>>(`/${kind}/${id}/deactivate`);
  return data.data;
}

export type CatalogKind = "brands" | "product-types" | "skin-types" | "skin-concerns" | "ingredients";
export type CatalogEntity = Brand | ProductType | Taxonomy | Ingredient;
