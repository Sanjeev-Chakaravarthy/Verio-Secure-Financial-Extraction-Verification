"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { authClient } from "@/utils/auth-client";

import ParseResultAnalysisView from "@/components/ParseResultAnalysisView";

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  rawText: string;
  parseResult?: {
    merchantMatch: boolean;
    amountMatch: boolean;
    dateMatch: boolean;
    categoryMatch: boolean;
    finalConfidenceScore: number;
  };
}

export default function ParseResultAnalysis({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authClient.getSession().then((res) => {
      if (!res.data?.session) {
        router.push("/login");
      } else {
        fetch(`/api/transactions/${id}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.transaction) {
              setTransaction(data.transaction);
            }
          })
          .catch((err) => console.error("Error loading parse result:", err))
          .finally(() => setLoading(false));
      }
    });
  }, [id, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 md:ml-64 flex flex-col">
          <Navbar />
          <main className="flex-1 flex items-center justify-center font-sans text-body-md text-on-surface-variant">
            Loading parse result analysis...
          </main>
        </div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 md:ml-64 flex flex-col">
          <Navbar />
          <main className="flex-1 flex flex-col items-center justify-center gap-md">
            <p className="font-sans text-body-md text-on-surface-variant">
              Transaction not found or access restricted.
            </p>
            <Link href="/dashboard" className="font-sans text-label-sm text-[12px] underline text-primary">
              Back to Parse Queue
            </Link>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <Navbar />

        <ParseResultAnalysisView
          transaction={transaction}
          onBack={() => router.push("/transactions")}
          backText="Back to Transactions"
        />
      </div>
    </div>
  );
}
