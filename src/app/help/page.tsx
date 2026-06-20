"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { authClient } from "@/utils/auth-client";

const faqs = [
  {
    q: "What is Verio?",
    a: "Verio is a secure, workspace-isolated personal finance transaction extractor. Paste raw bank statement text and Verio instantly extracts the merchant, amount, date, and category — all scoped to your organization only.",
  },
  {
    q: "How is my data isolated from other users?",
    a: "Every API query is automatically filtered by your organizationId, which is resolved server-side from your session token. You can never access another workspace's data — not through the UI, not through direct API calls.",
  },
  {
    q: "How do I parse a transaction?",
    a: "Go to the Dashboard, paste any raw bank text into the input box (e.g. from an SMS, email, or bank statement), and click Extract. Verio will parse the merchant, amount, date, and category within seconds.",
  },
  {
    q: "What text formats are supported?",
    a: "Verio supports a wide range of formats — SMS alerts (₹420 debited), structured ledger entries (Date: 12/11/2023 / Amount: -540.00), and free-form text with dates, currencies, and merchants mixed in.",
  },
  {
    q: "What does the Confidence Score mean?",
    a: "The confidence score (0–100%) reflects how many fields — merchant, amount, date, category — were successfully extracted from the raw text. A score above 88% is considered High Confidence.",
  },
  {
    q: "How do I invite teammates?",
    a: "Go to the Members page from the sidebar, scroll to 'Invite member', enter your teammate's email and click Invite. They will be added to your workspace immediately.",
  },
  {
    q: "Can I change a member's role?",
    a: "Yes, if you are the workspace Owner. On the Members page, use the role dropdown next to any member (except yourself) to promote them to Owner or demote them to Member.",
  },
  {
    q: "What is the Activity Log?",
    a: "The Activity Log records every significant event in your workspace — logins, parses, member changes, and more. It is scoped entirely to your organization.",
  },
  {
    q: "How do I log out?",
    a: "Click 'Log out' at the bottom of the sidebar. Your session is immediately invalidated on the server.",
  },
  {
    q: "Is this production-ready?",
    a: "Verio is built with production-grade patterns: Better Auth for session management, Prisma + PostgreSQL for isolated data storage, and Hono for a lightweight type-safe API layer.",
  },
];

export default function HelpCenter() {
  const router = useRouter();
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    authClient.getSession().then((res) => {
      if (!res.data?.session) router.push("/login");
    });
  }, [router]);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <div className="flex-1 md:ml-64 flex flex-col">
        <Navbar />

        <main className="flex-1 px-margin-page py-3xl">
          <div className="max-w-[860px] mx-auto">
            {/* Header */}
            <div className="mb-3xl">
              <div className="flex items-center gap-md mb-lg">
                <span className="material-symbols-outlined text-primary text-[32px]">help</span>
                <h1 className="font-serif text-[40px] leading-tight text-primary tracking-tight">
                  Help Center
                </h1>
              </div>
              <p className="font-sans text-body-md text-[15px] text-on-surface-variant max-w-[60ch]">
                Everything you need to know about Verio — from parsing your first transaction to managing your workspace team.
              </p>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-md mb-3xl">
              {[
                { icon: "dashboard_customize", label: "Parse a Transaction", href: "/dashboard" },
                { icon: "receipt_long", label: "View Transactions", href: "/transactions" },
                { icon: "group", label: "Manage Members", href: "/members" },
              ].map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-md px-lg py-md border border-outline-variant hover:border-primary hover:bg-surface-container transition-all group"
                >
                  <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary text-[20px] transition-colors">
                    {item.icon}
                  </span>
                  <span className="font-sans text-label-sm text-[13px] text-primary font-semibold">
                    {item.label}
                  </span>
                  <span className="material-symbols-outlined text-[16px] text-outline-variant ml-auto group-hover:text-primary transition-colors">
                    arrow_forward
                  </span>
                </a>
              ))}
            </div>

            {/* Divider */}
            <div className="border-t border-outline-variant mb-3xl" />

            {/* FAQ */}
            <h2 className="font-serif text-[24px] text-primary mb-xl">Frequently Asked Questions</h2>
            <div className="flex flex-col divide-y divide-outline-variant border-t border-b border-outline-variant">
              {faqs.map((faq, idx) => (
                <div key={idx}>
                  <button
                    onClick={() => setOpen(open === idx ? null : idx)}
                    className="w-full flex items-center justify-between py-lg px-sm text-left hover:bg-surface-container-low transition-colors group"
                  >
                    <span className="font-sans text-[14px] font-semibold text-primary pr-md">
                      {faq.q}
                    </span>
                    <span className="material-symbols-outlined text-[20px] text-on-surface-variant transition-transform duration-200 flex-shrink-0"
                      style={{ transform: open === idx ? "rotate(180deg)" : "rotate(0deg)" }}
                    >
                      expand_more
                    </span>
                  </button>
                  {open === idx && (
                    <div className="px-sm pb-lg">
                      <p className="font-sans text-[14px] text-on-surface-variant leading-relaxed max-w-[70ch]">
                        {faq.a}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Footer note */}
            <div className="mt-3xl pt-xl border-t border-outline-variant">
              <p className="font-sans text-[13px] text-on-surface-variant opacity-70">
                Still need help? Review the{" "}
                <a href="/how-it-works" className="underline underline-offset-4 hover:text-primary transition-colors">
                  Architecture Overview
                </a>{" "}
                for a deep dive into how Verio isolates your data.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
