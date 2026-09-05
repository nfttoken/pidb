import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Empty,
  Flex,
  QRCode,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  CopyOutlined,
  DownloadOutlined,
  LinkOutlined,
  QrcodeOutlined,
  ReloadOutlined,
  StopOutlined,
} from "@ant-design/icons";

import { listProducts } from "../../api/products";
import { createProductQr, deactivateQr, listQrCodes, regenerateQr } from "../../api/qr";
import { useAuthStore } from "../../stores/auth";
import type { ProductListItem } from "../../types/product";
import type { QrListItem, QrResponse } from "../../types/qr";

export function QrManagement() {
  const queryClient = useQueryClient();
  const user = useAuthStore().user;
  const canGenerate = user?.role === "admin" || user?.role === "editor";
  const [selectedProductId, setSelectedProductId] = useState<string>();
  const [qr, setQr] = useState<QrResponse>();
  const qrPreviewRef = useRef<HTMLDivElement>(null);
  const productsQuery = useQuery({
    queryKey: ["products", "qr-management"],
    queryFn: () => listProducts({}),
  });
  const qrsQuery = useQuery({ queryKey: ["qr-codes"], queryFn: listQrCodes });
  const generateMutation = useMutation({
    mutationFn: (productId: string) => createProductQr(productId),
    onSuccess: (createdQr) => {
      setQr(createdQr);
      void queryClient.invalidateQueries({ queryKey: ["qr-codes"] });
      message.success("QR code generated");
    },
    onError: () => message.error("QR code could not be generated"),
  });
  const deactivateMutation = useMutation({
    mutationFn: deactivateQr,
    onSuccess: (updatedQr) => {
      setQr((current) => current?.short_code === updatedQr.short_code ? updatedQr : current);
      void queryClient.invalidateQueries({ queryKey: ["qr-codes"] });
      message.success("QR code deactivated");
    },
    onError: () => message.error("QR code could not be deactivated"),
  });
  const regenerateMutation = useMutation({
    mutationFn: regenerateQr,
    onSuccess: (newQr) => {
      setQr(newQr);
      void queryClient.invalidateQueries({ queryKey: ["qr-codes"] });
      message.success("QR code regenerated");
    },
    onError: () => message.error("QR code could not be regenerated"),
  });

  const products = productsQuery.data?.items ?? [];
  const selectedProduct = products.find((product) => product.id === selectedProductId);
  const qrRows = qrsQuery.data ?? [];

  function selectProduct(productId: string | undefined) {
    setSelectedProductId(productId);
    setQr(undefined);
  }

  function openExistingQr(row: QrListItem) {
    setSelectedProductId(row.product_id);
    setQr(row);
  }

  async function copyUrl() {
    if (!qr) return;
    try {
      await navigator.clipboard.writeText(qr.target_url);
      message.success("Public URL copied");
    } catch {
      message.error("Public URL could not be copied");
    }
  }

  function downloadQr() {
    const svg = qrPreviewRef.current?.querySelector("svg");
    if (!svg || !qr) {
      message.error("QR preview is not ready");
      return;
    }
    const svgBlob = new Blob([new XMLSerializer().serializeToString(svg)], {
      type: "image/svg+xml;charset=utf-8",
    });
    const downloadUrl = URL.createObjectURL(svgBlob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `pidb-${qr.short_code}.svg`;
    link.click();
    URL.revokeObjectURL(downloadUrl);
  }

  return (
    <Space direction="vertical" size={24} style={{ display: "flex" }}>
      <Flex justify="space-between" align="flex-start" wrap="wrap" gap={16}>
        <div>
          <Typography.Title level={2} style={{ margin: 0 }}>QR Management</Typography.Title>
          <Typography.Text type="secondary">Create dynamic PIDB product links for printed QR codes</Typography.Text>
        </div>
        <Button
          aria-label="Refresh QR products"
          icon={<ReloadOutlined />}
          onClick={() => {
            void productsQuery.refetch();
            void qrsQuery.refetch();
          }}
        />
      </Flex>

      {!canGenerate && (
        <Alert
          type="warning"
          showIcon
          message="Your role can view QR details but cannot generate QR codes."
        />
      )}

      <Card title="Generate product QR">
        <Flex gap={12} align="center" wrap="wrap">
          <Select
            showSearch
            allowClear
            loading={productsQuery.isLoading}
            style={{ width: "100%", maxWidth: 560 }}
            placeholder="Select a product"
            optionFilterProp="label"
            options={products.map((product: ProductListItem) => ({
              label: `${product.product_code} · ${product.product_name_en}`,
              value: product.id,
            }))}
            value={selectedProductId}
            onChange={selectProduct}
          />
          <Button
            type="primary"
            icon={<QrcodeOutlined />}
            disabled={!canGenerate || !selectedProductId}
            loading={generateMutation.isPending}
            onClick={() => selectedProductId && generateMutation.mutate(selectedProductId)}
          >
            Generate
          </Button>
        </Flex>
        <Typography.Paragraph type="secondary" style={{ margin: "16px 0 0" }}>
          The QR code always points to a PIDB URL. Product publication and Canadian compliance are checked when the public page is opened.
        </Typography.Paragraph>
      </Card>

      <Card title="QR details" loading={Boolean(selectedProductId) && generateMutation.isPending}>
        {!selectedProduct || !qr ? (
          <Empty
            image={<QrcodeOutlined style={{ fontSize: 42, color: "#bfbfbf" }} />}
            description={selectedProduct ? "Generate a QR code for this product" : "Select a product to view QR details"}
          />
        ) : (
          <Flex gap={32} align="flex-start" wrap="wrap">
            <div ref={qrPreviewRef} style={{ flex: "0 0 220px", textAlign: "center" }}>
              <QRCode value={qr.target_url} type="svg" size={220} bordered />
              <Typography.Text type="secondary">Scan destination</Typography.Text>
            </div>
            <Space direction="vertical" size={16} style={{ minWidth: 280, flex: 1 }}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Short code"><Typography.Text code>{qr.short_code}</Typography.Text></Descriptions.Item>
                <Descriptions.Item label="Product">{selectedProduct.product_name_en}</Descriptions.Item>
                <Descriptions.Item label="Product code">{selectedProduct.product_code}</Descriptions.Item>
                <Descriptions.Item label="Destination">{qr.destination_type}</Descriptions.Item>
                <Descriptions.Item label="Status"><Tag color={qr.status === "active" ? "success" : "default"}>{qr.status}</Tag></Descriptions.Item>
                <Descriptions.Item label="Public URL"><Typography.Text copyable={{ text: qr.target_url }}>{qr.target_url}</Typography.Text></Descriptions.Item>
              </Descriptions>
              <Space wrap>
                <Button icon={<CopyOutlined />} onClick={() => void copyUrl()}>Copy URL</Button>
                <Button icon={<DownloadOutlined />} onClick={downloadQr}>Download SVG</Button>
                <Button
                  icon={<LinkOutlined />}
                  disabled={qr.status !== "active"}
                  onClick={() => window.open(qr.target_url, "_blank", "noopener,noreferrer")}
                >
                  Open public page
                </Button>
                <Button
                  icon={<StopOutlined />}
                  disabled={!canGenerate || qr.status !== "active"}
                  loading={deactivateMutation.isPending}
                  onClick={() => deactivateMutation.mutate(qr.short_code)}
                >
                  Deactivate
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  disabled={!canGenerate}
                  loading={regenerateMutation.isPending}
                  onClick={() => regenerateMutation.mutate(qr.short_code)}
                >
                  Regenerate
                </Button>
              </Space>
            </Space>
          </Flex>
        )}
      </Card>

      <Card title="QR codes">
        <Table
          rowKey="id"
          size="small"
          loading={qrsQuery.isLoading}
          dataSource={qrRows}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          locale={{ emptyText: "No QR codes generated" }}
          columns={[
            { title: "Short code", dataIndex: "short_code", key: "short_code", render: (value: string) => <Typography.Text code>{value}</Typography.Text> },
            { title: "Product", key: "product", render: (_: unknown, row: QrListItem) => <Space direction="vertical" size={0}><Typography.Text strong>{row.product_name_en}</Typography.Text><Typography.Text type="secondary">{row.product_code}</Typography.Text></Space> },
            { title: "Destination", dataIndex: "destination_type", key: "destination" },
            { title: "Status", dataIndex: "status", key: "status", render: (value: string) => <Tag color={value === "active" ? "success" : "default"}>{value}</Tag> },
            { title: "Created", dataIndex: "created_at", key: "created", render: (value: string) => new Date(value).toLocaleString() },
            { title: "Action", key: "action", render: (_: unknown, row: QrListItem) => <Button type="link" onClick={() => openExistingQr(row)}>View</Button> },
          ]}
        />
      </Card>
    </Space>
  );
}
