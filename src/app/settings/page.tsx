"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { authClient } from "@/utils/auth-client";
import { toast } from "sonner";

interface WorkspaceInfo {
  id: string;
  name: string;
  role: string;
  membersCount: number;
}

export default function WorkspaceSettings() {
  const router = useRouter();
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);
  const [editName, setEditName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchWorkspaceSettings = async () => {
    setLoading(true);
    try {
      const [sessionRes, statsRes, membersRes] = await Promise.all([
        authClient.getSession(),
        fetch("/api/workspace/stats").then((r) => r.json()),
        fetch("/api/workspace/members").then((r) => r.json()),
      ]);

      if (!sessionRes.data?.session) {
        router.push("/login");
        return;
      }

      const uId = sessionRes.data.user.id;
      let userRole = "Member";
      if (membersRes.members) {
        const selfMember = membersRes.members.find(
          (m: { user: { id: string }; role: string }) => m.user.id === uId
        );
        if (selfMember) userRole = selfMember.role;
      }

      setWorkspace({
        id: membersRes.members?.[0]?.organizationId || "unknown",
        name: statsRes.workspaceName || "Unknown Workspace",
        role: userRole,
        membersCount: statsRes.membersCount || 1,
      });
      setEditName(statsRes.workspaceName || "");
    } catch (err) {
      console.error("Failed to load workspace settings:", err);
      toast.error("Failed to load settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaceSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);


  const handleSaveWorkspaceName = async () => {
    if (!editName.trim() || editName === workspace?.name) return;
    setSaving(true);
    try {
      const res = await fetch("/api/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to update workspace name");
      }
      setWorkspace((prev) => prev ? { ...prev, name: editName.trim() } : prev);
      toast.success("Workspace name updated successfully. Please refresh or reload.");
      // Trigger reloading window/sidebar state
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const isOwner = workspace?.role === "Owner";

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <div className="flex-1 md:ml-64 flex flex-col">
        <Navbar />

        <main className="flex-1 px-margin-page py-3xl">
          <div className="max-w-[720px] mx-auto">
            {/* Header */}
            <div className="mb-3xl">
              <h1 className="font-serif text-[40px] leading-tight text-primary tracking-tight mb-xs">
                Workspace Settings
              </h1>
              <p className="font-sans text-[14px] text-on-surface-variant">
                Configure team workspace attributes and administrative controls.
              </p>
            </div>

            {loading ? (
              <div className="py-xl text-center font-sans text-body-md text-on-surface-variant">
                Loading workspace settings...
              </div>
            ) : (
              <div className="flex flex-col gap-2xl">
                {/* General Info Card */}
                <div className="border border-outline-variant bg-white p-xl flex flex-col gap-lg">
                  <h2 className="font-sans text-label-sm text-[11px] text-on-surface-variant uppercase tracking-widest font-semibold">
                    Workspace Attributes
                  </h2>

                  <div className="flex flex-col sm:flex-row gap-md items-end">
                    <div className="flex-1 w-full">
                      <label className="block font-sans text-[12px] text-on-surface-variant mb-xs" htmlFor="workspace-name">
                        Workspace Name
                      </label>
                      <input
                        id="workspace-name"
                        type="text"
                        disabled={!isOwner}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full bg-transparent border-0 border-b border-outline-variant focus:border-primary focus:outline-none focus:ring-0 py-sm px-0 font-sans text-[14px] text-primary placeholder:text-on-surface-variant/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        placeholder="Organization name"
                      />
                    </div>
                    {isOwner && (
                      <button
                        onClick={handleSaveWorkspaceName}
                        disabled={saving || editName === workspace?.name || !editName.trim()}
                        className="w-full sm:w-auto bg-primary text-on-primary font-sans text-[12px] uppercase tracking-widest py-sm px-xl border border-primary hover:opacity-90 transition-opacity rounded-none disabled:opacity-40 disabled:cursor-not-allowed h-[38px]"
                      >
                        {saving ? "Saving..." : "Save"}
                      </button>
                    )}
                  </div>

                  {!isOwner && (
                    <div className="flex items-start gap-xs text-[11px] text-on-surface-variant opacity-75">
                      <span className="material-symbols-outlined text-[16px] text-outline mt-[1px]">info</span>
                      <p className="font-sans">Only workspace Owners can rename this workspace.</p>
                    </div>
                  )}
                </div>

                {/* Technical / Metadata details */}
                <div className="border border-outline-variant bg-white p-xl">
                  <h2 className="font-sans text-label-sm text-[11px] text-on-surface-variant uppercase tracking-widest font-semibold mb-lg">
                    Administrative Metadata
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-xl">
                    <div>
                      <p className="font-sans text-[10px] text-on-surface-variant uppercase tracking-widest mb-xs font-semibold">Workspace ID</p>
                      <p className="font-mono text-[13px] text-primary truncate" title={workspace?.id}>{workspace?.id}</p>
                    </div>
                    <div>
                      <p className="font-sans text-[10px] text-on-surface-variant uppercase tracking-widest mb-xs font-semibold">Members Registered</p>
                      <p className="font-mono text-[13px] text-primary">{workspace?.membersCount} Members</p>
                    </div>
                    <div>
                      <p className="font-sans text-[10px] text-on-surface-variant uppercase tracking-widest mb-xs font-semibold">Your Role</p>
                      <p className="font-mono text-[13px] text-primary">{workspace?.role}</p>
                    </div>
                    <div>
                      <p className="font-sans text-[10px] text-on-surface-variant uppercase tracking-widest mb-xs font-semibold">Isolation Sandbox</p>
                      <p className="font-sans text-[13px] text-primary font-semibold text-green-700 flex items-center gap-xs">
                        <span className="w-1.5 h-1.5 bg-green-600 rounded-full" /> Verified Active
                      </p>
                    </div>
                  </div>
                </div>

                {/* Danger Zone */}
                {isOwner && (
                  <div className="border border-error/30 p-xl bg-error-container/10">
                    <h2 className="font-sans text-label-sm text-[11px] text-error uppercase tracking-widest font-semibold mb-lg">
                      Danger Zone
                    </h2>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-sans text-[14px] text-primary font-semibold">Delete Workspace Sandbox</p>
                        <p className="font-sans text-[12px] text-on-surface-variant mt-xs max-w-sm leading-normal">
                          Permanently delete all transaction ledgers and access configurations. This action is irreversible.
                        </p>
                      </div>
                      <button
                        onClick={() => toast.error("Workspace deletion is administrative restricted. Please contact support.")}
                        className="flex-shrink-0 ml-xl px-xl py-sm border border-error text-error font-sans text-[12px] uppercase tracking-widest hover:bg-error hover:text-white transition-all rounded-none"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
