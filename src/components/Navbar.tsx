"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { authClient } from "@/utils/auth-client";
import Brand from "@/components/Brand";
import Link from "next/link";

interface NavbarProps {
  onSearch?: (value: string) => void;
  searchPlaceholder?: string;
  userName?: string;
}

interface LogEntry {
  id: string;
  eventName: string;
  details: string | null;
  timestamp: string;
  user: {
    name: string;
  };
}

export default function Navbar({
  onSearch,
  searchPlaceholder = "Search archives...",
  userName,
}: NavbarProps) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(userName || "");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [lastSeen, setLastSeen] = useState<number>(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    authClient.getSession().then((res) => {
      if (res.data?.user) {
        setCurrentUser(res.data.user.name);
      }
    });

    // Load last seen notification timestamp from localStorage
    const saved = localStorage.getItem("verio_notifications_last_seen");
    if (saved) {
      setLastSeen(parseInt(saved, 10));
    }
  }, []);

  // Fetch workspace activities as notifications
  useEffect(() => {
    const fetchLogs = () => {
      fetch("/api/workspace/activity")
        .then((res) => res.json())
        .then((data) => {
          if (data.logs) {
            setLogs(data.logs);
          }
        })
        .catch((err) => console.error("Error loading activity logs for navbar:", err));
    };

    fetchLogs();
    // Poll for notifications every 30 seconds
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, []);

  // Handle click outside of dropdown to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggleNotifications = () => {
    setShowNotifications((prev) => {
      const next = !prev;
      if (next) {
        // Mark all as read
        const now = Date.now();
        setLastSeen(now);
        localStorage.setItem("verio_notifications_last_seen", now.toString());
      }
      return next;
    });
  };

  const hasUnread = logs.some((log) => new Date(log.timestamp).getTime() > lastSeen);
  const displayLogs = logs.slice(0, 5);

  const getLogTimeStr = (timestamp: string) => {
    const elapsed = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(elapsed / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <header className="sticky top-0 z-40 flex justify-between items-center w-full px-margin-page py-sm bg-surface border-b border-outline-variant h-[72px]">
      <div className="flex items-center gap-xl">
        <Brand theme="light" className="md:hidden" />
        
        {onSearch && (
          <div className="hidden lg:flex items-center border-b border-outline-variant w-64 group focus-within:border-primary transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant text-[18px]">search</span>
            <input
              type="text"
              onChange={(e) => onSearch(e.target.value)}
              className="bg-transparent border-none focus:outline-none focus:ring-0 font-sans text-body-md text-[14px] w-full py-base px-xs"
              placeholder={searchPlaceholder}
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-lg relative" ref={dropdownRef}>
        {/* Notification Bell Button */}
        <button
          onClick={handleToggleNotifications}
          className="material-symbols-outlined text-primary hover:bg-surface-container-low p-base transition-colors relative"
          title="Notifications"
        >
          notifications
          {hasUnread && (
            <span className="absolute top-[8px] right-[8px] w-2.5 h-2.5 bg-error rounded-full border border-surface" />
          )}
        </button>

        {/* Notifications Dropdown Panel */}
        {showNotifications && (
          <div className="absolute right-0 top-12 w-80 border border-outline-variant bg-white z-50 py-xs shadow-md flex flex-col max-h-[420px] overflow-hidden">
            <div className="px-md py-sm font-serif text-[15px] font-semibold text-primary border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
              <span>Workspace Notifications</span>
              {hasUnread && (
                <button
                  onClick={() => {
                    const now = Date.now();
                    setLastSeen(now);
                    localStorage.setItem("verio_notifications_last_seen", now.toString());
                  }}
                  className="font-sans text-[10px] uppercase tracking-wider text-on-surface-variant hover:text-primary transition-colors font-bold"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-outline-variant/30">
              {displayLogs.length === 0 ? (
                <div className="py-xl text-center font-sans text-[13px] text-on-surface-variant opacity-75">
                  No notifications yet.
                </div>
              ) : (
                displayLogs.map((log) => (
                  <div
                    key={log.id}
                    className="px-md py-sm hover:bg-surface-container-low transition-colors duration-150 flex flex-col gap-[2px] text-left cursor-default"
                  >
                    <div className="flex items-center justify-between gap-xs">
                      <span className="font-sans text-[10px] font-bold text-primary uppercase tracking-wider">
                        {log.eventName}
                      </span>
                      <span className="font-mono text-[9px] text-on-surface-variant flex-shrink-0">
                        {getLogTimeStr(log.timestamp)}
                      </span>
                    </div>
                    <p className="font-sans text-[13px] text-on-surface leading-tight font-medium">
                      {log.user.name} {log.eventName.toLowerCase().includes("member") ? "" : "" }
                      <span className="text-on-surface-variant font-normal">
                        {log.details ? ` — ${log.details}` : ""}
                      </span>
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-outline-variant/30 bg-surface-container-low text-center py-sm">
              <Link
                href="/activity-log"
                onClick={() => setShowNotifications(false)}
                className="font-sans text-[11px] uppercase tracking-widest text-primary font-bold hover:underline underline-offset-4"
              >
                View all activity →
              </Link>
            </div>
          </div>
        )}

        <button
          onClick={() => router.push("/help")}
          title="Help Center"
          className="material-symbols-outlined text-primary hover:bg-surface-container-low p-base transition-colors"
        >
          help_outline
        </button>
        
        <div className="flex items-center gap-sm cursor-pointer group" onClick={() => router.push("/profile")} title="View profile">
          <div className="w-8 h-8 rounded-full border border-outline-variant bg-surface-container-highest flex items-center justify-center shrink-0 font-mono text-[11px] text-primary font-semibold">
            {currentUser
              ? currentUser
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .substring(0, 2)
                  .toUpperCase()
              : "?"}
          </div>
          <span className="font-sans text-label-sm text-[12px] text-primary group-hover:opacity-80 hidden sm:inline">
            {currentUser}
          </span>
        </div>
      </div>
    </header>
  );
}
