import { useEffect } from "react";
import { Spin } from "antd";

import { AppRoutes } from "./routes";
import { AuthProvider, useAuthStore } from "./stores/auth";

function Application() {
  const { loading, restore } = useAuthStore();

  useEffect(() => {
    void restore();
  }, [restore]);

  if (loading) return <Spin fullscreen />;
  return <AppRoutes />;
}

export default function App() {
  return (
    <AuthProvider>
      <Application />
    </AuthProvider>
  );
}

