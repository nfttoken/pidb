import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Checkbox,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Spin,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import { DeleteOutlined, PlusOutlined, SaveOutlined, StopOutlined } from "@ant-design/icons";

import { listBrands, listIngredients, listProductTypes, listSkinConcerns, listSkinTypes } from "../../api/catalog";
import { addProductImage, deactivateProductImage, getProduct, getProductReadiness, updateProductCompliance, updateProductImage } from "../../api/products";
import type { Brand, Ingredient, ProductType, Taxonomy } from "../../types/catalog";
import type { Product, ProductCreatePayload, ProductUpdatePayload } from "../../types/product";

type ProductFormValues = {
  product_code?: string;
  brand_id?: string;
  product_type_id?: string;
  original_language?: string;
  original_name?: string;
  product_name_en?: string;
  product_name_zh?: string;
  description_en?: string;
  description_zh?: string;
  how_to_use_en?: string;
  how_to_use_zh?: string;
  warnings_en?: string;
  warnings_zh?: string;
  country_of_origin?: string;
  source_inci?: string;
  skin_type_ids?: string[];
  skin_concern_ids?: string[];
  ingredients?: ProductCreatePayload["ingredients"];
  claims?: ProductCreatePayload["claims"];
  preferences?: string[];
  importer_name?: string;
  distributor_name?: string;
  canadian_label_status?: string;
  cosmetic_notification_status?: string;
  compliance_status?: string;
  compliance_notes?: string;
  skus?: ProductCreatePayload["skus"];
};

const preferenceOptions = [
  { value: "vegan", label: "Vegan" },
  { value: "fragrance_free", label: "Fragrance-free" },
  { value: "cruelty_free", label: "Cruelty-free" },
  { value: "alcohol_free", label: "Alcohol-free" },
];

const complianceStatuses = ["pending", "reviewing", "approved", "blocked"];
const lifecycleStatuses = ["draft", "imported", "processing", "review", "ready", "published", "active", "inactive", "discontinued"];
const statusTransitions: Record<string, string[]> = {
  draft: ["imported"], imported: ["processing"], processing: ["review"], review: ["ready", "processing"],
  ready: ["published", "review"], published: ["active", "inactive"], active: ["inactive", "discontinued"],
  inactive: ["active", "discontinued"], discontinued: [],
};

type ProductEditorModalProps = {
  open: boolean;
  productId?: string;
  canReview: boolean;
  canEdit: boolean;
  onClose: () => void;
  onSaved: () => void;
  onCreate: (payload: ProductCreatePayload) => Promise<void>;
  onUpdate: (productId: string, payload: ProductUpdatePayload) => Promise<void>;
  onStatusChange: (productId: string, nextStatus: string) => Promise<void>;
};

type ImageDraft = {
  image_url: string;
  image_type: string;
  sort_order: number;
  alt_text_en: string;
  alt_text_zh: string;
};

function productToForm(product: Product): ProductFormValues {
  return {
    product_code: product.product_code,
    brand_id: product.brand.id,
    product_type_id: product.product_type.id,
    original_language: product.original_language,
    original_name: product.original_name,
    product_name_en: product.product_name_en,
    product_name_zh: product.product_name_zh ?? "",
    description_en: product.description_en ?? "",
    description_zh: product.description_zh ?? "",
    how_to_use_en: product.how_to_use_en ?? "",
    how_to_use_zh: product.how_to_use_zh ?? "",
    warnings_en: product.warnings_en ?? "",
    warnings_zh: product.warnings_zh ?? "",
    country_of_origin: product.country_of_origin ?? "",
    source_inci: product.source_inci ?? "",
    skus: product.skus.map((sku) => ({ sku: sku.sku, barcode: sku.barcode ?? "", variant_name_en: sku.variant_name_en ?? "", variant_name_zh: sku.variant_name_zh ?? "", net_quantity: sku.net_quantity ?? undefined, quantity_unit: sku.quantity_unit ?? "" })),
    skin_type_ids: product.skin_types.map((item) => item.id),
    skin_concern_ids: product.skin_concerns.map((item) => item.id),
    ingredients: product.ingredients.map((item) => ({ ingredient_id: item.ingredient.id, position: item.position ?? undefined, is_key_ingredient: item.is_key_ingredient })),
    claims: product.claims.map((claim) => ({ claim_type: claim.claim_type, claim_text_en: claim.claim_text_en, claim_text_zh: claim.claim_text_zh ?? "", sort_order: claim.sort_order })),
    preferences: Array.isArray(product.attributes.preferences) ? product.attributes.preferences.filter((value): value is string => typeof value === "string") : [],
    importer_name: product.canada?.importer_name ?? "",
    distributor_name: product.canada?.distributor_name ?? "",
    canadian_label_status: product.canada?.canadian_label_status ?? "pending",
    cosmetic_notification_status: product.canada?.cosmetic_notification_status ?? "pending",
    compliance_status: product.canada?.compliance_status ?? "pending",
    compliance_notes: product.canada?.notes ?? "",
  };
}

function optionLabel(item: { name_en?: string; common_name_en?: string | null; inci_name?: string; code?: string }): string {
  return item.name_en ?? item.common_name_en ?? item.inci_name ?? item.code ?? "";
}

function emptyImageDraft(): ImageDraft {
  return { image_url: "", image_type: "gallery", sort_order: 0, alt_text_en: "", alt_text_zh: "" };
}

export function ProductEditorModal({ open, productId, canReview, canEdit, onClose, onSaved, onCreate, onUpdate, onStatusChange }: ProductEditorModalProps) {
  const [form] = Form.useForm<ProductFormValues>();
  const [complianceForm] = Form.useForm<ProductFormValues>();
  const editing = Boolean(productId);
  const canComplianceEdit = canEdit || canReview;
  const [imageDraft, setImageDraft] = useState<ImageDraft>(emptyImageDraft());
  const [imageEdits, setImageEdits] = useState<Record<string, ImageDraft>>({});
  const productQuery = useQuery({ queryKey: ["product", productId], queryFn: () => getProduct(productId as string), enabled: open && editing });
  const readinessQuery = useQuery({ queryKey: ["product-readiness", productId], queryFn: () => getProductReadiness(productId as string), enabled: open && editing });
  const brandsQuery = useQuery({ queryKey: ["catalog", "brands"], queryFn: listBrands, enabled: open });
  const typesQuery = useQuery({ queryKey: ["catalog", "product-types"], queryFn: listProductTypes, enabled: open });
  const skinTypesQuery = useQuery({ queryKey: ["catalog", "skin-types"], queryFn: listSkinTypes, enabled: open });
  const concernsQuery = useQuery({ queryKey: ["catalog", "skin-concerns"], queryFn: listSkinConcerns, enabled: open });
  const ingredientsQuery = useQuery({ queryKey: ["catalog", "ingredients"], queryFn: listIngredients, enabled: open });
  const complianceMutation = useMutation({
    mutationFn: (values: ProductFormValues) => updateProductCompliance(productId as string, { importer_name: values.importer_name, distributor_name: values.distributor_name, canadian_label_status: values.canadian_label_status, cosmetic_notification_status: values.cosmetic_notification_status, compliance_status: values.compliance_status ?? "pending", notes: values.compliance_notes }),
    onSuccess: () => { message.success("Compliance saved"); onSaved(); },
    onError: () => message.error("Compliance could not be saved"),
  });
  const addImageMutation = useMutation({
    mutationFn: () => addProductImage(productId as string, imageDraft),
    onSuccess: () => { setImageDraft(emptyImageDraft()); message.success("Image added"); onSaved(); },
    onError: () => message.error("Image could not be added"),
  });
  const updateImageMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: ImageDraft }) => updateProductImage(productId as string, id, values),
    onSuccess: () => { message.success("Image saved"); onSaved(); },
    onError: () => message.error("Image could not be saved"),
  });
  const deactivateImageMutation = useMutation({
    mutationFn: (id: string) => deactivateProductImage(productId as string, id),
    onSuccess: () => { message.success("Image deactivated"); onSaved(); },
    onError: () => message.error("Image could not be deactivated"),
  });
  const catalogLoading = brandsQuery.isLoading || typesQuery.isLoading || skinTypesQuery.isLoading || concernsQuery.isLoading || ingredientsQuery.isLoading;
  const catalogError = brandsQuery.isError || typesQuery.isError || skinTypesQuery.isError || concernsQuery.isError || ingredientsQuery.isError;

  useEffect(() => {
    if (!open) {
      form.resetFields();
      complianceForm.resetFields();
      setImageDraft(emptyImageDraft());
      setImageEdits({});
    } else if (productQuery.data) {
      const values = productToForm(productQuery.data);
      form.setFieldsValue(values);
      complianceForm.setFieldsValue(values);
      setImageEdits(Object.fromEntries(productQuery.data.images.map((image) => [image.id, { image_url: image.image_url, image_type: image.image_type, sort_order: image.sort_order, alt_text_en: image.alt_text_en ?? "", alt_text_zh: image.alt_text_zh ?? "" }])));
    } else if (!editing) {
      form.resetFields();
    }
  }, [complianceForm, editing, form, open, productQuery.data]);

  async function submit(values: ProductFormValues) {
    if (editing && productId) {
      await onUpdate(productId, { brand_id: values.brand_id, product_type_id: values.product_type_id, original_name: values.original_name, product_name_en: values.product_name_en ?? "", product_name_zh: values.product_name_zh ?? "", description_en: values.description_en ?? "", description_zh: values.description_zh ?? "", how_to_use_en: values.how_to_use_en ?? "", how_to_use_zh: values.how_to_use_zh ?? "", warnings_en: values.warnings_en ?? "", warnings_zh: values.warnings_zh ?? "", source_inci: values.source_inci ?? "", country_of_origin: values.country_of_origin, attributes: { preferences: values.preferences ?? [] }, skus: values.skus ?? [], skin_type_ids: values.skin_type_ids ?? [], skin_concern_ids: values.skin_concern_ids ?? [], ingredients: values.ingredients ?? [], claims: values.claims ?? [] });
    } else {
      await onCreate({ product_code: values.product_code ?? "", brand_id: values.brand_id ?? "", product_type_id: values.product_type_id ?? "", original_language: values.original_language ?? "other", original_name: values.original_name ?? "", product_name_en: values.product_name_en ?? "", product_name_zh: values.product_name_zh ?? "", description_en: values.description_en ?? "", description_zh: values.description_zh ?? "", how_to_use_en: values.how_to_use_en ?? "", how_to_use_zh: values.how_to_use_zh ?? "", warnings_en: values.warnings_en ?? "", warnings_zh: values.warnings_zh ?? "", country_of_origin: values.country_of_origin ?? "", source_inci: values.source_inci ?? "", attributes: { preferences: values.preferences ?? [] }, skus: values.skus ?? [], skin_type_ids: values.skin_type_ids ?? [], skin_concern_ids: values.skin_concern_ids ?? [], ingredient_ids: [], ingredients: values.ingredients ?? [], claims: values.claims ?? [] });
    }
  }

  const product = productQuery.data;
  const transitionOptions = product ? statusTransitions[product.status] ?? [] : [];
  const ingredientOptions = (ingredientsQuery.data ?? []).map((item: Ingredient) => ({ label: `${item.inci_name}${item.common_name_en ? ` · ${item.common_name_en}` : ""}`, value: item.id }));

  return (
    <Modal open={open} onCancel={onClose} width={1000} destroyOnClose title={editing ? "Edit product" : "Create product"} footer={null}>
      {catalogLoading || (editing && productQuery.isLoading) ? <Spin /> : catalogError ? <Alert type="error" showIcon message="Catalog data could not be loaded." /> : (
        <>
          <Form form={form} layout="vertical" onFinish={submit}>
            <fieldset disabled={!canEdit} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
              <Tabs items={[
                { key: "identity", label: "Identity", children: <div className="admin-form-grid">
                  <Form.Item label="Product code" name="product_code" rules={[{ required: true }]}><Input disabled={editing} /></Form.Item>
                  <Form.Item label="Original language" name="original_language" rules={[{ required: true }]}><Select options={["ko", "ja", "zh", "en", "fr", "other"].map((value) => ({ label: value.toUpperCase(), value }))} disabled={editing} /></Form.Item>
                  <Form.Item label="Brand" name="brand_id" rules={[{ required: true }]}><Select options={(brandsQuery.data ?? []).map((item: Brand) => ({ label: item.name, value: item.id }))} /></Form.Item>
                  <Form.Item label="Product type" name="product_type_id" rules={[{ required: true }]}><Select options={(typesQuery.data ?? []).map((item: ProductType) => ({ label: optionLabel(item), value: item.id }))} /></Form.Item>
                  <Form.Item label="Original name" name="original_name" rules={[{ required: true }]}><Input /></Form.Item>
                  <Form.Item label="Country of origin" name="country_of_origin" rules={[{ required: true, len: 2 }]}><Input maxLength={2} /></Form.Item>
                  <Form.Item label="English product name" name="product_name_en" rules={[{ required: true }]}><Input /></Form.Item>
                  <Form.Item label="Chinese product name" name="product_name_zh" rules={[{ required: true }]}><Input /></Form.Item>
                </div> },
                { key: "classification", label: "Classification", children: <>
                  <Form.Item label="Skin types" name="skin_type_ids"><Select mode="multiple" options={(skinTypesQuery.data ?? []).map((item: Taxonomy) => ({ label: optionLabel(item), value: item.id }))} /></Form.Item>
                  <Form.Item label="Skin concerns" name="skin_concern_ids"><Select mode="multiple" options={(concernsQuery.data ?? []).map((item: Taxonomy) => ({ label: optionLabel(item), value: item.id }))} /></Form.Item>
                </> },
                { key: "knowledge", label: "Ingredients & claims", children: <>
                  <Typography.Text strong>Ingredients</Typography.Text>
                  <Form.List name="ingredients">{(fields, { add, remove }) => <Space direction="vertical" style={{ display: "flex", marginTop: 12 }}>
                    {fields.map((field) => <div key={field.key} className="admin-sku-row">
                      <Form.Item {...field} label="Ingredient" name={[field.name, "ingredient_id"]} rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={ingredientOptions} /></Form.Item>
                      <Form.Item {...field} label="Position" name={[field.name, "position"]}><InputNumber min={1} style={{ width: "100%" }} /></Form.Item>
                      <Form.Item {...field} label="Key ingredient" name={[field.name, "is_key_ingredient"]} valuePropName="checked"><Checkbox>Key</Checkbox></Form.Item>
                      <Button aria-label="Remove ingredient" icon={<DeleteOutlined />} onClick={() => remove(field.name)} />
                    </div>)}
                    <Button icon={<PlusOutlined />} onClick={() => add({ is_key_ingredient: false })}>Add ingredient</Button>
                  </Space>}</Form.List>
                  <Divider />
                  <Typography.Text strong>Claims</Typography.Text>
                  <Form.List name="claims">{(fields, { add, remove }) => <Space direction="vertical" style={{ display: "flex", marginTop: 12 }}>
                    {fields.map((field) => <div key={field.key} className="admin-sku-row">
                      <Form.Item {...field} label="Type" name={[field.name, "claim_type"]}><Input placeholder="cosmetic" /></Form.Item>
                      <Form.Item {...field} label="English claim" name={[field.name, "claim_text_en"]} rules={[{ required: true }]}><Input /></Form.Item>
                      <Form.Item {...field} label="Chinese claim" name={[field.name, "claim_text_zh"]}><Input /></Form.Item>
                      <Form.Item {...field} label="Order" name={[field.name, "sort_order"]}><InputNumber min={0} style={{ width: "100%" }} /></Form.Item>
                      <Button aria-label="Remove claim" icon={<DeleteOutlined />} onClick={() => remove(field.name)} />
                    </div>)}
                    <Button icon={<PlusOutlined />} onClick={() => add({ claim_type: "cosmetic", sort_order: fields.length })}>Add claim</Button>
                  </Space>}</Form.List>
                  <Divider />
                  <Form.Item label="Other preferences" name="preferences"><Checkbox.Group options={preferenceOptions} /></Form.Item>
                  <Form.Item label="Full INCI" name="source_inci"><Input.TextArea rows={4} /></Form.Item>
                </> },
                { key: "content", label: "Content", children: <>
                  <div className="admin-form-grid"><Form.Item label="Description (English)" name="description_en" rules={[{ required: true }]}><Input.TextArea rows={5} /></Form.Item><Form.Item label="Description (中文)" name="description_zh" rules={[{ required: true }]}><Input.TextArea rows={5} /></Form.Item><Form.Item label="How to use (English)" name="how_to_use_en" rules={[{ required: true }]}><Input.TextArea rows={4} /></Form.Item><Form.Item label="How to use (中文)" name="how_to_use_zh" rules={[{ required: true }]}><Input.TextArea rows={4} /></Form.Item><Form.Item label="Warnings (English)" name="warnings_en"><Input.TextArea rows={4} /></Form.Item><Form.Item label="Warnings (中文)" name="warnings_zh"><Input.TextArea rows={4} /></Form.Item></div>
                </> },
                { key: "skus", label: "SKUs", children: <Form.List name="skus">{(fields, { add, remove }) => <Space direction="vertical" style={{ display: "flex" }}>
                  {fields.map((field) => <div key={field.key} className="admin-sku-row"><Form.Item {...field} label="SKU" name={[field.name, "sku"]} rules={[{ required: true }]}><Input /></Form.Item><Form.Item {...field} label="Barcode" name={[field.name, "barcode"]}><Input /></Form.Item><Form.Item {...field} label="Variant (EN)" name={[field.name, "variant_name_en"]}><Input /></Form.Item><Form.Item {...field} label="Variant (中文)" name={[field.name, "variant_name_zh"]}><Input /></Form.Item><Form.Item {...field} label="Quantity" name={[field.name, "net_quantity"]}><InputNumber min={0} style={{ width: "100%" }} /></Form.Item><Button aria-label="Remove SKU" icon={<DeleteOutlined />} onClick={() => remove(field.name)} /></div>)}
                  <Button icon={<PlusOutlined />} onClick={() => add({ variant_name_en: "Default" })}>Add SKU</Button>
                </Space>}</Form.List> },
              ]} />
            </fieldset>
            <Divider />
            <Space style={{ display: "flex", justifyContent: "flex-end" }}><Button onClick={onClose}>Cancel</Button>{canEdit && <Button type="primary" htmlType="submit">{editing ? "Save changes" : "Create product"}</Button>}</Space>
          </Form>

          {editing && product && <>
            <Divider />
            <Space direction="vertical" style={{ display: "flex" }} size={16}>
              <Space wrap><Typography.Text strong>Lifecycle</Typography.Text><Tag>{product.status}</Tag>{readinessQuery.data && <Tag color={readinessQuery.data.ready ? "success" : "warning"}>Readiness {readinessQuery.data.score}%</Tag>}<Tag color={product.canada?.compliance_status === "approved" ? "success" : "warning"}>Compliance {product.canada?.compliance_status ?? "pending"}</Tag></Space>
              {readinessQuery.data && !readinessQuery.data.ready && <Alert type="warning" showIcon message="Readiness blockers" description={readinessQuery.data.blockers.join(" · ")} />}
              {canReview && <Space wrap><Select style={{ width: 180 }} placeholder="Change lifecycle status" options={statusTransitions[product.status]?.map((value) => ({ label: value, value })) ?? []} onChange={(value) => void onStatusChange(product.id, value)} /><Typography.Text type="secondary">Allowed: {transitionOptions.length ? transitionOptions.join(", ") : "none"}</Typography.Text></Space>}

              <Form form={complianceForm} layout="vertical" disabled={!canComplianceEdit}>
                <Typography.Title level={5}>Canada compliance</Typography.Title>
                <div className="admin-form-grid"><Form.Item label="Importer" name="importer_name"><Input /></Form.Item><Form.Item label="Distributor" name="distributor_name"><Input /></Form.Item><Form.Item label="Canadian label status" name="canadian_label_status"><Select options={["pending", "reviewing", "approved", "blocked"].map((value) => ({ label: value, value }))} /></Form.Item><Form.Item label="Cosmetic notification status" name="cosmetic_notification_status"><Select options={["pending", "submitted", "approved", "blocked"].map((value) => ({ label: value, value }))} /></Form.Item><Form.Item label="Compliance status" name="compliance_status"><Select options={complianceStatuses.map((value) => ({ label: value, value }))} /></Form.Item><Form.Item label="Review notes" name="compliance_notes"><Input.TextArea rows={3} /></Form.Item></div>
                {canComplianceEdit && <Button icon={<SaveOutlined />} loading={complianceMutation.isPending} onClick={() => void complianceForm.validateFields().then((values) => complianceMutation.mutate(values))}>Save compliance</Button>}
              </Form>

              <div><Typography.Title level={5}>Images</Typography.Title>{product.images.map((image) => { const values = imageEdits[image.id]; if (!values) return null; return <div key={image.id} className="admin-image-row"><img src={image.image_url} alt={values.alt_text_en || "Product"} style={{ width: 72, height: 72, objectFit: "cover" }} /><Input value={values.image_url} onChange={(event) => setImageEdits((current) => ({ ...current, [image.id]: { ...values, image_url: event.target.value } }))} placeholder="Image URL" disabled={!canEdit || image.status === "inactive"} /><Select value={values.image_type} onChange={(value) => setImageEdits((current) => ({ ...current, [image.id]: { ...values, image_type: value } }))} options={["hero", "gallery", "thumbnail", "ingredient"].map((value) => ({ label: value, value }))} disabled={!canEdit || image.status === "inactive"} /><InputNumber value={values.sort_order} min={0} onChange={(value) => setImageEdits((current) => ({ ...current, [image.id]: { ...values, sort_order: value ?? 0 } }))} disabled={!canEdit || image.status === "inactive"} /><Input value={values.alt_text_en} onChange={(event) => setImageEdits((current) => ({ ...current, [image.id]: { ...values, alt_text_en: event.target.value } }))} placeholder="Alt text EN" disabled={!canEdit || image.status === "inactive"} /><Button icon={<SaveOutlined />} aria-label="Save image" onClick={() => updateImageMutation.mutate({ id: image.id, values })} disabled={!canEdit || image.status === "inactive"} loading={updateImageMutation.isPending} /><Button danger icon={<StopOutlined />} aria-label="Deactivate image" onClick={() => deactivateImageMutation.mutate(image.id)} disabled={!canEdit || image.status === "inactive"} /></div>; })}</div>
              {canEdit && <Space wrap><Input value={imageDraft.image_url} onChange={(event) => setImageDraft((current) => ({ ...current, image_url: event.target.value }))} placeholder="New image URL" style={{ width: 280 }} /><Select value={imageDraft.image_type} onChange={(value) => setImageDraft((current) => ({ ...current, image_type: value }))} options={["hero", "gallery", "thumbnail", "ingredient"].map((value) => ({ label: value, value }))} /><InputNumber value={imageDraft.sort_order} min={0} onChange={(value) => setImageDraft((current) => ({ ...current, sort_order: value ?? 0 }))} /><Button icon={<PlusOutlined />} type="dashed" disabled={!imageDraft.image_url.trim()} loading={addImageMutation.isPending} onClick={() => addImageMutation.mutate()}>Add image</Button></Space>}
            </Space>
          </>}
        </>
      )}
    </Modal>
  );
}
