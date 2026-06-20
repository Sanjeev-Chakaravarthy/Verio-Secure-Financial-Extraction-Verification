"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { authClient } from "@/utils/auth-client";

export default function HowItWorks() {
  const router = useRouter();
  const [workspaceName, setWorkspaceName] = useState("Loading...");
  
  useEffect(() => {
    authClient.getSession().then((res) => {
      if (!res.data?.session) {
        router.push("/login");
      } else {
        fetch("/api/workspace/stats")
          .then((res) => res.json())
          .then((data) => {
            if (data.workspaceName) {
              setWorkspaceName(data.workspaceName);
            }
          })
          .catch(() => {});
      }
    });
  }, [router]);

  const steps = [
    { title: "Sign in", desc: "User authenticates with corporate credentials via Better Auth." },
    { title: "Session Context", desc: "Backend verifies session token and resolves workspace organization mapping." },
    { title: "Secure Handshake", desc: "API request carries verified workspace credentials implicitly via session cookies." },
    { title: "Scoping Enforcement", desc: "Prisma queries run with explicit workspace filters derived only from backend sessions." },
    { title: "Isolated Ledger", desc: "Financial transaction payload returned securely, preventing IDOR vulnerabilities." },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <Navbar />

        <main className="flex-grow w-full px-margin-page py-3xl max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-xl md:gap-3xl">
          {/* Left Meta Column */}
          <aside className="col-span-1 md:col-span-3 lg:col-span-4 flex flex-col gap-lg hidden md:flex pt-sm">
            <div className="border-t border-primary pt-sm">
              <h3 className="font-sans text-label-sm text-[10px] text-on-surface-variant uppercase tracking-widest mb-base font-semibold">
                Organization
              </h3>
              <p className="font-mono text-[13px] text-primary">{workspaceName}</p>
            </div>
            <div className="border-t border-outline-variant pt-sm">
              <h3 className="font-sans text-label-sm text-[10px] text-on-surface-variant uppercase tracking-widest mb-base font-semibold">
                Document Scope
              </h3>
              <p className="font-mono text-[13px] text-primary">Architecture Overview</p>
            </div>
            <div className="border-t border-outline-variant pt-sm">
              <h3 className="font-sans text-label-sm text-[10px] text-on-surface-variant uppercase tracking-widest mb-base font-semibold">
                Security Perimeter
              </h3>
              <p className="font-mono text-[13px] text-primary">Workspace Scoping (Better Auth)</p>
            </div>
          </aside>

          {/* Right Content Column */}
          <article className="col-span-1 md:col-span-9 lg:col-span-8 flex flex-col">
            <h1 className="font-serif text-display-lg text-[40px] leading-tight text-primary mb-xl">
              How it works — Data Isolation Architecture
            </h1>
            
            <div className="font-sans text-[16px] text-on-surface-variant leading-relaxed max-w-[65ch] space-y-md mb-2xl">
              <p>
                Verio employs a strict, perimeter-based approach to data isolation. Every request is verified against the organization encoded in your session token before any ledger data is queried or returned.
              </p>
              <p>
                The execution flow below outlines the deterministic lifecycle of an authenticated request. This sequence is invariant; no transaction can bypass the cryptographic verification of the organizational boundary.
              </p>
            </div>

            <div className="border-t border-outline-variant w-full my-lg"></div>

            {/* Vertical Flow Diagram */}
            <section className="flex flex-col items-start w-full max-w-2xl py-lg">
              {steps.map((step, idx) => (
                <div key={step.title} className="w-full flex flex-col">
                  {/* Node */}
                  <div className="w-full border border-outline-variant bg-white p-lg hover:bg-surface-container-low transition-colors duration-200">
                    <div className="flex items-center gap-sm">
                      <span className="font-mono text-[12px] bg-primary text-white w-6 h-6 flex items-center justify-center">
                        0{idx + 1}
                      </span>
                      <span className="font-sans text-[14px] text-primary font-bold uppercase tracking-wider">
                        {step.title}
                      </span>
                    </div>
                    <p className="font-sans text-body-md text-[13px] text-on-surface-variant mt-sm leading-relaxed">
                      {step.desc}
                    </p>
                  </div>

                  {/* Edge (if not last) */}
                  {idx < steps.length - 1 && (
                    <div className="w-full flex pl-lg py-xs">
                      <div className="w-px h-lg bg-outline-variant relative">
                        <span className="material-symbols-outlined text-[14px] text-outline-variant absolute -bottom-[10px] -left-[6.5px]">
                          arrow_drop_down
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </section>

            <div className="border-t border-outline-variant w-full my-2xl"></div>

            <div className="font-sans text-body-md text-[13px] text-on-surface-variant max-w-[65ch]">
              <h4 className="font-sans text-label-sm text-[12px] text-primary uppercase tracking-widest mb-sm font-semibold">
                Technical Note
              </h4>
              <p className="opacity-80">
                This scoping is enforced both in the API&apos;s query layer and, where enabled, as a database-level Row Level Security (RLS) policy. Under no circumstances can workspace IDs be submitted or modified via user request bodies.
              </p>
            </div>
          </article>
        </main>
      </div>
    </div>
  );
}
