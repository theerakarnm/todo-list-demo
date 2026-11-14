import { useState } from "react";

const STORAGE_KEY = "jotlist-sidebar-collapsed";

function readCollapsed() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

/** Desktop sidebar collapsed to an icon rail; remembered on this device. */
export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(readCollapsed);

  function toggleCollapsed() {
    localStorage.setItem(STORAGE_KEY, String(!collapsed));
    setCollapsed(!collapsed);
  }

  return { collapsed, toggleCollapsed };
}
