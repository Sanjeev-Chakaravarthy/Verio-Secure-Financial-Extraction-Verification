"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authClient } from "@/utils/auth-client";
import Brand from "@/components/Brand";

interface Workspace {
  id: string;
  name: string;
  role: string;
  isActive: boolean;
}

interface SidebarProps {
  workspaceName?: string;
}

export default function Sidebar({ workspaceName = "Loading..." }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [activeWorkspace, setActiveWorkspace] = useState(workspaceName);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    // Fetch current workspace stats (also handles redirect for new users)
    fetch("/api/workspace/stats")
      .then((res) => {
        if (res.status === 401) {
          // No workspace yet — try to auto-accept any pending invite first
          fetch("/api/workspace/accept-invite", { method: "POST" })
            .then((r) => r.json())
            .then((d) => {
              if (d.joined) {
                window.location.reload();
              } else {
                router.push("/complete-setup");
              }
            })
            .catch(() => router.push("/complete-setup"));
          return;
        }
        return res.json();
      })
      .then((data) => {
        if (data && data.workspaceName) {
          setActiveWorkspace(data.workspaceName);
        }
      })
      .catch(() => {});

    // Fetch all workspaces the user belongs to
    fetch("/api/workspace/list")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.workspaces) {
          setWorkspaces(data.workspaces);
        }
      })
      .catch(() => {});
  }, [router]);

  const handleSwitchWorkspace = async (orgId: string) => {
    setSwitching(true);
    try {
      const res = await fetch("/api/workspace/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: orgId }),
      });
      const data = await res.json();
      if (data.success) {
        // Reload the entire page to refresh all data with new workspace context
        window.location.reload();
      }
    } catch {
      // Silently fail — user can retry
    } finally {
      setSwitching(false);
      setShowSwitcher(false);
    }
  };

  const handleLogout = async () => {
    await authClient.signOut();
    router.push("/login");
  };

  const navItems = [
    { name: "Parse", path: "/dashboard", icon: "dashboard_customize" },
    { name: "Transactions", path: "/transactions", icon: "receipt_long" },
    { name: "Members", path: "/members", icon: "group" },
    { name: "Workspace Settings", path: "/settings", icon: "settings" },
    { name: "Activity Log", path: "/activity-log", icon: "history" },
    { name: "How It Works", path: "/how-it-works", icon: "help" },
  ];

  return (
    <aside className="hidden md:flex flex-col h-screen w-64 bg-surface-container-low py-lg px-md gap-xs border-r border-outline-variant fixed left-0 top-0 z-50">
      {/* Brand Header */}
      <div className="flex flex-col gap-base mb-xl px-xs">
        <Brand theme="light" />
        <div className="mt-md relative">
          <p className="font-sans text-label-sm text-[10px] uppercase tracking-widest text-on-surface-variant opacity-70">
            Secure Workspace
          </p>
          <button
            onClick={() => setShowSwitcher(!showSwitcher)}
            className="flex items-center gap-xs w-full text-left group mt-[2px]"
            title="Switch workspace"
          >
            <p className="font-mono text-mono-data text-primary text-[13px] truncate flex-1">
              {activeWorkspace}
            </p>
            {workspaces.length > 1 && (
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant opacity-50 group-hover:opacity-100 transition-opacity">
                {showSwitcher ? "expand_less" : "unfold_more"}
              </span>
            )}
          </button>

          {/* Workspace Switcher Dropdown */}
          {showSwitcher && workspaces.length > 1 && (
            <div className="absolute top-full left-0 w-[calc(100%+16px)] mt-xs bg-surface-container-lowest border border-outline-variant shadow-lg z-50 overflow-hidden">
              <p className="px-sm py-xs font-sans text-[10px] uppercase tracking-widest text-on-surface-variant opacity-60 border-b border-outline-variant/50">
                Switch workspace
              </p>
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => handleSwitchWorkspace(ws.id)}
                  disabled={switching || ws.isActive}
                  className={`w-full text-left px-sm py-xs flex items-center gap-xs transition-colors ${
                    ws.isActive
                      ? "bg-secondary-container text-primary border-l-2 border-primary"
                      : "hover:bg-surface-container-highest text-on-surface-variant border-l-2 border-transparent"
                  }`}
                >
                  <span className="font-mono text-[11px] truncate flex-1 min-w-0">
                    {ws.name}
                  </span>
                  <span className="font-sans text-[8px] uppercase tracking-wider opacity-50 shrink-0">
                    {ws.role}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-base">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-md px-sm py-xs transition-all duration-200 ${
                isActive
                  ? "bg-secondary-container text-primary font-semibold translate-x-1"
                  : "text-on-surface-variant hover:bg-surface-container-highest"
              }`}
            >
              <span className={`material-symbols-outlined text-[20px] ${isActive ? "filled" : ""}`}>
                {item.icon}
              </span>
              <span className="font-sans text-label-sm text-[12px]">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Actions */}
      <div className="mt-auto pt-lg border-t border-outline-variant/30 space-y-base">
        <Link
          href="/help"
          className="flex items-center gap-md px-sm py-xs text-on-surface-variant hover:bg-surface-container-highest transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">help_outline</span>
          <span className="font-sans text-label-sm text-[12px]">Help Center</span>
        </Link>
        <Link
          href="/profile"
          className="flex items-center gap-md px-sm py-xs text-on-surface-variant hover:bg-surface-container-highest transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">account_circle</span>
          <span className="font-sans text-label-sm text-[12px]">My Profile</span>
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-md px-sm py-xs text-on-surface-variant hover:bg-surface-container-highest text-left transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          <span className="font-sans text-label-sm text-[12px]">Log out</span>
        </button>
      </div>
    </aside>
  );
}
