import { useQuery } from "@tanstack/react-query";
import { Alert, Card, Descriptions, Skeleton, Space, Tag, Typography } from "antd";

import { getSettings } from "../../api/admin";

export function Settings() {
  const query = useQuery({ queryKey: ["settings"], queryFn: getSettings });
  if (query.isLoading) return <Skeleton active />;
  if (query.isError) return <Alert type="error" showIcon message="Settings could not be loaded" />;
  const settings = query.data;
  return <Space direction="vertical" size={24} style={{ display: "flex" }}>
    <div><Typography.Title level={2} style={{ margin: 0 }}>Settings</Typography.Title><Typography.Text type="secondary">Runtime configuration and integration status</Typography.Text></div>
    <Card><Descriptions bordered column={{ xs: 1, sm: 2 }}>
      <Descriptions.Item label="Application">{settings?.app_name}</Descriptions.Item>
      <Descriptions.Item label="Environment"><Tag>{settings?.app_env}</Tag></Descriptions.Item>
      <Descriptions.Item label="Public URL">{settings?.public_base_url}</Descriptions.Item>
      <Descriptions.Item label="API prefix">{settings?.api_prefix}</Descriptions.Item>
      <Descriptions.Item label="Shopify"><Tag color={settings?.shopify_configured ? "success" : "default"}>{settings?.shopify_configured ? "Configured" : "Not configured"}</Tag></Descriptions.Item>
      <Descriptions.Item label="Shopify API version">{settings?.shopify_api_version}</Descriptions.Item>
      <Descriptions.Item label="Refresh token lifetime">{settings?.refresh_token_expire_days} days</Descriptions.Item>
    </Descriptions></Card>
  </Space>;
}
