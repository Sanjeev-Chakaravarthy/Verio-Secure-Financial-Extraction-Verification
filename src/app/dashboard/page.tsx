"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { authClient } from "@/utils/auth-client";
import ParseResultAnalysisView from "@/components/ParseResultAnalysisView";
import WorkspaceContextWidget from "@/components/WorkspaceContextWidget";
import { toast } from "sonner";

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  finalConfidenceScore: number;
}

interface Stats {
  workspaceName: string;
  membersCount: number;
  parsedCount: number;
  lastActivity: string | null;
}

export default function Dashboard() {
  const router = useRouter();
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"input" | "analysis">("input");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [activeAnalysisTx, setActiveAnalysisTx] = useState<any | null>(null);

  const DEMO_TEXT = `Date: 11 Dec 2025 / Description: STARBUCKS COFFEE MUMBAI / Amount: -420.00 / Balance after transaction: 18,420.50`;

  const [stats, setStats] = useState<Stats>({
    workspaceName: "Loading...",
    membersCount: 0,
    parsedCount: 0,
    lastActivity: null,
  });
  
  const [latestParsed, setLatestParsed] = useState<Transaction | null>(null);
  const [memberInitials, setMemberInitials] = useState<string[]>([]);

  // Verify auth session on load
  useEffect(() => {
    authClient.getSession().then((res) => {
      if (!res.data?.session) {
        router.push("/login");
      } else {
        fetchStats();
      }
    });
  }, [router]);

  const fetchStats = () => {
    fetch("/api/workspace/stats")
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) {
          setStats({
            workspaceName: data.workspaceName,
            membersCount: data.membersCount,
            parsedCount: data.parsedCount,
            lastActivity: data.lastActivity
              ? new Date(data.lastActivity).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : "Never",
          });
        }
      })
      .catch(() => {});

    fetch("/api/workspace/members")
      .then((res) => res.json())
      .then((data) => {
        if (data.members) {
          const initials = data.members.slice(0, 3).map((m: { user: { name: string } }) => {
            const name = m.user?.name || "?";
            return name
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .substring(0, 2)
              .toUpperCase();
          });
          setMemberInitials(initials);
        }
      })
      .catch(() => {});
  };

  const handleParse = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/transactions/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText }),
      });
      const data = await res.json();
      if (data.transaction) {
        const parseRes = data.transaction.parseResult || {};
        const parsed: Transaction = {
          id: data.transaction.id,
          date: new Date(data.transaction.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          description: data.transaction.description,
          amount: data.transaction.amount,
          category: data.transaction.category,
          finalConfidenceScore: parseRes.finalConfidenceScore || 0.65,
        };
        setLatestParsed(parsed);
        setActiveAnalysisTx(data.transaction);
        setInputText("");
        fetchStats();
        // Transition immediately to the analysis screen
        setView("analysis");
        toast.success("Transaction parsed securely.");
      } else {
        toast.error("Parsing failed. Please check the input.");
      }
    } catch (err) {
      console.error("Parsing failed", err);
      toast.error("An error occurred during parsing.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAnalysis = async (txId: string) => {
    if (activeAnalysisTx && activeAnalysisTx.id === txId) {
      setView("analysis");
      return;
    }
    // Fetch detailed transaction data for the view
    setLoading(true);
    try {
      const res = await fetch(`/api/transactions/${txId}`);
      const data = await res.json();
      if (data.transaction) {
        setActiveAnalysisTx(data.transaction);
        setView("analysis");
      }
    } catch (err) {
      console.error("Error loading parse result:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar workspaceName={stats.workspaceName} />
      
      <div className="flex-1 md:ml-64 flex flex-col">
        <Navbar searchPlaceholder="Search ledger..." />
        
        {view === "analysis" && activeAnalysisTx ? (
          <ParseResultAnalysisView
            transaction={activeAnalysisTx}
            onBack={() => setView("input")}
            backText="Back to Parse Queue"
          />
        ) : (
          <main className="flex-1 px-margin-page py-2xl">
            <div className="max-w-[1400px] mx-auto">
              <div className="grid grid-cols-12 gap-3xl">
                {/* Left Section: Parse Transaction (~60%) */}
                <div className="col-span-12 lg:col-span-7 space-y-2xl">
                  <section>
                    <h1 className="font-serif text-headline-md text-[32px] lg:text-[40px] leading-tight text-primary mb-sm">
                      Parse Transaction
                    </h1>
                    <p className="font-sans text-body-md text-on-surface-variant text-[14px] max-w-xl mb-xl">
                      Paste raw bank statement text, wire confirmations, or ledger entries to extract structured data with cryptographic precision.
                    </p>
                    
                    <div className="space-y-lg">
                      <div className="hairline-border bg-white p-xl">
                        <div className="flex items-center justify-between mb-xs">
                          <label className="font-sans text-label-sm text-[12px] opacity-60 font-semibold tracking-wider">
                            RAW DATA INPUT
                          </label>
                          <button
                            type="button"
                            onClick={() => setInputText(DEMO_TEXT)}
                            className="font-sans text-[10px] text-on-surface-variant border border-outline-variant px-xs py-base hover:border-primary hover:text-primary transition-colors uppercase tracking-widest"
                          >
                            Fill demo input
                          </button>
                        </div>
                        <textarea
                          value={inputText}
                          onChange={(e) => setInputText(e.target.value)}
                          className="w-full h-48 bg-transparent border-none focus:outline-none focus:ring-0 font-mono text-[13px] p-0 custom-scrollbar resize-none text-primary"
                          placeholder="e.g. Swiggy Order * Koramangala / 09/12/2025 → ₹540.00 debited"
                        />
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="font-sans text-label-sm text-[12px] text-on-surface-variant italic">
                          {loading ? "Parsing extraction..." : "Waiting for input..."}
                        </span>
                        <button
                          onClick={handleParse}
                          disabled={loading}
                          className="bg-primary text-on-primary font-sans text-label-sm text-[12px] uppercase tracking-widest px-xl py-md hover:opacity-90 active:scale-[0.98] transition-all rounded-none border border-primary"
                        >
                          {loading ? "Parsing..." : "Extract Data →"}
                        </button>
                      </div>
                    </div>
                  </section>

                  {/* Result Preview Card */}
                  <section className="space-y-md">
                    <div className="flex justify-between items-end border-b border-outline-variant pb-xs">
                      <h3 className="font-sans text-label-sm text-[12px] tracking-widest uppercase opacity-60 font-semibold">
                        Result Preview
                      </h3>
                      <button
                        onClick={() => router.push("/transactions")}
                        className="font-sans text-label-sm text-[12px] text-primary underline underline-offset-4 hover:opacity-60 transition-opacity"
                      >
                        View all transactions
                      </button>
                    </div>
                    
                    <div
                      className={`hairline-border bg-white p-2xl relative overflow-hidden min-h-[200px] ${
                        latestParsed
                          ? 'cursor-pointer hover:bg-surface-container-low transition-colors duration-150 grid grid-cols-1 md:grid-cols-2 gap-xl'
                          : 'flex items-center justify-center'
                      }`}
                      onClick={() => latestParsed && handleOpenAnalysis(latestParsed.id)}
                    >
                      {!latestParsed ? (
                        <div className="flex flex-col items-center justify-center text-center py-xl w-full">
                          <span className="material-symbols-outlined text-[32px] text-on-surface-variant opacity-30 mb-md">
                            receipt_long
                          </span>
                          <p className="font-serif text-[18px] text-primary mb-xs">
                            No Transaction Parsed Yet
                          </p>
                          <p className="font-sans text-[13px] text-on-surface-variant max-w-sm mb-xl">
                            Paste any bank statement line above and click Extract Data →
                          </p>
                          {/* Flow guide */}
                          <div className="flex items-center gap-sm text-[11px] font-sans text-on-surface-variant border border-outline-variant px-lg py-sm">
                            <span className="font-semibold text-primary">01</span>
                            <span>Paste text</span>
                            <span className="text-outline-variant">→</span>
                            <span className="font-semibold text-primary">02</span>
                            <span>Extract Data</span>
                            <span className="text-outline-variant">→</span>
                            <span className="font-semibold text-primary">03</span>
                            <span>Click Result → Parse Result Analysis</span>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="absolute top-0 right-0 w-1 h-full bg-primary opacity-10"></div>
                          <div className="space-y-lg">
                            <div>
                              <p className="font-sans text-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider mb-base">
                                DESCRIPTION
                              </p>
                              <p className="font-serif text-headline-md text-[20px] text-primary">
                                {latestParsed.description}
                              </p>
                            </div>
                            <div className="grid grid-cols-2 gap-md">
                              <div>
                                <p className="font-sans text-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider mb-base">
                                  DATE
                                </p>
                                <p className="font-sans text-body-lg text-[16px] text-primary">
                                  {latestParsed.date}
                                </p>
                              </div>
                              <div>
                                <p className="font-sans text-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider mb-base">
                                  CATEGORY
                                </p>
                                <p className="font-sans text-body-lg text-[16px] text-primary">
                                  {latestParsed.category}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col justify-between items-end text-right">
                            <div>
                              <p className="font-sans text-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider mb-base">
                                AMOUNT
                              </p>
                              <p className="font-mono text-[32px] text-primary leading-none">
                                {latestParsed.amount > 0 ? "+" : ""}₹{Math.abs(latestParsed.amount).toFixed(2)}
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-md mt-xl">
                              <div className="relative w-12 h-12">
                                <svg className="w-full h-full transform -rotate-90">
                                  <circle cx="24" cy="24" fill="transparent" r="20" stroke="#efeeec" strokeWidth="2"></circle>
                                  <circle
                                    cx="24"
                                    cy="24"
                                    fill="transparent"
                                    r="20"
                                    stroke="#000000"
                                    strokeDasharray="125.6"
                                    strokeDashoffset={125.6 * (1 - latestParsed.finalConfidenceScore)}
                                    strokeWidth="2"
                                  ></circle>
                                </svg>
                                <span className="absolute inset-0 flex items-center justify-center font-mono text-[10px]">
                                  {Math.round(latestParsed.finalConfidenceScore * 100)}%
                                </span>
                              </div>
                              <div className="text-right">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleOpenAnalysis(latestParsed.id); }}
                                  className="font-sans text-label-sm text-[11px] text-primary font-semibold hover:underline block underline-offset-4 underline"
                                >
                                  View Parse Result Analysis
                                </button>
                                <p className="font-sans text-[10px] text-on-surface-variant">
                                  {Math.round(latestParsed.finalConfidenceScore * 100)}% Confidence score
                                </p>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </section>
                </div>

                {/* Right Section: Org Context (~40%) */}
                <div className="col-span-12 lg:col-span-5">
                  <div className="sticky top-[110px] space-y-xl">
                    <WorkspaceContextWidget />
                    
                    <div className="hairline-border bg-surface-container-low p-xl">
                      <div className="flex items-start justify-between mb-xl">
                        <div>
                          <p className="font-sans text-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider mb-xs">
                            WORKSPACE
                          </p>
                          <h2 className="font-serif text-headline-md text-[20px] text-primary">
                            {stats.workspaceName}
                          </h2>
                        </div>
                        <span className="flex items-center gap-xs px-sm py-base bg-primary text-white font-sans text-[10px] uppercase tracking-wider">
                          <span className="material-symbols-outlined text-[14px] filled">verified</span>
                          Verified
                        </span>
                      </div>

                      <div className="space-y-lg">
                        <div className="flex justify-between items-center py-sm border-b border-outline-variant/30">
                          <span className="font-sans text-body-md text-[14px] text-on-surface-variant">
                            Members
                          </span>
                          <div className="flex -space-x-2">
                            {memberInitials.length > 0 ? (
                              memberInitials.map((init, i) => (
                                <div
                                  key={i}
                                  className="w-6 h-6 rounded-full border border-outline-variant bg-surface-container-highest flex items-center justify-center font-mono text-[10px] text-primary"
                                >
                                  {init}
                                </div>
                              ))
                            ) : (
                              <span className="font-mono text-[12px] text-on-surface-variant">—</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center py-sm">
                          <span className="font-sans text-body-md text-[14px] text-on-surface-variant">
                            Last Activity
                          </span>
                          <span className="font-mono text-[13px] text-primary">
                            {stats.lastActivity || "Never"}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => router.push("/settings")}
                        className="w-full mt-xl py-md hairline-border bg-transparent text-primary font-sans text-label-sm text-[12px] uppercase tracking-widest hover:bg-white transition-colors rounded-none"
                      >
                        Workspace Settings
                      </button>
                    </div>

                    {/* Asymmetric Stats Widget */}
                    <div className="grid grid-cols-2 gap-lg">
                      <div className="hairline-border p-lg bg-white">
                        <p className="font-sans text-label-sm text-[10px] text-on-surface-variant mb-md font-semibold tracking-wider">
                          MEMBERS
                        </p>
                        <p className="font-mono text-[24px] text-primary leading-none font-bold">
                          {stats.membersCount}
                        </p>
                      </div>
                      <div className="hairline-border p-lg bg-white">
                        <p className="font-sans text-label-sm text-[10px] text-on-surface-variant mb-md font-semibold tracking-wider">
                          TOTAL PARSED
                        </p>
                        <p className="font-mono text-[24px] text-primary leading-none font-bold">
                          {stats.parsedCount}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </main>
        )}
      </div>
    </div>
  );
}
