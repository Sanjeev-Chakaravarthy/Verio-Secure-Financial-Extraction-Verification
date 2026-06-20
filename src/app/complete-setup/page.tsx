"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { authClient } from "@/utils/auth-client";
import Brand from "@/components/Brand";
import { toast } from "sonner";

const CompleteSetupSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  orgName: z.string().min(2, "Organization name must be at least 2 characters"),
});

type CompleteSetupFormValues = z.infer<typeof CompleteSetupSchema>;

export default function CompleteSetup() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sessionLoading, setSessionLoading] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CompleteSetupFormValues>({
    resolver: zodResolver(CompleteSetupSchema),
    defaultValues: {
      fullName: "",
      orgName: "",
    },
  });

  useEffect(() => {
    authClient.getSession().then((res) => {
      if (!res.data?.session) {
        toast.error("Please sign in first.");
        router.push("/login");
        return;
      }
      
      const user = res.data.user;
      if (user.name) {
        setValue("fullName", user.name);
      }
      setSessionLoading(false);
    });
  }, [router, setValue]);

  const onSubmit = async (data: CompleteSetupFormValues) => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/workspace/complete-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to complete setup");
      }
      
      toast.success("Workspace created successfully! Redirecting to dashboard.");
      router.push("/dashboard");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Setup failed.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/login");
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-[#F9F8F6] flex items-center justify-center font-sans text-body-md text-on-surface-variant">
        Authenticating user profile...
      </div>
    );
  }

  return (
    <main className="flex h-screen w-full overflow-hidden">
      {/* Left Side: Trust Panel */}
      <section className="hidden lg:flex lg:w-1/2 bg-[#121212] flex-col justify-between p-margin-page relative overflow-hidden">
        <div className="absolute top-1/4 left-[-10%] rotate-[-5deg] w-[120%] h-[1px] border border-white/5 pointer-events-none"></div>
        <div className="absolute left-1/3 top-[-10%] rotate-[2deg] w-[1px] h-[120%] border border-white/5 pointer-events-none"></div>
        <div className="absolute bottom-1/3 left-[-10%] rotate-[3deg] w-[120%] h-[1px] border border-white/5 pointer-events-none"></div>

        <div className="z-10 flex flex-col gap-xl w-full">
          <Brand theme="dark" />
          <div className="w-full max-w-md mt-3xl">
            <h1 className="font-serif text-display-lg text-white mb-lg text-[48px] leading-[1.1] tracking-tight">
              One last step to set up your secure ledger.
            </h1>
            <p className="font-sans text-body-lg text-zinc-400 leading-relaxed text-[16px]">
              Verio isolates all transactional data by organization. Enter your team details to initialize your isolated multi-tenant database sandbox.
            </p>
          </div>
        </div>
      </section>

      {/* Right Side: Form Panel */}
      <section className="w-full lg:w-1/2 bg-[#F9F8F6] flex justify-center items-center p-lg md:p-margin-page">
        <div className="w-full max-w-[440px]">
          {/* Mobile Branding */}
          <div className="lg:hidden mb-2xl">
            <Brand theme="light" />
          </div>

          <div className="mb-3xl">
            <h2 className="font-serif text-headline-md text-primary text-[24px] mb-xs">Complete your setup</h2>
            <p className="font-sans text-body-md text-on-surface-variant text-[14px] text-zinc-500">
              Provide your details to build a new financial workspace.
            </p>
          </div>

          {error && (
            <div className="mb-md p-sm bg-error-container text-on-error-container border border-error/20 font-sans text-body-md text-[14px]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-xl">
            {/* Full Name */}
            <div className="flex flex-col gap-base relative group">
              <label className="font-sans text-label-sm text-[12px] text-on-surface-variant uppercase tracking-wider" htmlFor="fullName">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                {...register("fullName")}
                placeholder="E.g. Jane Doe"
                className="bg-transparent border-0 border-b border-outline-variant focus:border-primary focus:outline-none focus:ring-0 py-sm px-0 font-sans text-body-md text-[14px] text-primary placeholder:text-outline-variant transition-colors focus:placeholder-transparent"
              />
              {errors.fullName && (
                <span className="font-sans text-label-sm text-[10px] text-error mt-xs">{errors.fullName.message}</span>
              )}
            </div>

            {/* Organization Name */}
            <div className="flex flex-col gap-base relative group">
              <label className="font-sans text-label-sm text-[12px] text-on-surface-variant uppercase tracking-wider" htmlFor="orgName">
                Workspace / Organization Name
              </label>
              <input
                id="orgName"
                type="text"
                {...register("orgName")}
                placeholder="E.g. Lakeview Consulting"
                className="bg-transparent border-0 border-b border-outline-variant focus:border-primary focus:outline-none focus:ring-0 py-sm px-0 font-sans text-body-md text-[14px] text-primary placeholder:text-outline-variant transition-colors focus:placeholder-transparent"
              />
              {errors.orgName && (
                <span className="font-sans text-label-sm text-[10px] text-error mt-xs">{errors.orgName.message}</span>
              )}
            </div>

            <div className="mt-md flex flex-col gap-md">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-on-primary py-md px-xl font-sans text-label-sm text-[12px] uppercase tracking-widest transition-all hover:opacity-90 active:scale-[0.98] rounded-none border border-primary"
              >
                {loading ? "Completing setup..." : "Complete Setup"}
              </button>

              <button
                type="button"
                onClick={handleSignOut}
                className="w-full bg-transparent hover:bg-surface-container-low text-primary py-md px-xl font-sans text-label-sm text-[12px] uppercase tracking-widest transition-all rounded-none border border-outline-variant flex items-center justify-center gap-md"
              >
                Sign out & exit
              </button>
            </div>
          </form>

          <footer className="mt-3xl pt-xl border-t border-outline-variant">
            <div className="flex justify-between text-center max-w-[200px] mx-auto">
              <Link href="#" className="font-sans text-body-md text-[14px] text-on-surface-variant hover:text-primary transition-colors">
                Privacy Policy
              </Link>
              <span className="text-outline-variant">|</span>
              <Link href="#" className="font-sans text-body-md text-[14px] text-on-surface-variant hover:text-primary transition-colors">
                Terms
              </Link>
            </div>
          </footer>
        </div>
      </section>
    </main>
  );
}
