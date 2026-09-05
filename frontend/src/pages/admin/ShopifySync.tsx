import { useMemo, useState, type Key } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Flex,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  SyncOutlined,
  WarningOutlined,
} from "@ant-design/icons";

import { getShopifyStatus, listProducts, queueProducts, retryShopifyJob, syncProduct } from "../../api/shopify";
import { useAuthStore } from "../../stores/auth";
import type { ProductListItem } from "../../types/product";
import type { ShopifyJob, ShopifySyncStatus } from "../../types/shopify";

const statusColors: Record<string, string> = {
  succeeded: "success",
  success: "success",
  pending: "processing",
  processing: "processing",
  failed: "error",
  blocked: "warning",
  skipped: "default",
};

function SyncTag({ value }: { value: string | null | undefined }) {
  const label = value ?? "Not synced";
  return <Tag color={statusColors[label] ?? "default"}>{label}</Tag>;
}

function formatDate(value: string | null | undefined): string {
  return value ? new Date(value).toLocaleString() : "Never";
}

function latestJob(status: ShopifySyncStatus | null): ShopifyJob | null {
  return status?.jobs[0] ?? null;
}

function MetricBlock({ title, value }: { title: string; value: string }) {
  return (
    <div style={{ border: "1px solid #f0f0f0", padding: 16, minHeight: 88 }}>
      <Statistic title={title} value={value} />
    </div>
  );
}

export function ShopifySync() {
  const queryClient = useQueryClient();
  const [selectedProductId, setSelectedProductId] = useState<string>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const user = useAuthStore().user;
  const canSync = user?.role === "admin" || user?.role === "reviewer";
  const productsQuery = useQuery({ queryKey: ["products", "shopify-sync"], queryFn: listProducts });
  const statusQuery = useQuery({
    queryKey: ["shopify-status", selectedProductId],
    queryFn: () => getShopifyStatus(selectedProductId as string),
    enabled: Boolean(selectedProductId),
  });

  const syncMutation = useMutation({
    mutationFn: syncProduct,
    onSuccess: () => {
      message.success("Shopify sync started");
      void queryClient.invalidateQueries({ queryKey: ["shopify-status", selectedProductId] });
    },
    onError: () => message.error("Shopify sync could not be started"),
  });
  const queueMutation = useMutation({
    mutationFn: queueProducts,
    onSuccess: (jobs) => {
      message.success(`${jobs.length} product${jobs.length === 1 ? "" : "s"} queued`);
      setSelectedRowKeys([]);
      void queryClient.invalidateQueries({ queryKey: ["shopify-status"] });
    },
    onError: () => message.error("Products could not be queued"),
  });
  const retryMutation = useMutation({
    mutationFn: retryShopifyJob,
    onSuccess: () => {
      message.success("Retry started");
      void queryClient.invalidateQueries({ queryKey: ["shopify-status", selectedProductId] });
    },
    onError: () => message.error("Retry could not be started"),
  });

  const products = productsQuery.data?.items ?? [];
  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId),
    [products, selectedProductId],
  );
  const status = statusQuery.data ?? null;
  const lastJob = latestJob(status);
  const lastError = status?.mapping?.last_error ?? lastJob?.last_error;

  const columns = [
    {
      title: "Product",
      key: "product",
      render: (_: unknown, product: ProductListItem) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{product.product_name_en}</Typography.Text>
          <Typography.Text type="secondary">{product.product_code}</Typography.Text>
        </Space>
      ),
    },
    { title: "Brand", dataIndex: "brand_name", key: "brand" },
    { title: "Type", dataIndex: "product_type_name", key: "type" },
    {
      title: "PIDB status",
      dataIndex: "status",
      key: "status",
      render: (value: string) => <Tag>{value}</Tag>,
    },
  ];

  return (
    <Space direction="vertical" size={24} style={{ display: "flex" }}>
      <Flex justify="space-between" align="flex-start" wrap="wrap" gap={16}>
        <div>
          <Typography.Title level={2} style={{ margin: 0 }}>Shopify Sync</Typography.Title>
          <Typography.Text type="secondary">Product knowledge publishing queue</Typography.Text>
        </div>
        <Tooltip title="Refresh products and selected sync status">
          <Button
            aria-label="Refresh Shopify sync"
            icon={<ReloadOutlined />}
            onClick={() => {
              void productsQuery.refetch();
              void statusQuery.refetch();
            }}
          />
        </Tooltip>
      </Flex>

      {!canSync && <Alert type="warning" showIcon message="Your role can view sync status but cannot start Shopify jobs." />}

      <Card title="Queue products" extra={<Badge status="processing" text={`${selectedRowKeys.length} selected`} />}>
        <Flex justify="space-between" align="center" gap={12} wrap="wrap">
          <Typography.Text type="secondary">Only products passing backend readiness and compliance gates can sync.</Typography.Text>
          <Button
            type="primary"
            icon={<SyncOutlined />}
            disabled={!canSync || selectedRowKeys.length === 0}
            loading={queueMutation.isPending}
            onClick={() => queueMutation.mutate(selectedRowKeys.map(String))}
          >
            Sync selected
          </Button>
        </Flex>
        <Table
          style={{ marginTop: 16 }}
          rowKey="id"
          loading={productsQuery.isLoading}
          dataSource={products}
          columns={columns}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
          onRow={(product) => ({ onClick: () => setSelectedProductId(product.id) })}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No products" /> }}
        />
      </Card>

      <Card title="Selected product" loading={statusQuery.isLoading}>
        {!selectedProduct ? (
          <Select
            showSearch
            allowClear
            style={{ width: "100%", maxWidth: 520 }}
            placeholder="Select a product to inspect sync status"
            optionFilterProp="label"
            options={products.map((product) => ({ label: `${product.product_code} · ${product.product_name_en}`, value: product.id }))}
            value={selectedProductId}
            onChange={setSelectedProductId}
          />
        ) : (
          <Space direction="vertical" size={20} style={{ display: "flex" }}>
            <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
              <div>
                <Typography.Title level={4} style={{ margin: 0 }}>{selectedProduct.product_name_en}</Typography.Title>
                <Typography.Text type="secondary">{selectedProduct.product_code} · {selectedProduct.brand_name}</Typography.Text>
              </div>
              <Space>
                <Button onClick={() => setSelectedProductId(undefined)}>Change product</Button>
                <Button
                  type="primary"
                  icon={<SyncOutlined />}
                  disabled={!canSync}
                  loading={syncMutation.isPending}
                  onClick={() => syncMutation.mutate(selectedProduct.id)}
                >
                  Sync product
                </Button>
              </Space>
            </Flex>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}><MetricBlock title="Sync status" value={status?.mapping?.sync_status ?? "Not synced"} /></Col>
              <Col xs={24} sm={8}><MetricBlock title="Shopify product" value={status?.mapping?.shopify_product_id ?? "-"} /></Col>
              <Col xs={24} sm={8}><MetricBlock title="Last sync" value={formatDate(status?.mapping?.last_sync_at)} /></Col>
            </Row>
            <Descriptions size="small" column={{ xs: 1, sm: 2 }}>
              <Descriptions.Item label="PIDB status"><Tag>{selectedProduct.status}</Tag></Descriptions.Item>
              <Descriptions.Item label="Shopify handle">{status?.mapping?.shopify_handle ?? "-"}</Descriptions.Item>
              <Descriptions.Item label="Last job"><SyncTag value={lastJob?.status} /></Descriptions.Item>
              <Descriptions.Item label="Attempts">{lastJob ? `${lastJob.attempts} / ${lastJob.max_attempts}` : "-"}</Descriptions.Item>
            </Descriptions>
            {lastError && <Alert type="error" showIcon icon={<WarningOutlined />} message={lastError} />}
            {lastJob?.status === "failed" && lastJob.attempts < lastJob.max_attempts && canSync && (
              <Button
                icon={<ReloadOutlined />}
                loading={retryMutation.isPending}
                onClick={() => retryMutation.mutate(lastJob.id)}
              >
                Retry last job
              </Button>
            )}
          </Space>
        )}
      </Card>

      {selectedProduct && (
        <Card title="Recent sync logs">
          <Table
            rowKey="id"
            size="small"
            dataSource={status?.logs ?? []}
            pagination={false}
            locale={{ emptyText: "No sync history" }}
            columns={[
              { title: "Action", dataIndex: "action", key: "action" },
              { title: "Status", dataIndex: "status", key: "status", render: (value: string) => <SyncTag value={value} /> },
              { title: "Attempt", dataIndex: "attempt", key: "attempt" },
              { title: "Started", dataIndex: "started_at", key: "started_at", render: formatDate },
              {
                title: "Error",
                dataIndex: "error_message",
                key: "error",
                render: (value: string | null, log: { error_code: string | null }) => value ? `${log.error_code ?? "Error"}: ${value}` : "-",
              },
            ]}
          />
        </Card>
      )}
    </Space>
  );
}
