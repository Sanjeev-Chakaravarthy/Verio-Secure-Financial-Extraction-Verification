"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { authClient } from "@/utils/auth-client";
import Brand from "@/components/Brand";
import { toast } from "sonner";

const ForgotPasswordSchema = z.object({
  email: z.string().email("Invalid corporate email address"),
});

type ForgotPasswordFormValues = z.infer<typeof ForgotPasswordSchema>;

export default function ForgotPassword() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const { error: resetError } = await authClient.requestPasswordReset({
        email: data.email,
        redirectTo: "/reset-password",
      });

      if (resetError) {
        const msg = resetError.message || "Failed to initiate password reset.";
        setError(msg);
        toast.error(msg);
        return;
      }

      setSuccess(true);
      toast.success("Reset link sent — check your corporate email inbox.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to initiate password reset.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

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
              Simple, secure, and isolated ledger management.
            </h1>
            <p className="font-sans text-body-lg text-zinc-400 leading-relaxed text-[16px]">
              Access isolation ensures only you can view your system logs and transactional ledgers. Recover your account securely.
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
            <h2 className="font-serif text-headline-md text-primary text-[24px] mb-xs">Forgot password</h2>
            <p className="font-sans text-body-md text-on-surface-variant text-[14px] text-zinc-500">
              Enter your corporate email address and we&apos;ll send you a link to reset your credentials.
            </p>
          </div>

          {error && (
            <div className="mb-md p-sm bg-error-container text-on-error-container border border-error/20 font-sans text-body-md text-[14px]">
              {error}
            </div>
          )}

          {success ? (
            <div className="mb-lg p-md border border-outline-variant bg-surface-container-low flex flex-col gap-md">
              <div className="flex items-center gap-sm text-primary">
                <span className="material-symbols-outlined text-[24px]">mark_email_read</span>
                <p className="font-sans text-[14px] font-bold uppercase tracking-wider">Reset Link Sent</p>
              </div>
              <p className="font-sans text-[14px] text-on-surface-variant leading-relaxed">
                If the email exists in our system, you will receive instructions to reset your password shortly. Please check your inbox and spam folders.
              </p>
              <Link
                href="/login"
                className="mt-xs text-primary font-sans text-[12px] uppercase tracking-widest font-semibold hover:underline underline-offset-4 flex items-center gap-xs"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span> Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-xl">
              {/* Email Field */}
              <div className="flex flex-col gap-base relative group">
                <label className="font-sans text-label-sm text-[12px] text-on-surface-variant uppercase tracking-wider" htmlFor="email">
                  Corporate Email
                </label>
                <input
                  id="email"
                  type="email"
                  {...register("email")}
                  placeholder="email@company.com"
                  className="bg-transparent border-0 border-b border-outline-variant focus:border-primary focus:outline-none focus:ring-0 py-sm px-0 font-sans text-body-md text-[14px] text-primary placeholder:text-outline-variant transition-colors focus:placeholder-transparent"
                />
                {errors.email && (
                  <span className="font-sans text-label-sm text-[10px] text-error mt-xs">{errors.email.message}</span>
                )}
              </div>

              <div className="mt-md flex flex-col gap-lg">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-on-primary py-md px-xl font-sans text-label-sm text-[12px] uppercase tracking-widest transition-all hover:opacity-90 active:scale-[0.98] rounded-none border border-primary"
                >
                  {loading ? "Sending link..." : "Send Reset Link"}
                </button>
              </div>
            </form>
          )}

          {!success && (
            <div className="mt-xl text-center">
              <p className="font-sans text-body-md text-[14px] text-on-surface-variant">
                Remember your credentials?{" "}
                <Link
                  href="/login"
                  className="text-primary font-semibold hover:underline underline-offset-4 ml-xs"
                >
                  Sign in
                </Link>
              </p>
            </div>
          )}

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
