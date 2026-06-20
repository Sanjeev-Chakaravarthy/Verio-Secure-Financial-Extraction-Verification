"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { authClient } from "@/utils/auth-client";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  name: string;
  email: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [workspaceName, setWorkspaceName] = useState("Loading...");
  const [role, setRole] = useState("Member");
  const [loading, setLoading] = useState(true);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    authClient.getSession().then(async (res) => {
      if (!res.data?.session) {
        router.push("/login");
        return;
      }
      const user = res.data.user;
      setProfile(user as UserProfile);
      setEditName(user.name || "");

      // Fetch workspace info and role
      try {
        const [statsRes, membersRes] = await Promise.all([
          fetch("/api/workspace/stats").then((r) => r.json()),
          fetch("/api/workspace/members").then((r) => r.json()),
        ]);
        if (statsRes.workspaceName) setWorkspaceName(statsRes.workspaceName);
        if (membersRes.members) {
          const self = membersRes.members.find(
            (m: { user: { id: string }; role: string }) => m.user.id === user.id
          );
          if (self) setRole(self.role);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    });
  }, [router]);

  const handleSaveName = async () => {
    if (!editName.trim() || editName === profile?.name) return;
    setSaving(true);
    try {
      await authClient.updateUser({ name: editName.trim() });
      setProfile((prev) => prev ? { ...prev, name: editName.trim() } : prev);
      toast.success("Display name updated successfully.");
    } catch {
      toast.error("Failed to update name. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await authClient.signOut();
    toast.success("Signed out successfully.");
    router.push("/login");
  };

  const initials = profile?.name
    ? profile.name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase()
    : "?";

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
                Profile
              </h1>
              <p className="font-sans text-[14px] text-on-surface-variant">
                Manage your personal details and account settings.
              </p>
            </div>

            {loading ? (
              <div className="py-xl text-center font-sans text-body-md text-on-surface-variant">
                Loading profile...
              </div>
            ) : (
              <div className="flex flex-col gap-2xl">
                {/* Avatar + Identity Card */}
                <div className="border border-outline-variant bg-white p-xl flex items-start gap-xl">
                  {/* Avatar */}
                  <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <span className="font-serif text-white text-[24px] select-none">{initials}</span>
                  </div>
                  {/* Identity */}
                  <div className="flex flex-col gap-xs flex-1">
                    <p className="font-serif text-[22px] text-primary leading-tight">{profile?.name}</p>
                    <p className="font-mono text-[13px] text-on-surface-variant">{profile?.email}</p>
                    <div className="flex items-center gap-sm mt-xs">
                      <span className="inline-block px-sm py-base border border-outline-variant text-primary font-sans text-[10px] uppercase tracking-widest">
                        {role}
                      </span>
                      <span className="font-sans text-[12px] text-on-surface-variant">·</span>
                      <span className="font-mono text-[12px] text-on-surface-variant">{workspaceName}</span>
                    </div>
                  </div>
                </div>

                {/* Edit Name */}
                <div className="border border-outline-variant bg-white p-xl">
                  <h2 className="font-sans text-label-sm text-[11px] text-on-surface-variant uppercase tracking-widest font-semibold mb-lg">
                    Display Name
                  </h2>
                  <div className="flex flex-col sm:flex-row gap-md items-end">
                    <div className="flex-1 w-full">
                      <label className="block font-sans text-[12px] text-on-surface-variant mb-xs" htmlFor="display-name">
                        Full Name
                      </label>
                      <input
                        id="display-name"
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full bg-transparent border-0 border-b border-outline-variant focus:border-primary focus:outline-none focus:ring-0 py-sm px-0 font-sans text-[14px] text-primary placeholder:text-on-surface-variant/50 transition-colors"
                        placeholder="Your full name"
                      />
                    </div>
                    <button
                      onClick={handleSaveName}
                      disabled={saving || editName === profile?.name || !editName.trim()}
                      className="w-full sm:w-auto bg-primary text-on-primary font-sans text-[12px] uppercase tracking-widest py-sm px-xl border border-primary hover:opacity-90 transition-opacity rounded-none disabled:opacity-40 disabled:cursor-not-allowed h-[38px]"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>

                {/* Account Info */}
                <div className="border border-outline-variant bg-white p-xl">
                  <h2 className="font-sans text-label-sm text-[11px] text-on-surface-variant uppercase tracking-widest font-semibold mb-lg">
                    Account Details
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-xl">
                    <div>
                      <p className="font-sans text-[10px] text-on-surface-variant uppercase tracking-widest mb-xs font-semibold">Email</p>
                      <p className="font-mono text-[13px] text-primary">{profile?.email}</p>
                    </div>
                    <div>
                      <p className="font-sans text-[10px] text-on-surface-variant uppercase tracking-widest mb-xs font-semibold">Workspace</p>
                      <p className="font-mono text-[13px] text-primary">{workspaceName}</p>
                    </div>
                    <div>
                      <p className="font-sans text-[10px] text-on-surface-variant uppercase tracking-widest mb-xs font-semibold">Role</p>
                      <p className="font-mono text-[13px] text-primary">{role}</p>
                    </div>
                    <div>
                      <p className="font-sans text-[10px] text-on-surface-variant uppercase tracking-widest mb-xs font-semibold">User ID</p>
                      <p className="font-mono text-[11px] text-on-surface-variant truncate">{profile?.id}</p>
                    </div>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="border border-outline-variant p-xl">
                  <h2 className="font-sans text-label-sm text-[11px] text-error uppercase tracking-widest font-semibold mb-lg">
                    Session
                  </h2>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-sans text-[14px] text-primary font-semibold">Sign out of Verio</p>
                      <p className="font-sans text-[12px] text-on-surface-variant mt-xs">
                        Your session will be immediately invalidated on the server.
                      </p>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="flex-shrink-0 ml-xl px-xl py-sm border border-error text-error font-sans text-[12px] uppercase tracking-widest hover:bg-error hover:text-white transition-all rounded-none"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
