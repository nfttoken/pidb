import { useState } from "react";
import { Alert, Button, Card, Form, Input, Typography } from "antd";
import { useNavigate } from "react-router-dom";

import { useAuthStore } from "../../stores/auth";

export function Login() {
  const navigate = useNavigate();
  const signIn = useAuthStore().signIn;
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(values: { email: string; password: string }) {
    setError(null);
    setSubmitting(true);
    try {
      await signIn(values.email, values.password);
      navigate("/admin", { replace: true });
    } catch {
      setError("Unable to sign in with those credentials.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card style={{ width: 380, margin: "15vh auto" }}>
      <Typography.Title level={3}>PIDB Admin</Typography.Title>
      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}
      <Form layout="vertical" onFinish={handleSubmit}>
        <Form.Item label="Email" name="email" rules={[{ required: true, type: "email" }]}>
          <Input autoComplete="username" />
        </Form.Item>
        <Form.Item label="Password" name="password" rules={[{ required: true, min: 8 }]}>
          <Input.Password autoComplete="current-password" />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={submitting} block>
          Sign in
        </Button>
      </Form>
    </Card>
  );
}

