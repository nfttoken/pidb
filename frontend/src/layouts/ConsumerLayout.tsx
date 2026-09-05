import { Button } from "antd";
import { Link, Outlet } from "react-router-dom";

import "../styles/consumer.css";

export function ConsumerLayout() {
  return (
    <div className="consumer-shell">
      <header className="consumer-header">
        <Link className="consumer-brand" to="/quiz">PIDB BEAUTY</Link>
        <nav className="consumer-nav" aria-label="Consumer navigation">
          <Link to="/quiz">Beauty Quiz</Link>
          <Button type="text" size="small" href="/admin">Admin</Button>
        </nav>
      </header>
      <main className="consumer-content"><Outlet /></main>
    </div>
  );
}
