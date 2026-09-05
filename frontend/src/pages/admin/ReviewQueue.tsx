import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Card, Flex, Empty, Space, Table, Tag, Typography, message } from "antd";
import { CheckCircleOutlined, ReloadOutlined } from "@ant-design/icons";

import { changeProductStatus, listProducts } from "../../api/products";
import { ProductEditorModal } from "../../components/admin/ProductEditorModal";
import { useAuthStore } from "../../stores/auth";
import type { ProductListItem } from "../../types/product";

type ReviewMode = "products" | "compliance";

export function ReviewQueue({ mode }: { mode: ReviewMode }) {
  const queryClient = useQueryClient();
  const user = useAuthStore().user;
  const canReview = user?.role === "admin" || user?.role === "reviewer";
  const [selectedId, setSelectedId] = useState<string>();
  const query = useQuery({
    queryKey: ["review-queue", mode],
    queryFn: () => listProducts(mode === "products" ? { status: "review" } : { compliance_status: "pending,reviewing" }),
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => changeProductStatus(id, status),
    onSuccess: () => {
      message.success("Product status updated");
      refresh();
    },
    onError: () => message.error("Status change was rejected by the backend"),
  });
  const products = query.data?.items ?? [];
  const selectedProduct = products.find((product) => product.id === selectedId);

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["review-queue"] });
    if (selectedId) {
      void queryClient.invalidateQueries({ queryKey: ["product", selectedId] });
      void queryClient.invalidateQueries({ queryKey: ["product-readiness", selectedId] });
    }
  }

  const title = mode === "products" ? "Product Review" : "Compliance Review";
  const description = mode === "products"
    ? "Review products waiting for lifecycle approval"
    : "Review Canadian compliance before publication";

  return (
    <Space direction="vertical" size={24} style={{ display: "flex" }}>
      <Flex justify="space-between" align="flex-start" wrap="wrap" gap={16}>
        <div>
          <Typography.Title level={2} style={{ margin: 0 }}>{title}</Typography.Title>
          <Typography.Text type="secondary">{description}</Typography.Text>
        </div>
        <Button aria-label={`Refresh ${title}`} icon={<ReloadOutlined />} onClick={() => void query.refetch()} />
      </Flex>
      {!canReview && <Alert type="warning" showIcon message="Your role can view the review queue but cannot approve or reject products." />}
      <Card title="Review queue">
        <Table<ProductListItem>
          rowKey="id"
          loading={query.isLoading}
          dataSource={products}
          pagination={{ pageSize: 20, showSizeChanger: false }}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No products waiting for review" /> }}
          columns={[
            { title: "Product", key: "product", render: (_: unknown, item: ProductListItem) => <Space direction="vertical" size={0}><Typography.Text strong>{item.product_name_en}</Typography.Text><Typography.Text type="secondary">{item.product_code}</Typography.Text></Space> },
            { title: "Brand", dataIndex: "brand_name", key: "brand" },
            { title: "Product type", dataIndex: "product_type_name", key: "type" },
            { title: "Status", dataIndex: "status", key: "status", render: (value: string) => <Tag color="processing">{value}</Tag> },
            ...(mode === "compliance" ? [{ title: "Compliance", dataIndex: "compliance_status", key: "compliance", render: (value: string | null) => <Tag color={value === "reviewing" ? "warning" : "default"}>{value ?? "pending"}</Tag> }] : []),
            { title: "Action", key: "action", render: (_: unknown, item: ProductListItem) => <Button type="link" icon={<CheckCircleOutlined />} onClick={() => setSelectedId(item.id)}>Open review</Button> },
          ]}
        />
      </Card>
      <ProductEditorModal
        open={Boolean(selectedId)}
        productId={selectedId}
        canEdit={false}
        canReview={canReview}
        onClose={() => setSelectedId(undefined)}
        onSaved={refresh}
        onCreate={async () => undefined}
        onUpdate={async () => undefined}
        onStatusChange={async (id, value) => statusMutation.mutateAsync({ id, status: value }).then(() => undefined)}
      />
    </Space>
  );
}
