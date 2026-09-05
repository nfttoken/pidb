import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Flex, Input, Select, Space, Statistic, Table, Tag, Typography, message } from "antd";
import { PlusOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";

import { createProduct, changeProductStatus, listProducts, updateProduct } from "../../api/products";
import { ProductEditorModal } from "../../components/admin/ProductEditorModal";
import { useAuthStore } from "../../stores/auth";
import type { ProductCreatePayload, ProductListItem, ProductUpdatePayload } from "../../types/product";

export function Products() {
  const queryClient = useQueryClient();
  const user = useAuthStore().user;
  const canEdit = user?.role === "admin" || user?.role === "editor";
  const canReview = user?.role === "admin" || user?.role === "reviewer";
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string>();
  const productsQuery = useQuery({ queryKey: ["products", search, status], queryFn: () => listProducts({ search, status }) });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["products"] });
    if (editingId) {
      void queryClient.invalidateQueries({ queryKey: ["product", editingId] });
      void queryClient.invalidateQueries({ queryKey: ["product-readiness", editingId] });
    }
  };
  const createMutation = useMutation({ mutationFn: (payload: ProductCreatePayload) => createProduct(payload), onSuccess: () => { message.success("Product created"); setEditorOpen(false); refresh(); }, onError: () => message.error("Product could not be created") });
  const updateMutation = useMutation({ mutationFn: ({ id, payload }: { id: string; payload: ProductUpdatePayload }) => updateProduct(id, payload), onSuccess: () => { message.success("Product updated"); refresh(); }, onError: () => message.error("Product could not be updated") });
  const statusMutation = useMutation({ mutationFn: ({ id, value }: { id: string; value: string }) => changeProductStatus(id, value), onSuccess: () => { message.success("Product status updated"); refresh(); }, onError: () => message.error("Status change was rejected by the backend") });

  return (
    <Space direction="vertical" size={24} style={{ display: "flex" }}>
      <Flex justify="space-between" align="flex-start" wrap="wrap" gap={16}>
        <div><Typography.Title level={2} style={{ margin: 0 }}>Products</Typography.Title><Typography.Text type="secondary">Product Knowledge Master</Typography.Text></div>
        <Space><Button icon={<ReloadOutlined />} aria-label="Refresh products" onClick={() => void productsQuery.refetch()} /><Button type="primary" icon={<PlusOutlined />} disabled={!canEdit} onClick={() => { setEditingId(undefined); setEditorOpen(true); }}>New product</Button></Space>
      </Flex>
      <Flex gap={12} wrap="wrap">
        <Input.Search style={{ width: 360, maxWidth: "100%" }} value={searchInput} prefix={<SearchOutlined />} placeholder="Search product code or name" onChange={(event) => setSearchInput(event.target.value)} onSearch={setSearch} allowClear />
        <Select allowClear style={{ width: 180 }} placeholder="Filter status" value={status} onChange={setStatus} options={["draft", "imported", "processing", "review", "ready", "published", "active", "inactive", "discontinued"].map((value) => ({ label: value, value }))} />
      </Flex>
      <Card>
        <Flex gap={32} style={{ marginBottom: 20 }} wrap="wrap"><Statistic title="Total products" value={productsQuery.data?.total ?? 0} /><Statistic title="Visible results" value={productsQuery.data?.items.length ?? 0} /></Flex>
        <Table
          rowKey="id"
          loading={productsQuery.isLoading}
          dataSource={productsQuery.data?.items ?? []}
          pagination={{ pageSize: 20, showSizeChanger: false }}
          columns={[
            { title: "Product", key: "product", render: (_: unknown, item: ProductListItem) => <Space direction="vertical" size={0}><Typography.Text strong>{item.product_name_en}</Typography.Text><Typography.Text type="secondary">{item.product_code}</Typography.Text></Space> },
            { title: "Brand", dataIndex: "brand_name", key: "brand" },
            { title: "Product type", dataIndex: "product_type_name", key: "type" },
            { title: "Status", dataIndex: "status", key: "status", render: (value: string) => <Tag>{value}</Tag> },
            { title: "Action", key: "action", render: (_: unknown, item: ProductListItem) => <Button type="link" onClick={() => { setEditingId(item.id); setEditorOpen(true); }}>Open</Button> },
          ]}
        />
      </Card>
      <ProductEditorModal
        open={editorOpen}
        productId={editingId}
        canEdit={canEdit}
        canReview={canReview}
        onClose={() => setEditorOpen(false)}
        onSaved={refresh}
        onCreate={async (payload) => createMutation.mutateAsync(payload).then(() => undefined)}
        onUpdate={async (id, payload) => updateMutation.mutateAsync({ id, payload }).then(() => undefined)}
        onStatusChange={async (id, value) => statusMutation.mutateAsync({ id, value }).then(() => undefined)}
      />
    </Space>
  );
}
