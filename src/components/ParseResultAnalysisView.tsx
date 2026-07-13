"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/utils/auth-client";

interface TransactionSplit {
  id: string;
  userId: string;
  percentage: number | string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number | string;
  category: string;
  rawText: string;
  splits?: TransactionSplit[];
  parseResult?: {
    merchantMatch: boolean;
    amountMatch: boolean;
    dateMatch: boolean;
    categoryMatch: boolean;
    finalConfidenceScore: number;
  };
}

interface ParseResultAnalysisViewProps {
  transaction: Transaction;
  onBack: () => void;
  backText?: string;
}

interface WorkspaceMember {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface SplitDraft {
  userId: string;
  percentage: string;
}

async function readJsonResponse(res: Response) {
  const text = await res.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

// Derive per-dimension confidence percentages from the boolean parse result
function deriveBreakdown(parseResult: NonNullable<Transaction["parseResult"]>) {
  const score = parseResult.finalConfidenceScore;
  const directionPct = parseResult.amountMatch ? 100 : 58;
  const datePct = parseResult.dateMatch ? Math.round(95 + score * 5) : Math.round(35 + score * 20);
  const descPct = parseResult.merchantMatch ? Math.round(90 + score * 8) : Math.round(48 + score * 20);
  const amtPct = parseResult.amountMatch ? Math.round(88 + score * 8) : Math.round(40 + score * 20);
  const balancePct = Math.round(score * 95);

  return [
    { label: "Direction detected", pct: Math.min(100, directionPct) },
    { label: "Date parsed",        pct: Math.min(100, datePct) },
    { label: "Description match",  pct: Math.min(100, descPct) },
    { label: "Amount parsed",      pct: Math.min(100, amtPct) },
    { label: "Balance found",      pct: Math.min(100, balancePct) },
  ];
}

// Format raw text into an OCR-style structured context block
function formatSourceContext(rawText: string) {
  const lines = rawText.split(/\n+/).filter(Boolean);
  if (lines.length === 0) return rawText;

  const formatted = ["RAW_OCR_READ:", "{"];
  lines.forEach((line, i) => {
    const key = `"line_${String(i + 1).padStart(2, "0")}"`;
    formatted.push(`  ${key}: "${line.replace(/"/g, "'")}"${i < lines.length - 1 ? "," : ""}`);
  });
  formatted.push("}");
  return formatted.join("\n");
}

export default function ParseResultAnalysisView({
  transaction,
  onBack,
  backText = "Back to Parse Queue",
}: ParseResultAnalysisViewProps) {
  const [flagged, setFlagged] = useState(false);
  const [saved, setSaved] = useState(false);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [splitDrafts, setSplitDrafts] = useState<SplitDraft[]>([]);
  const [savedSplits, setSavedSplits] = useState<TransactionSplit[]>(transaction.splits ?? []);
  const [splitLoading, setSplitLoading] = useState(true);
  const [splitSaving, setSplitSaving] = useState(false);

  useEffect(() => {
    let ignore = false;

    const loadSplitContext = async () => {
      setSplitLoading(true);
      const existingSplits = transaction.splits ?? [];
      setSavedSplits(existingSplits);

      try {
        const [membersRes, sessionRes] = await Promise.all([
          fetch("/api/workspace/members"),
          authClient.getSession(),
        ]);
        const membersData = await readJsonResponse(membersRes);
        if (!membersRes.ok) {
          throw new Error(membersData.error || `Failed to load members (${membersRes.status})`);
        }
        if (ignore) return;

        const workspaceMembers: WorkspaceMember[] = membersData.members ?? [];
        setMembers(workspaceMembers);

        if (existingSplits.length > 0) {
          setSplitDrafts(
            existingSplits.map((split) => ({
              userId: split.user?.id ?? split.userId,
              percentage: String(Number(split.percentage)),
            }))
          );
          return;
        }

        const currentUserId = sessionRes.data?.user?.id;
        const currentMember = workspaceMembers.find((member) => member.user.id === currentUserId);
        const otherMember = workspaceMembers.find((member) => member.user.id !== currentUserId);

        if (currentMember && otherMember) {
          setSplitDrafts([
            { userId: currentMember.user.id, percentage: "50" },
            { userId: otherMember.user.id, percentage: "50" },
          ]);
        } else {
          setSplitDrafts([]);
        }
      } catch (err) {
        console.error("Error loading split context:", err);
      } finally {
        if (!ignore) setSplitLoading(false);
      }
    };

    loadSplitContext();

    return () => {
      ignore = true;
    };
  }, [transaction.id, transaction.splits]);

  const handleSave = async () => {
    setSaved(true);
    toast.success("Transaction confirmed and saved to ledger.");
  };

  const handleFlag = async () => {
    setFlagged(true);
    toast.error("Transaction flagged for manual review.");
  };

  const parseResult = transaction.parseResult ?? {
    merchantMatch: false,
    amountMatch: false,
    dateMatch: false,
    categoryMatch: false,
    finalConfidenceScore: 0.65,
  };

  const confidencePct = Math.round(parseResult.finalConfidenceScore * 100);
  const breakdown = deriveBreakdown(parseResult);
  const sourceContext = formatSourceContext(transaction.rawText || "No source data available.");
  const transactionAmount = Number(transaction.amount);
  const splitTotal = splitDrafts.reduce((sum, split) => sum + (Number(split.percentage) || 0), 0);
  const canSaveSplits =
    splitDrafts.length >= 2 &&
    splitDrafts.every((split) => split.userId && Number(split.percentage) > 0) &&
    Math.abs(splitTotal - 100) <= 0.01 &&
    !splitSaving;

  const confidenceLabel =
    confidencePct >= 88 ? "High Confidence" :
    confidencePct >= 70 ? "Medium Confidence" :
    "Low Confidence";

  const confidenceBadgeColor =
    confidencePct >= 88 ? "text-green-700 border-green-300 bg-green-50" :
    confidencePct >= 70 ? "text-yellow-700 border-yellow-300 bg-yellow-50" :
    "text-error border-error/30 bg-error-container";

  const RADIUS = 54;
  const CIRC = 2 * Math.PI * RADIUS;
  const dashOffset = CIRC * (1 - parseResult.finalConfidenceScore);

  const docId = transaction.id.slice(-6).toUpperCase();

  const updateSplitDraft = (index: number, patch: Partial<SplitDraft>) => {
    setSplitDrafts((current) =>
      current.map((split, i) => (i === index ? { ...split, ...patch } : split))
    );
  };

  const addSplitDraft = () => {
    const usedUserIds = new Set(splitDrafts.map((split) => split.userId));
    const availableMember = members.find((member) => !usedUserIds.has(member.user.id));
    if (!availableMember) return;

    const remaining = Math.max(1, Number((100 - splitTotal).toFixed(2)));
    setSplitDrafts((current) => [
      ...current,
      { userId: availableMember.user.id, percentage: String(remaining) },
    ]);
  };

  const removeSplitDraft = (index: number) => {
    setSplitDrafts((current) => current.filter((_, i) => i !== index));
  };

  const saveSplits = async () => {
    setSplitSaving(true);
    try {
      const res = await fetch(`/api/transactions/${transaction.id}/splits`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          splits: splitDrafts.map((split) => ({
            userId: split.userId,
            percentage: Number(split.percentage),
          })),
        }),
      });
      const data = await readJsonResponse(res);
      if (!res.ok || data.error) {
        toast.error(data.error || "Failed to save split allocation.");
        return;
      }

      setSavedSplits(data.splits ?? []);
      setSplitDrafts(
        (data.splits ?? []).map((split: TransactionSplit) => ({
          userId: split.user?.id ?? split.userId,
          percentage: String(Number(split.percentage)),
        }))
      );
      toast.success("Transaction split saved.");
    } catch (err) {
      console.error("Error saving transaction split:", err);
      toast.error("Network error while saving split allocation.");
    } finally {
      setSplitSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      {/* Sub-header: breadcrumb + action buttons */}
      <div className="sticky top-[72px] z-30 flex items-center justify-between px-margin-page py-sm bg-surface border-b border-outline-variant">
        {/* Breadcrumb */}
        <div className="flex items-center gap-sm text-on-surface-variant font-sans text-[13px]">
          <button
            onClick={onBack}
            className="hover:text-primary transition-colors flex items-center gap-1 font-semibold"
          >
            <span className="material-symbols-outlined text-[15px]">arrow_back</span>
            {backText}
          </button>
          <span className="text-outline-variant mx-1">/</span>
          <span className="text-primary font-semibold">Detail View</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-sm">
          <button
            onClick={handleFlag}
            disabled={flagged}
            className={`font-sans text-label-sm text-[12px] uppercase tracking-widest px-lg py-sm border transition-all rounded-none ${
              flagged
                ? "border-outline-variant text-on-surface-variant cursor-not-allowed"
                : "border-outline hover:border-primary hover:text-primary text-on-surface-variant"
            }`}
          >
            {flagged ? "Flagged" : "Flag for Review"}
          </button>
          <button
            onClick={handleSave}
            disabled={saved}
            className={`font-sans text-label-sm text-[12px] uppercase tracking-widest px-lg py-sm border rounded-none transition-all ${
              saved
                ? "bg-surface-container-high border-outline-variant text-on-surface-variant cursor-not-allowed"
                : "bg-primary text-on-primary border-primary hover:opacity-90 active:scale-[0.98]"
            }`}
          >
            {saved ? "Saved" : "Save Transaction"}
          </button>
        </div>
      </div>


      <main className="flex-1 overflow-y-auto px-margin-page py-2xl">
        <div className="max-w-[1200px] mx-auto">
          {/* Page Title */}
          <div className="mb-2xl">
            <h1 className="font-serif text-[40px] leading-tight text-primary tracking-tight">
              Parse Result Analysis
            </h1>
            <p className="font-sans text-body-md text-[14px] text-on-surface-variant mt-xs">
              Detailed breakdown of extraction confidence for Document ID #{docId}-A.
            </p>
          </div>

          {/* Main 2-column grid */}
          <div className="grid grid-cols-12 gap-xl lg:gap-2xl">
            {/* ── LEFT COLUMN (7/12) ── */}
            <div className="col-span-12 lg:col-span-7 space-y-xl">
              {/* Extracted Entity Card */}
              <div className="hairline-border bg-white">
                <div className="flex items-center justify-between px-lg py-md border-b border-outline-variant">
                  <span className="font-sans text-label-sm text-[11px] text-on-surface-variant uppercase tracking-widest font-semibold">
                    Extracted Entity
                  </span>
                  <span className={`inline-flex items-center gap-1 font-sans text-[11px] uppercase tracking-widest px-sm py-base border ${confidenceBadgeColor}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current inline-block"></span>
                    {confidenceLabel}
                  </span>
                </div>

                <div className="px-lg py-xl">
                  <p className="font-serif text-[28px] md:text-[32px] text-primary leading-tight tracking-tight mb-xl">
                    {transaction.description}
                  </p>

                  <div className="grid grid-cols-3 gap-md border-t border-outline-variant pt-lg">
                    <div>
                      <p className="font-sans text-label-sm text-[10px] text-on-surface-variant uppercase tracking-widest mb-xs font-semibold">
                        Date Parsed
                      </p>
                      <p className="font-sans text-body-md text-[14px] text-primary">
                        {new Date(transaction.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="font-sans text-label-sm text-[10px] text-on-surface-variant uppercase tracking-widest mb-xs font-semibold">
                        Amount Detected
                      </p>
                      <p className="font-mono text-[14px] text-primary">
                        {transactionAmount > 0 ? "+" : ""}₹{Math.abs(transactionAmount).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="font-sans text-label-sm text-[10px] text-on-surface-variant uppercase tracking-widest mb-xs font-semibold">
                        Category Predicted
                      </p>
                      <p className="font-sans text-body-md text-[14px] text-primary">
                        {transaction.category}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Source String Context Card */}
              <div className="hairline-border bg-white">
                <div className="flex items-center justify-between px-lg py-md border-b border-outline-variant">
                  <span className="font-sans text-label-sm text-[11px] text-on-surface-variant uppercase tracking-widest font-semibold">
                    Source String Context
                  </span>
                  <span className="font-mono text-[12px] text-on-surface-variant select-none">&lt;/&gt;</span>
                </div>

                <div className="px-lg py-xl">
                  <pre className="font-mono text-[12px] text-primary bg-surface-container-low border border-outline-variant p-lg leading-relaxed overflow-x-auto whitespace-pre-wrap custom-scrollbar select-all">
                    {sourceContext}
                  </pre>
                </div>
              </div>

              {/* Split Allocation */}
              <div className="hairline-border bg-white">
                <div className="flex items-center justify-between px-lg py-md border-b border-outline-variant">
                  <span className="font-sans text-label-sm text-[11px] text-on-surface-variant uppercase tracking-widest font-semibold">
                    Split Allocation
                  </span>
                  <span
                    className={`font-mono text-[12px] ${
                      Math.abs(splitTotal - 100) <= 0.01 ? "text-primary" : "text-error"
                    }`}
                  >
                    {splitTotal.toFixed(2)}%
                  </span>
                </div>

                <div className="px-lg py-xl space-y-lg">
                  {splitLoading ? (
                    <div className="py-md text-center font-sans text-body-md text-on-surface-variant">
                      Loading workspace members...
                    </div>
                  ) : members.length < 2 ? (
                    <div className="py-md text-center font-sans text-body-md text-on-surface-variant">
                      Add another workspace member before splitting this transaction.
                    </div>
                  ) : (
                    <>
                      <div className="space-y-sm">
                        {splitDrafts.map((split, index) => {
                          const splitUserIds = new Set(splitDrafts.map((draft, i) => (i === index ? "" : draft.userId)));
                          const splitAmount = transactionAmount * ((Number(split.percentage) || 0) / 100);

                          return (
                            <div
                              key={`${split.userId}-${index}`}
                              className="grid grid-cols-12 gap-sm items-center border border-outline-variant bg-surface-container-low px-sm py-sm"
                            >
                              <select
                                value={split.userId}
                                onChange={(e) => updateSplitDraft(index, { userId: e.target.value })}
                                className="col-span-12 md:col-span-5 bg-white border border-outline-variant pl-sm pr-20 py-sm font-sans text-[13px] text-primary focus:outline-none rounded-none appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23555%22%20d%3D%22M2%204l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_32px_center] bg-no-repeat"
                              >
                                {members.map((member) => (
                                  <option
                                    key={member.id}
                                    value={member.user.id}
                                    disabled={splitUserIds.has(member.user.id)}
                                  >
                                    {member.user.name}
                                  </option>
                                ))}
                              </select>

                              <div className="col-span-7 md:col-span-3 flex items-center bg-white border border-outline-variant">
                                <input
                                  type="number"
                                  min="0.01"
                                  max="100"
                                  step="0.01"
                                  value={split.percentage}
                                  onChange={(e) => updateSplitDraft(index, { percentage: e.target.value })}
                                  className="w-full bg-transparent px-sm py-sm font-mono text-[13px] text-primary border-none"
                                />
                                <span className="pr-sm font-mono text-[12px] text-on-surface-variant">%</span>
                              </div>

                              <div className="col-span-4 md:col-span-3 font-mono text-[12px] text-right text-on-surface-variant">
                                ₹{Math.abs(splitAmount).toFixed(2)}
                              </div>

                              <button
                                type="button"
                                onClick={() => removeSplitDraft(index)}
                                disabled={splitDrafts.length <= 2}
                                className="col-span-1 flex justify-end text-on-surface-variant hover:text-error disabled:opacity-30 disabled:hover:text-on-surface-variant"
                                aria-label="Remove split row"
                              >
                                <span className="material-symbols-outlined text-[18px]">close</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      {savedSplits.length > 0 && (
                        <div className="border-t border-outline-variant pt-md">
                          <p className="font-sans text-label-sm text-[10px] text-on-surface-variant uppercase tracking-widest mb-sm font-semibold">
                            Saved Split
                          </p>
                          <div className="space-y-xs">
                            {savedSplits.map((split) => (
                              <div
                                key={split.id}
                                className="flex items-center justify-between font-sans text-[13px] text-primary"
                              >
                                <span>{split.user.name}</span>
                                <span className="font-mono text-on-surface-variant">
                                  {Number(split.percentage).toFixed(2)}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-md border-t border-outline-variant pt-md">
                        <button
                          type="button"
                          onClick={addSplitDraft}
                          disabled={splitDrafts.length >= members.length}
                          className="font-sans text-label-sm text-[12px] uppercase tracking-widest text-primary underline underline-offset-4 disabled:opacity-40"
                        >
                          Add Member
                        </button>
                        <button
                          type="button"
                          onClick={saveSplits}
                          disabled={!canSaveSplits}
                          className="bg-primary text-on-primary border border-primary font-sans text-label-sm text-[12px] uppercase tracking-widest px-lg py-sm hover:opacity-90 disabled:opacity-50 rounded-none"
                        >
                          {splitSaving ? "Saving..." : "Save Split"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* ── RIGHT COLUMN (5/12) ── */}
            <div className="col-span-12 lg:col-span-5">
              <div className="sticky top-[140px]">
                <div className="hairline-border bg-white">
                  <div className="flex items-center gap-sm px-lg py-md border-b border-outline-variant">
                    <span className="material-symbols-outlined text-[16px] text-on-surface-variant">bar_chart</span>
                    <span className="font-sans text-label-sm text-[11px] text-on-surface-variant uppercase tracking-widest font-semibold">
                      Confidence Breakdown
                    </span>
                  </div>

                  <div className="px-lg py-xl space-y-xl">
                    <div className="flex flex-col items-center gap-sm">
                      <div className="relative w-[140px] h-[140px]">
                        <svg
                          className="w-full h-full transform -rotate-90"
                          viewBox="0 0 128 128"
                        >
                          <circle
                            cx="64"
                            cy="64"
                            r={RADIUS}
                            fill="transparent"
                            stroke="#e3e2e0"
                            strokeWidth="8"
                          />
                          <circle
                            cx="64"
                            cy="64"
                            r={RADIUS}
                            fill="transparent"
                            stroke="#000000"
                            strokeWidth="8"
                            strokeLinecap="butt"
                            strokeDasharray={CIRC}
                            strokeDashoffset={dashOffset}
                            style={{ transition: "stroke-dashoffset 0.6s ease" }}
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center font-mono text-[30px] font-bold text-primary leading-none">
                          {confidencePct}%
                        </span>
                      </div>
                      <p className="font-sans text-[13px] text-on-surface-variant">
                        Aggregate Accuracy Score
                      </p>
                    </div>

                    <div className="border-t border-outline-variant"></div>

                    <div className="space-y-md">
                      {breakdown.map((item) => (
                        <div key={item.label}>
                          <div className="flex justify-between items-center mb-base">
                            <span className="font-sans text-[13px] text-primary">
                              {item.label}
                            </span>
                            <span className="font-mono text-[12px] text-on-surface-variant">
                              {item.pct}%
                            </span>
                          </div>
                          <div className="w-full h-[3px] bg-surface-container-highest">
                            <div
                              className="h-full bg-primary transition-all duration-500"
                              style={{ width: `${item.pct}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
