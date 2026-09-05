import { Button, Layout, Menu, Typography } from "antd";
import { AppstoreOutlined, AuditOutlined, CloudUploadOutlined, DashboardOutlined, DatabaseOutlined, FileAddOutlined, LogoutOutlined, QrcodeOutlined, SettingOutlined, TeamOutlined } from "@ant-design/icons";
import { Outlet, useNavigate } from "react-router-dom";

import { useAuthStore } from "../stores/auth";

const { Header, Sider, Content } = Layout;

export function AdminLayout() {
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider theme="light">
        <Typography.Title level={4} style={{ padding: 16, margin: 0 }}>
          PIDB
        </Typography.Title>
        <Menu
          mode="inline"
          items={[
            { key: "/admin", icon: <DashboardOutlined />, label: "Dashboard" },
            { key: "/admin/products", icon: <DatabaseOutlined />, label: "Products" },
            { key: "/admin/imports", icon: <FileAddOutlined />, label: "CSV Import" },
            { key: "/admin/shopify", icon: <CloudUploadOutlined />, label: "Shopify Sync" },
            { key: "/admin/qr", icon: <QrcodeOutlined />, label: "QR Management" },
            { key: "/admin/catalog", icon: <AppstoreOutlined />, label: "Catalog" },
            { key: "/admin/review/products", icon: <AuditOutlined />, label: "Product Review" },
            { key: "/admin/review/compliance", icon: <AuditOutlined />, label: "Compliance Review" },
            ...(user?.role === "admin" ? [{ key: "/admin/users", icon: <TeamOutlined />, label: "Users" }] : []),
            { key: "/admin/settings", icon: <SettingOutlined />, label: "Settings" },
          ]}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{ background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography.Text>Product Knowledge Master</Typography.Text>
          <span><Typography.Text style={{ marginRight: 12 }}>{user?.name}</Typography.Text><Button type="text" icon={<LogoutOutlined />} aria-label="Sign out" onClick={() => void signOut()} /></span>
        </Header>
        <Content style={{ padding: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
