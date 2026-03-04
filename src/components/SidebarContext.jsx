import React, { createContext, useContext, useState, useCallback } from "react";

const SidebarContext = createContext(null);

const STORAGE_KEY = "sidebar_collapsed";

export function SidebarProvider({ children }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch { }
      return next;
    });
  }, []);

  return (
    <SidebarContext.Provider value={{ isSidebarCollapsed, toggleSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    // Graceful fallback: if used outside the provider (should not happen)
    return { isSidebarCollapsed: false, toggleSidebar: () => { } };
  }
  return ctx;
}
