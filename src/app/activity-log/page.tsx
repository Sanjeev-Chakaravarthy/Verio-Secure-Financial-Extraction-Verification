"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { authClient } from "@/utils/auth-client";

interface LogEntry {
  id: string;
  eventName: string;
  details: string | null;
  timestamp: string;
  user: {
    name: string;
  };
}

export default function ActivityLog() {
  const router = useRouter();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Run session check and data fetch in parallel
    Promise.all([
      authClient.getSession(),
      fetch("/api/workspace/activity").then((r) => r.json()),
    ])
      .then(([sessionRes, data]) => {
        if (!sessionRes.data?.session) {
          router.push("/login");
          return;
        }
        if (data.logs) setLogs(data.logs);
      })
      .catch((err) => console.error("Error loading activity logs:", err))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);


  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <div className="flex-1 md:ml-64 flex flex-col">
        <Navbar />

        <main className="flex-grow w-full bg-background flex flex-col">
          {/* Page Header */}
          <header className="px-margin-page py-3xl border-b border-outline-variant">
            <h1 className="font-serif text-display-lg text-[40px] text-primary font-bold tracking-tighter">
              Activity Log
            </h1>
            <p className="font-sans text-body-md text-[14px] text-on-surface-variant mt-sm max-w-2xl">
              A chronological record of system events, authentication states, and administrative actions.
            </p>
          </header>

          {/* Data Canvas */}
          <div className="px-margin-page py-lg flex-1">
            <div className="flex flex-col">
              {loading ? (
                <div className="py-md text-center font-sans text-body-md text-on-surface-variant">
                  Loading activity history...
                </div>
              ) : logs.length === 0 ? (
                <div className="py-md text-center font-sans text-body-md text-on-surface-variant">
                  No activity logged yet.
                </div>
              ) : (
                logs.map((log) => {
                  const logTime = new Date(log.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const logDate = new Date(log.timestamp).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                  });

                  return (
                    <div
                      key={log.id}
                      className="flex flex-col sm:flex-row py-md border-b border-outline-variant hover:bg-surface transition-colors duration-150 group"
                    >
                      {/* Timestamp */}
                      <div className="w-full sm:w-48 flex-shrink-0 pt-base">
                        <span className="font-mono text-[13px] text-on-surface-variant">
                          {logDate}, {logTime}
                        </span>
                      </div>

                      {/* Event details */}
                      <div className="flex-1 flex flex-col sm:flex-row gap-xs sm:gap-md items-baseline pt-base">
                        <span className="font-sans text-label-sm text-[12px] text-primary w-40 font-semibold uppercase tracking-wider">
                          {log.user.name}
                        </span>
                        <span className="font-sans text-body-md text-[14px] text-on-surface w-40 font-medium">
                          {log.eventName}
                        </span>
                        <span className="font-mono text-[13px] text-on-surface-variant truncate max-w-sm">
                          {log.details || "—"}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}

              {/* End of Log Indicator */}
              <div className="py-lg flex justify-center opacity-50">
                <span className="material-symbols-outlined text-outline">more_horiz</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
