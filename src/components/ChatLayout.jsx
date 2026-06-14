import { useState } from "react";
import { Outlet } from "react-router-dom";
import BottyWidget from "./BottyWidget";
import Sidebar from "./Sidebar";

const SIDEBAR_KEY = "chat_sidebar_collapsed";

export default function ChatLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_KEY) === "true",
  );

  const handleToggle = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_KEY, String(next));
      return next;
    });
  };

  return (
    <div className="flex h-screen bg-gray-900">
      <Sidebar collapsed={sidebarCollapsed} onToggle={handleToggle} />
      <main className="flex-1 flex flex-col min-h-0 min-w-0 relative">
        <Outlet />
      </main>
      <BottyWidget />
    </div>
  );
}
