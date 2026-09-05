import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import { EditOutlined, PlusOutlined, ReloadOutlined, StopOutlined } from "@ant-design/icons";

import {
  createBrand,
  createIngredient,
  createProductType,
  createTaxonomy,
  deactivateCatalog,
  listBrands,
  listIngredients,
  listProductTypes,
  listSkinConcerns,
  listSkinTypes,
  updateBrand,
  updateIngredient,
  updateProductType,
  updateTaxonomy,
} from "../../api/catalog";
import { useAuthStore } from "../../stores/auth";
import type { Brand, Ingredient, ProductType, Taxonomy } from "../../types/catalog";

type CatalogTab = "brands" | "product-types" | "skin-types" | "skin-concerns" | "ingredients";
type CatalogRecord = Brand | Ingredient | ProductType | Taxonomy;
type CatalogFormValues = {
  name?: string;
  slug?: string;
  country_of_origin?: string;
  code?: string;
  name_en?: string;
  name_zh?: string;
  sort_order?: number;
  inci_name?: string;
  common_name_en?: string;
  common_name_zh?: string;
};

const tabLabels: Record<CatalogTab, string> = {
  brands: "Brands",
  "product-types": "Product types",
  "skin-types": "Skin types",
  "skin-concerns": "Skin concerns",
  ingredients: "Ingredients",
};

export function CatalogManagement() {
  const user = useAuthStore().user;
  const canEdit = user?.role === "admin" || user?.role === "editor";
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<CatalogTab>("brands");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string>();
  const [form] = Form.useForm<CatalogFormValues>();
  const queries = {
    brands: useQuery({ queryKey: ["catalog", "brands"], queryFn: listBrands }),
    "product-types": useQuery({ queryKey: ["catalog", "product-types"], queryFn: listProductTypes }),
    "skin-types": useQuery({ queryKey: ["catalog", "skin-types"], queryFn: listSkinTypes }),
    "skin-concerns": useQuery({ queryKey: ["catalog", "skin-concerns"], queryFn: listSkinConcerns }),
    ingredients: useQuery({ queryKey: ["catalog", "ingredients"], queryFn: listIngredients }),
  };
  const invalidate = (key: CatalogTab) => {
    void queryClient.invalidateQueries({ queryKey: ["catalog", key] });
    void queryClient.invalidateQueries({ queryKey: ["products"] });
  };
  const saveMutation = useMutation({
    mutationFn: async ({ tab, id, values }: { tab: CatalogTab; id?: string; values: CatalogFormValues }) => {
      if (tab === "brands") {
        const payload = { name: values.name ?? "", slug: values.slug ?? "", country_of_origin: values.country_of_origin };
        return id ? updateBrand(id, payload) : createBrand(payload);
      }
      if (tab === "product-types") {
        const payload = { code: values.code ?? "", name_en: values.name_en ?? "", name_zh: values.name_zh, sort_order: values.sort_order };
        return id ? updateProductType(id, payload) : createProductType(payload);
      }
      if (tab === "skin-types" || tab === "skin-concerns") {
        const payload = { code: values.code ?? "", name_en: values.name_en ?? "", name_zh: values.name_zh };
        return id ? updateTaxonomy(tab, id, payload) : createTaxonomy(tab, payload);
      }
      const payload = { inci_name: values.inci_name ?? "", common_name_en: values.common_name_en, common_name_zh: values.common_name_zh };
      return id ? updateIngredient(id, payload) : createIngredient(payload);
    },
    onSuccess: (_item, variables) => {
      message.success(`${tabLabels[variables.tab].slice(0, -1)} ${variables.id ? "updated" : "created"}`);
      setModalOpen(false);
      setEditingId(undefined);
      form.resetFields();
      invalidate(variables.tab);
    },
    onError: (_error, variables) => message.error(`${tabLabels[variables.tab]} item could not be saved`),
  });
  const deactivateMutation = useMutation({
    mutationFn: ({ tab, id }: { tab: CatalogTab; id: string }) => deactivateCatalog(tab, id),
    onSuccess: (_item, variables) => {
      message.success(`${tabLabels[variables.tab].slice(0, -1)} deactivated`);
      invalidate(variables.tab);
    },
    onError: () => message.error("Catalog item could not be deactivated"),
  });

  function openCreate() {
    form.resetFields();
    setEditingId(undefined);
    setModalOpen(true);
  }

  function openEdit(item: CatalogRecord) {
    setEditingId(item.id);
    if (activeTab === "brands") {
      const brand = item as Brand;
      form.setFieldsValue({ name: brand.name, slug: brand.slug, country_of_origin: brand.country_of_origin ?? "" });
    } else if (activeTab === "product-types") {
      const productType = item as ProductType;
      form.setFieldsValue({ code: productType.code, name_en: productType.name_en, name_zh: productType.name_zh ?? "", sort_order: productType.sort_order });
    } else if (activeTab === "skin-types" || activeTab === "skin-concerns") {
      const taxonomy = item as Taxonomy;
      form.setFieldsValue({ code: taxonomy.code, name_en: taxonomy.name_en, name_zh: taxonomy.name_zh ?? "" });
    } else {
      const ingredient = item as Ingredient;
      form.setFieldsValue({ inci_name: ingredient.inci_name, common_name_en: ingredient.common_name_en ?? "", common_name_zh: ingredient.common_name_zh ?? "" });
    }
    setModalOpen(true);
  }

  function changeTab(key: string) {
    setActiveTab(key as CatalogTab);
    setEditingId(undefined);
    form.resetFields();
  }

  function submit(values: CatalogFormValues) {
    saveMutation.mutate({ tab: activeTab, id: editingId, values });
  }

  const activeQuery = queries[activeTab];
  const loading = activeQuery.isLoading;
  const saving = saveMutation.isPending;

  function rowActions(item: CatalogRecord) {
    return (
      <Space size={0}>
        <Button type="link" icon={<EditOutlined />} disabled={!canEdit} onClick={() => openEdit(item)}>Edit</Button>
        <Popconfirm
          title="Deactivate this catalog item?"
          description="Existing products keep their saved references."
          okText="Deactivate"
          cancelText="Cancel"
          onConfirm={() => deactivateMutation.mutate({ tab: activeTab, id: item.id })}
        >
          <Button type="link" danger icon={<StopOutlined />} disabled={!canEdit || item.status === "inactive"} loading={deactivateMutation.isPending}>Deactivate</Button>
        </Popconfirm>
      </Space>
    );
  }

  return (
    <Space direction="vertical" size={24} style={{ display: "flex" }}>
      <Space style={{ display: "flex", justifyContent: "space-between" }} wrap>
        <div>
          <Typography.Title level={2} style={{ margin: 0 }}>Catalog Management</Typography.Title>
          <Typography.Text type="secondary">Maintain the master data used by product classification</Typography.Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} aria-label="Refresh catalog" onClick={() => void activeQuery.refetch()} />
          <Button type="primary" icon={<PlusOutlined />} disabled={!canEdit} onClick={openCreate}>New item</Button>
        </Space>
      </Space>
      {!canEdit && <Alert type="warning" showIcon message="Your role can view catalog data but cannot create master data." />}
      <Card>
        <Tabs activeKey={activeTab} onChange={changeTab} items={Object.entries(tabLabels).map(([key, label]) => ({ key, label }))} />
        {activeTab === "brands" && <Table<Brand> rowKey="id" loading={loading} dataSource={queries.brands.data ?? []} columns={[{ title: "Brand name", dataIndex: "name", key: "name" }, { title: "Slug", dataIndex: "slug", key: "slug" }, { title: "Country", dataIndex: "country_of_origin", key: "country" }, { title: "Status", dataIndex: "status", key: "status", render: (value: string) => <Tag>{value}</Tag> }, { title: "Action", key: "action", render: (_: unknown, item: Brand) => rowActions(item) }]} pagination={{ pageSize: 15, showSizeChanger: false }} />}
        {activeTab === "product-types" && <Table<ProductType> rowKey="id" loading={loading} dataSource={queries["product-types"].data ?? []} columns={[{ title: "Code", dataIndex: "code", key: "code" }, { title: "Name", dataIndex: "name_en", key: "name_en" }, { title: "Chinese name", dataIndex: "name_zh", key: "name_zh" }, { title: "Sort order", dataIndex: "sort_order", key: "sort_order" }, { title: "Status", dataIndex: "status", key: "status", render: (value: string) => <Tag>{value}</Tag> }, { title: "Action", key: "action", render: (_: unknown, item: ProductType) => rowActions(item) }]} pagination={{ pageSize: 15, showSizeChanger: false }} />}
        {(activeTab === "skin-types" || activeTab === "skin-concerns") && <Table<Taxonomy> rowKey="id" loading={loading} dataSource={queries[activeTab].data ?? []} columns={[{ title: "Code", dataIndex: "code", key: "code" }, { title: "Name", dataIndex: "name_en", key: "name_en" }, { title: "Chinese name", dataIndex: "name_zh", key: "name_zh" }, { title: "Status", dataIndex: "status", key: "status", render: (value: string) => <Tag>{value}</Tag> }, { title: "Action", key: "action", render: (_: unknown, item: Taxonomy) => rowActions(item) }]} pagination={{ pageSize: 15, showSizeChanger: false }} />}
        {activeTab === "ingredients" && <Table<Ingredient> rowKey="id" loading={loading} dataSource={queries.ingredients.data ?? []} columns={[{ title: "INCI name", dataIndex: "inci_name", key: "inci_name" }, { title: "Common name", dataIndex: "common_name_en", key: "common_name_en" }, { title: "中文名称", dataIndex: "common_name_zh", key: "common_name_zh" }, { title: "Status", dataIndex: "status", key: "status", render: (value: string) => <Tag>{value}</Tag> }, { title: "Action", key: "action", render: (_: unknown, item: Ingredient) => rowActions(item) }]} pagination={{ pageSize: 15, showSizeChanger: false }} />}
      </Card>
      <Modal open={modalOpen} title={`${editingId ? "Edit" : "New"} ${tabLabels[activeTab].slice(0, -1)}`} okText={editingId ? "Save" : "Create"} okButtonProps={{ disabled: !canEdit }} confirmLoading={saving} onCancel={() => setModalOpen(false)} onOk={() => void form.submit()}>
        <Form form={form} layout="vertical" onFinish={submit}>
          {activeTab === "brands" && <><Form.Item label="Brand name" name="name" rules={[{ required: true }]}><Input /></Form.Item><Form.Item label="Slug" name="slug" rules={[{ required: true }]}><Input /></Form.Item><Form.Item label="Country code" name="country_of_origin" rules={[{ len: 2 }]}><Input maxLength={2} /></Form.Item></>}
          {activeTab === "product-types" && <><Form.Item label="Code" name="code" rules={[{ required: true }]}><Input /></Form.Item><Form.Item label="English name" name="name_en" rules={[{ required: true }]}><Input /></Form.Item><Form.Item label="Chinese name" name="name_zh"><Input /></Form.Item><Form.Item label="Sort order" name="sort_order" initialValue={0}><InputNumber min={0} style={{ width: "100%" }} /></Form.Item></>}
          {(activeTab === "skin-types" || activeTab === "skin-concerns") && <><Form.Item label="Code" name="code" rules={[{ required: true }]}><Input /></Form.Item><Form.Item label="English name" name="name_en" rules={[{ required: true }]}><Input /></Form.Item><Form.Item label="Chinese name" name="name_zh"><Input /></Form.Item></>}
          {activeTab === "ingredients" && <><Form.Item label="INCI name" name="inci_name" rules={[{ required: true }]}><Input /></Form.Item><Form.Item label="Common name" name="common_name_en"><Input /></Form.Item><Form.Item label="中文名称" name="common_name_zh"><Input /></Form.Item></>}
        </Form>
      </Modal>
    </Space>
  );
}
