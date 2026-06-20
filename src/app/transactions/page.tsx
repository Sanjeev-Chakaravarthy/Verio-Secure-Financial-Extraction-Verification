"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { authClient } from "@/utils/auth-client";

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  parseResult?: {
    finalConfidenceScore: number;
  };
}

export default function Transactions() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  useEffect(() => {
    authClient.getSession().then((res) => {
      if (!res.data?.session) {
        router.push("/login");
      } else {
        fetchTransactions();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, search, categoryFilter]);


  const fetchTransactions = (loadMore = false) => {
    if (loadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    
    const query = new URLSearchParams();
    if (search) query.append("search", search);
    if (categoryFilter) query.append("category", categoryFilter);
    query.append("limit", "10");
    if (loadMore && nextCursor) {
      query.append("cursor", nextCursor);
    }

    fetch(`/api/transactions?${query.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.transactions) {
          if (loadMore) {
            setTransactions((prev) => [...prev, ...data.transactions]);
          } else {
            setTransactions(data.transactions);
          }
          setNextCursor(data.nextCursor || null);
        }
      })
      .catch((err) => console.error("Error loading transactions:", err))
      .finally(() => {
        setLoading(false);
        setLoadingMore(false);
      });
  };

  // Compute a running balance starting from an arbitrary ledger base
  let runningBalance = 17651.50;
  const transactionRows = [...transactions].reverse().map((t) => {
    runningBalance += t.amount;
    const finalConfidenceScore = t.parseResult?.finalConfidenceScore ?? 0.65;
    return {
      ...t,
      balance: runningBalance,
      finalConfidenceScore,
    };
  }).reverse();

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <div className="flex-1 md:ml-64 flex flex-col">
        <Navbar onSearch={setSearch} searchPlaceholder="Search transactions..." />

        <main className="flex-1">
          {/* Page Header & Filters */}
          <section className="px-margin-page py-2xl">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-lg mb-xl">
              <div>
                <h1 className="font-serif text-display-lg text-[40px] text-primary mb-xs">
                  Transactions
                </h1>
                <p className="font-sans text-body-lg text-[16px] text-on-surface-variant max-w-xl">
                  A comprehensive ledger of all capital movements and fund settlements for the current fiscal period.
                </p>
              </div>
              <div className="flex gap-sm">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-surface-container-low border border-outline-variant px-md py-sm font-sans text-label-sm text-[12px] text-primary focus:outline-none focus:ring-0 focus:border-primary rounded-none"
                >
                  <option value="">All Categories</option>
                  <option value="Food & Beverage">Food & Beverage</option>
                  <option value="Transport">Transport</option>
                  <option value="Shopping">Shopping</option>
                  <option value="Income">Income</option>
                  <option value="Miscellaneous">Miscellaneous</option>
                </select>
              </div>
            </div>

            {/* Transaction Table */}
            <div className="w-full border-t border-outline">
              {/* Header */}
              <div className="grid grid-cols-12 py-md px-sm border-b border-outline-variant bg-surface-container-low text-on-surface-variant">
                <div className="col-span-2 font-sans text-label-sm text-[12px] uppercase tracking-wider font-semibold">Date</div>
                <div className="col-span-4 font-sans text-label-sm text-[12px] uppercase tracking-wider font-semibold">Description</div>
                <div className="col-span-2 font-sans text-label-sm text-[12px] uppercase tracking-wider font-semibold text-right">Amount</div>
                <div className="col-span-2 font-sans text-label-sm text-[12px] uppercase tracking-wider font-semibold text-right">Balance</div>
                <div className="col-span-2 font-sans text-label-sm text-[12px] uppercase tracking-wider font-semibold text-right">Confidence</div>
              </div>

              {/* Rows */}
              <div className="divide-y divide-outline-variant">
                {loading ? (
                  <div className="py-xl text-center font-sans text-body-md text-on-surface-variant">
                    Loading ledger...
                  </div>
                ) : transactionRows.length === 0 ? (
                  <div className="py-xl text-center font-sans text-body-md text-on-surface-variant">
                    No transactions found. Parse some inputs on the dashboard.
                  </div>
                ) : (
                  transactionRows.map((row) => (
                    <Link
                      key={row.id}
                      href={`/transactions/${row.id}`}
                      className="grid grid-cols-12 py-lg px-sm hover:bg-surface-container transition-colors cursor-pointer items-center group duration-150"
                    >
                      <div className="col-span-2 font-mono text-[13px] text-on-surface-variant">
                        {new Date(row.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                      <div className="col-span-4 font-sans font-bold text-primary text-[14px]">
                        {row.description}
                      </div>
                      <div
                        className={`col-span-2 font-mono text-[13px] text-right ${
                          row.amount > 0 ? "text-green-700" : "text-error"
                        }`}
                      >
                        {row.amount > 0 ? "+" : "-"} ₹{Math.abs(row.amount).toFixed(2)}
                      </div>
                      <div className="col-span-2 font-mono text-[13px] text-right text-primary">
                        ₹{row.balance.toFixed(2)}
                      </div>
                      <div className="col-span-2 flex justify-end items-center gap-sm">
                        <div className="w-24 h-1 bg-surface-container-highest relative overflow-hidden hidden sm:block">
                          <div
                            className="absolute inset-y-0 left-0 bg-primary"
                            style={{ width: `${row.finalConfidenceScore * 100}%` }}
                          ></div>
                        </div>
                        <span className="font-mono text-[10px] text-on-surface-variant">
                          {Math.round(row.finalConfidenceScore * 100)}%
                        </span>
                      </div>
                    </Link>
                  ))
                )}
              </div>

              {/* Load More Section */}
              {nextCursor && (
                <div className="py-3xl flex justify-center border-t border-outline-variant">
                  <button
                    onClick={() => fetchTransactions(true)}
                    disabled={loadingMore}
                    className="px-3xl py-md border border-outline hover:border-primary hover:bg-surface-container transition-all group rounded-none disabled:opacity-50"
                  >
                    <span className="font-sans text-label-sm text-[12px] uppercase tracking-widest text-on-surface-variant group-hover:text-primary font-semibold">
                      {loadingMore ? "Loading..." : "Load More"}
                    </span>
                    <span className="block font-mono text-[10px] text-outline mt-1 italic">
                      Showing {transactions.length} transactions
                    </span>
                  </button>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
