"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authClient } from "@/utils/auth-client";
import Brand from "@/components/Brand";

interface SidebarProps {
  workspaceName?: string;
}

export default function Sidebar({ workspaceName = "Loading..." }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [activeWorkspace, setActiveWorkspace] = useState(workspaceName);

  useEffect(() => {
    fetch("/api/workspace/stats")
      .then((res) => {
        if (res.status === 401) {
          // No workspace yet — try to auto-accept any pending invite first
          fetch("/api/workspace/accept-invite", { method: "POST" })
            .then((r) => r.json())
            .then((d) => {
              if (d.joined) {
                // Successfully joined a workspace via invite — reload
                window.location.reload();
              } else {
                // No invite either — go to complete setup
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
  }, [router]);

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
        <div className="mt-md">
          <p className="font-sans text-label-sm text-[10px] uppercase tracking-widest text-on-surface-variant opacity-70">
            Secure Workspace
          </p>
          <p className="font-mono text-mono-data text-primary text-[13px]">{activeWorkspace}</p>
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
