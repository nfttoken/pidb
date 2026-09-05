import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Form, Input, Modal, Select, Space, Switch, Table, Tag, Typography, message } from "antd";
import { EditOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";

import { createUser, listUsers, updateUser } from "../../api/admin";
import type { User } from "../../types/auth";

type UserFormValues = { email?: string; name?: string; role?: string; password?: string; is_active?: boolean };

export function Users() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<UserFormValues>();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User>();
  const query = useQuery({ queryKey: ["users"], queryFn: listUsers });
  const mutation = useMutation({
    mutationFn: ({ id, values }: { id?: string; values: UserFormValues }) => id
      ? updateUser(id, { name: values.name, role: values.role, password: values.password, is_active: values.is_active })
      : createUser({ email: values.email ?? "", name: values.name ?? "", role: values.role ?? "editor", password: values.password ?? "" }),
    onSuccess: () => { message.success(editing ? "User updated" : "User created"); setOpen(false); setEditing(undefined); form.resetFields(); void queryClient.invalidateQueries({ queryKey: ["users"] }); },
    onError: () => message.error("User could not be saved"),
  });

  function openCreate() { setEditing(undefined); form.resetFields(); form.setFieldsValue({ role: "editor", is_active: true }); setOpen(true); }
  function openEdit(user: User) { setEditing(user); form.setFieldsValue({ name: user.name, role: user.role, is_active: user.is_active, password: "" }); setOpen(true); }

  return <Space direction="vertical" size={24} style={{ display: "flex" }}>
    <Space style={{ display: "flex", justifyContent: "space-between" }} wrap><div><Typography.Title level={2} style={{ margin: 0 }}>Users</Typography.Title><Typography.Text type="secondary">Manage Admin, Editor, and Reviewer access</Typography.Text></div><Space><Button icon={<ReloadOutlined />} aria-label="Refresh users" onClick={() => void query.refetch()} /><Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>New user</Button></Space></Space>
    <Card><Table<User> rowKey="id" loading={query.isLoading} dataSource={query.data ?? []} columns={[{ title: "Name", dataIndex: "name", key: "name" }, { title: "Email", dataIndex: "email", key: "email" }, { title: "Role", dataIndex: "role", key: "role", render: (value: string) => <Tag>{value}</Tag> }, { title: "Status", dataIndex: "is_active", key: "status", render: (value: boolean) => <Tag color={value ? "success" : "default"}>{value ? "Active" : "Inactive"}</Tag> }, { title: "Action", key: "action", render: (_: unknown, user: User) => <Button type="link" icon={<EditOutlined />} onClick={() => openEdit(user)}>Edit</Button> }]} pagination={{ pageSize: 20, showSizeChanger: false }} /></Card>
    <Modal open={open} title={editing ? "Edit user" : "New user"} okText={editing ? "Save" : "Create"} confirmLoading={mutation.isPending} onCancel={() => setOpen(false)} onOk={() => void form.submit()}>
      <Form form={form} layout="vertical" onFinish={(values) => mutation.mutate({ id: editing?.id, values })}>
        {!editing && <Form.Item label="Email" name="email" rules={[{ required: true, type: "email" }]}><Input autoComplete="username" /></Form.Item>}
        <Form.Item label="Name" name="name" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item label="Role" name="role" rules={[{ required: true }]}><Select options={["admin", "editor", "reviewer"].map((value) => ({ label: value, value }))} /></Form.Item>
        <Form.Item label={editing ? "New password (optional)" : "Password"} name="password" rules={editing ? [] : [{ required: true, min: 8 }]}><Input.Password autoComplete={editing ? "new-password" : "new-password"} /></Form.Item>
        {editing && <Form.Item label="Active" name="is_active" valuePropName="checked"><Switch /></Form.Item>}
      </Form>
    </Modal>
  </Space>;
}
