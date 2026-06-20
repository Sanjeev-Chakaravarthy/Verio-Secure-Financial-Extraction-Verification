"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { authClient } from "@/utils/auth-client";
import { toast } from "sonner";

interface Member {
  id: string;
  role: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface PendingInvite {
  id: string;
  email: string;
  expiresAt: string;
}

export default function Members() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [email, setEmail] = useState("");
  const [workspaceName, setWorkspaceName] = useState("Loading...");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>("Member");
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setLoading(true);

    Promise.all([
      fetch("/api/workspace/members").then((r) => r.json()),
      fetch("/api/workspace/members/pending").then((r) => r.json()),
      fetch("/api/workspace/stats").then((r) => r.json()),
    ])
      .then(([membersData, pendingData, statsData]) => {
        if (membersData.members) {
          setMembers(membersData.members);
          authClient.getSession().then((sessionRes) => {
            if (sessionRes.data?.user) {
              const uId = sessionRes.data.user.id;
              setCurrentUserId(uId);
              const selfMember = membersData.members.find((m: Member) => m.user.id === uId);
              if (selfMember) setCurrentUserRole(selfMember.role);
            }
          });
        }
        if (pendingData.invites) setPendingInvites(pendingData.invites);
        if (statsData.workspaceName) setWorkspaceName(statsData.workspaceName);
      })
      .catch((err) => console.error("Error loading members:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    authClient.getSession().then((res) => {
      if (!res.data?.session) {
        router.push("/login");
      } else {
        loadData();
      }
    });
  }, [router]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    const invitedEmail = email;
    try {
      const res = await fetch("/api/workspace/members/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: invitedEmail }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        toast.error(data.error || `Server error (${res.status}). Please try again.`);
      } else {
        toast.success(`Invite sent to ${invitedEmail}! They'll receive an email with a join link.`);
        setEmail("");
        loadData();
      }
    } catch {
      toast.error("Network error — could not reach server. Please try again.");
    }
  };

  const handleCancelInvite = async (inviteId: string, inviteEmail: string) => {
    toast(`Cancel invite for ${inviteEmail}?`, {
      action: {
        label: "Cancel Invite",
        onClick: async () => {
          try {
            const res = await fetch(`/api/workspace/members/invite/${inviteId}`, {
              method: "DELETE",
            });
            const data = await res.json();
            if (data.error) {
              toast.error(data.error);
            } else {
              toast.success("Invite cancelled.");
              loadData();
            }
          } catch {
            toast.error("Failed to cancel invite.");
          }
        },
      },
      cancel: { label: "Keep", onClick: () => {} },
    });
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/workspace/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success("Member role updated successfully.");
        loadData();
      }
    } catch {
      toast.error("Failed to update role.");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    toast("Remove this member from the workspace?", {
      action: {
        label: "Remove",
        onClick: async () => {
          try {
            const res = await fetch(`/api/workspace/members/${memberId}`, {
              method: "DELETE",
            });
            const data = await res.json();
            if (data.error) {
              toast.error(data.error);
            } else {
              toast.success("Member removed successfully.");
              loadData();
            }
          } catch {
            toast.error("Failed to remove member.");
          }
        },
      },
      cancel: { label: "Cancel", onClick: () => {} },
    });
  };

  const isOwner = currentUserRole === "Owner";
  const totalCount = members.length + pendingInvites.length;

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase() || "?";

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <div className="flex-1 md:ml-64 flex flex-col">
        <Navbar />

        <main className="flex-grow w-full">
          <div className="max-w-[1024px] mx-auto px-lg md:px-margin-page py-xl md:py-3xl">

            {/* Page Header */}
            <div className="mb-xl md:mb-3xl">
              <h1 className="font-serif text-display-lg text-[40px] text-primary tracking-tight mb-xs">
                Members
              </h1>
              <p className="font-sans text-body-lg text-[16px] text-on-surface-variant">
                {workspaceName} — {members.length} Active · {pendingInvites.length} Pending
              </p>
            </div>

            {/* ── Active Members Table ── */}
            <div className="mb-xs">
              <p className="font-sans text-label-sm text-[11px] text-on-surface-variant uppercase tracking-widest mb-sm">
                Active Members
              </p>
            </div>

            <div className="w-full border-t border-b border-outline-variant flex flex-col">
              {/* Table Header */}
              <div className="flex items-center px-sm py-md border-b border-outline-variant bg-surface-container-low text-on-surface-variant">
                <div className="flex-1 font-sans text-label-sm text-[12px] uppercase font-semibold tracking-wider">Name</div>
                <div className="flex-1 hidden md:block font-sans text-label-sm text-[12px] uppercase font-semibold tracking-wider">Email</div>
                <div className="w-52 text-right font-sans text-label-sm text-[12px] uppercase font-semibold tracking-wider">Actions</div>
              </div>

              <div className="flex flex-col">
                {loading ? (
                  <div className="py-xl text-center font-sans text-body-md text-on-surface-variant">
                    Loading workspace members...
                  </div>
                ) : members.length === 0 ? (
                  <div className="py-xl text-center font-sans text-body-md text-on-surface-variant opacity-60">
                    No active members yet.
                  </div>
                ) : (
                  members.map((member) => {
                    const isSelf = member.user.id === currentUserId;
                    return (
                      <div
                        key={member.id}
                        className="flex items-center px-sm py-md border-b border-outline-variant hover:bg-surface-container-low transition-colors duration-150"
                      >
                        {/* Name + Avatar */}
                        <div className="flex-1 flex items-center gap-md">
                          <div className="w-8 h-8 rounded-full bg-surface-container-highest border border-outline-variant flex items-center justify-center flex-shrink-0 text-primary font-mono text-[12px]">
                            {getInitials(member.user.name)}
                          </div>
                          <div>
                            <span className="font-sans text-body-md text-[14px] text-primary font-semibold block">
                              {member.user.name}
                              {isSelf && (
                                <span className="ml-xs font-sans text-[10px] text-on-surface-variant font-normal normal-case tracking-normal">(you)</span>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Email */}
                        <div className="flex-1 hidden md:block font-mono text-[13px] text-on-surface-variant">
                          {member.user.email}
                        </div>

                        {/* Actions */}
                        <div className="w-52 flex justify-end items-center gap-sm">
                          {isOwner && !isSelf ? (
                            <>
                              <select
                                value={member.role}
                                onChange={(e) => handleRoleChange(member.id, e.target.value)}
                                className="bg-transparent border border-outline-variant font-sans text-label-sm text-[11px] text-primary focus:outline-none px-xs py-1 rounded-none cursor-pointer"
                              >
                                <option value="Member">Member</option>
                                <option value="Owner">Owner</option>
                              </select>
                              <button
                                onClick={() => handleRemoveMember(member.id)}
                                className="text-error hover:opacity-75 font-sans text-label-sm text-[11px] uppercase tracking-wider underline underline-offset-4"
                              >
                                Remove
                              </button>
                            </>
                          ) : (
                            <span className="inline-block px-xs py-1 border border-outline-variant text-primary font-sans text-label-sm text-[10px] uppercase tracking-wider bg-surface">
                              {member.role}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ── Pending Invitations Table ── */}
            <div className="mt-2xl md:mt-3xl">
              <p className="font-sans text-label-sm text-[11px] text-on-surface-variant uppercase tracking-widest mb-sm">
                Pending Invitations
              </p>

              <div className="w-full border-t border-b border-outline-variant flex flex-col">
                <div className="flex items-center px-sm py-md border-b border-outline-variant bg-surface-container-low text-on-surface-variant">
                  <div className="flex-1 font-sans text-label-sm text-[12px] uppercase font-semibold tracking-wider">Email</div>
                  <div className="flex-1 hidden md:block font-sans text-label-sm text-[12px] uppercase font-semibold tracking-wider">Status</div>
                  <div className="w-52 text-right font-sans text-label-sm text-[12px] uppercase font-semibold tracking-wider">Actions</div>
                </div>

                <div className="flex flex-col">
                  {loading ? (
                    <div className="py-md text-center font-sans text-body-md text-on-surface-variant opacity-60">
                      Loading...
                    </div>
                  ) : pendingInvites.length === 0 ? (
                    <div className="py-xl text-center font-sans text-body-md text-on-surface-variant opacity-50">
                      No pending invitations.
                    </div>
                  ) : (
                    pendingInvites.map((invite) => {
                      const emailInitial = invite.email[0]?.toUpperCase() || "?";
                      return (
                        <div
                          key={invite.id}
                          className="flex items-center px-sm py-md border-b border-outline-variant hover:bg-surface-container-low transition-colors duration-150"
                        >
                          {/* Email + Avatar */}
                          <div className="flex-1 flex items-center gap-md">
                            <div className="w-8 h-8 rounded-full bg-surface-container-highest border border-dashed border-outline-variant flex items-center justify-center flex-shrink-0 text-on-surface-variant font-mono text-[12px]">
                              {emailInitial}
                            </div>
                            <span className="font-mono text-[13px] text-on-surface-variant">
                              {invite.email}
                            </span>
                          </div>

                          {/* Status */}
                          <div className="flex-1 hidden md:flex items-center gap-xs">
                            <span className="inline-flex items-center gap-xs px-xs py-[2px] border border-amber-300 bg-amber-50 text-amber-700 font-sans text-[10px] uppercase tracking-wider">
                              <span className="w-[6px] h-[6px] rounded-full bg-amber-400 inline-block animate-pulse" />
                              Invited — Pending
                            </span>
                          </div>

                          {/* Actions */}
                          <div className="w-52 flex justify-end items-center gap-sm">
                            {isOwner ? (
                              <button
                                onClick={() => handleCancelInvite(invite.id, invite.email)}
                                className="text-on-surface-variant hover:text-error font-sans text-label-sm text-[11px] uppercase tracking-wider underline underline-offset-4 transition-colors"
                              >
                                Cancel Invite
                              </button>
                            ) : (
                              <span className="font-sans text-[10px] text-on-surface-variant opacity-50">—</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* ── Invite Section ── */}
            {isOwner && (
              <div className="mt-2xl md:mt-3xl max-w-md">
                <h2 className="font-serif text-headline-md text-[20px] text-primary mb-lg">Invite member</h2>

                <form onSubmit={handleInvite} className="flex flex-col sm:flex-row items-end gap-md">
                  <div className="flex-1 w-full relative">
                    <label className="block font-sans text-label-sm text-[12px] text-on-surface-variant mb-[4px]" htmlFor="invite-email">
                      Email address
                    </label>
                    <input
                      id="invite-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="colleague@company.com"
                      className="w-full bg-transparent border-0 border-b border-outline-variant px-0 py-sm font-sans text-body-md text-[14px] text-primary placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-0 focus:border-primary transition-colors rounded-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full sm:w-auto bg-primary text-on-primary font-sans text-label-sm text-[12px] uppercase tracking-widest py-sm px-lg rounded-none hover:opacity-90 transition-opacity flex-shrink-0 border border-primary h-[38px]"
                  >
                    Invite
                  </button>
                </form>
                <p className="font-sans text-body-md text-[12px] text-on-surface-variant mt-sm md:mt-md opacity-70">
                  They will receive a join link via email. You can cancel the invite at any time above.
                </p>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
