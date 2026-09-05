import { useQuery } from "@tanstack/react-query";
import { Card, Col, Row, Skeleton, Statistic, Tag, Typography } from "antd";

import { getDashboardStats } from "../../api/admin";

export function Dashboard() {
  const query = useQuery({ queryKey: ["dashboard-stats"], queryFn: getDashboardStats, refetchInterval: 30_000 });
  if (query.isLoading) return <Skeleton active />;
  const stats = query.data;
  return (
    <>
      <Typography.Title level={2}>Dashboard</Typography.Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}><Card><Statistic title="Products" value={stats?.products_total ?? 0} /></Card></Col>
        <Col xs={24} md={8}><Card><Statistic title="Needs review" value={stats?.needs_review ?? 0} /></Card></Col>
        <Col xs={24} md={8}><Card><Statistic title="Compliance review" value={stats?.compliance_review ?? 0} /></Card></Col>
        <Col xs={24} md={8}><Card><Statistic title="Shopify pending" value={stats?.shopify_pending ?? 0} /></Card></Col>
        <Col xs={24} md={8}><Card><Statistic title="Shopify failed" value={stats?.shopify_failed ?? 0} /></Card></Col>
        <Col xs={24} md={8}><Card><Statistic title="Shopify succeeded" value={stats?.shopify_succeeded ?? 0} /></Card></Col>
      </Row>
      <Typography.Title level={4}>Product lifecycle</Typography.Title>
      {Object.entries(stats?.products_by_status ?? {}).map(([status, count]) => <Tag key={status}>{status}: {count}</Tag>)}
    </>
  );
}
