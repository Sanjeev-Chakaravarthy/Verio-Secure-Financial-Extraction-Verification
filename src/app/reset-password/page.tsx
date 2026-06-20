"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { authClient } from "@/utils/auth-client";
import Brand from "@/components/Brand";
import { toast } from "sonner";

const ResetPasswordSchema = z.object({
  password: z.string().min(6, "Security credential must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type ResetPasswordFormValues = z.infer<typeof ResetPasswordSchema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!token) {
      setError("Reset token is missing or invalid. Please request a new link.");
      toast.error("Reset token is missing.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { error: resetError } = await authClient.resetPassword({
        newPassword: data.password,
        token: token,
      });

      if (resetError) {
        const msg = resetError.message || "Failed to reset password. The link may have expired.";
        setError(msg);
        toast.error(msg);
        return;
      }

      toast.success("Password updated successfully! Redirecting to login.");
      router.push("/login");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to reset password.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[440px]">
      {/* Mobile Branding */}
      <div className="lg:hidden mb-2xl">
        <Brand theme="light" />
      </div>

      <div className="mb-3xl">
        <h2 className="font-serif text-headline-md text-primary text-[24px] mb-xs">Reset password</h2>
        <p className="font-sans text-body-md text-on-surface-variant text-[14px] text-zinc-500">
          Enter and confirm your new security credentials below.
        </p>
      </div>

      {error && (
        <div className="mb-md p-sm bg-error-container text-on-error-container border border-error/20 font-sans text-body-md text-[14px]">
          {error}
        </div>
      )}

      {!token && (
        <div className="mb-lg p-md border border-error/20 bg-error-container/20 text-on-error-container flex flex-col gap-sm">
          <p className="font-sans text-[14px] font-semibold">Missing Reset Token</p>
          <p className="font-sans text-[13px] leading-relaxed">
            The link you followed does not contain a valid security token. Please request a fresh reset link.
          </p>
          <Link
            href="/forgot-password"
            className="mt-xs text-primary font-sans text-[12px] uppercase tracking-widest font-semibold hover:underline underline-offset-4"
          >
            Request reset link
          </Link>
        </div>
      )}

      {token && (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-xl">
          {/* New Password */}
          <div className="flex flex-col gap-base relative group">
            <label className="font-sans text-label-sm text-[12px] text-on-surface-variant uppercase tracking-wider" htmlFor="password">
              New Password
            </label>
            <div className="relative w-full flex items-center">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                {...register("password")}
                placeholder="Minimum 6 characters"
                className="bg-transparent border-0 border-b border-outline-variant focus:border-primary focus:outline-none focus:ring-0 py-sm pr-8 pl-0 font-sans text-body-md text-[14px] text-primary placeholder:text-outline-variant transition-colors focus:placeholder-transparent w-full"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 bottom-2 text-on-surface-variant hover:text-primary focus:outline-none"
                title={showPassword ? "Hide password" : "Show password"}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showPassword ? "visibility" : "visibility_off"}
                </span>
              </button>
            </div>
            {errors.password && (
              <span className="font-sans text-label-sm text-[10px] text-error mt-xs">{errors.password.message}</span>
            )}
          </div>

          {/* Confirm New Password */}
          <div className="flex flex-col gap-base relative group">
            <label className="font-sans text-label-sm text-[12px] text-on-surface-variant uppercase tracking-wider" htmlFor="confirmPassword">
              Confirm New Password
            </label>
            <div className="relative w-full flex items-center">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                {...register("confirmPassword")}
                placeholder="Re-enter new password"
                className="bg-transparent border-0 border-b border-outline-variant focus:border-primary focus:outline-none focus:ring-0 py-sm pr-8 pl-0 font-sans text-body-md text-[14px] text-primary placeholder:text-outline-variant transition-colors focus:placeholder-transparent w-full"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-0 bottom-2 text-on-surface-variant hover:text-primary focus:outline-none"
                title={showConfirmPassword ? "Hide password" : "Show password"}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showConfirmPassword ? "visibility" : "visibility_off"}
                </span>
              </button>
            </div>
            {errors.confirmPassword && (
              <span className="font-sans text-label-sm text-[10px] text-error mt-xs">{errors.confirmPassword.message}</span>
            )}
          </div>

          <div className="mt-md flex flex-col gap-lg">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-on-primary py-md px-xl font-sans text-label-sm text-[12px] uppercase tracking-widest transition-all hover:opacity-90 active:scale-[0.98] rounded-none border border-primary"
            >
              {loading ? "Resetting..." : "Save Password"}
            </button>
          </div>
        </form>
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
  );
}

export default function ResetPassword() {
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
              Reset your credentials securely.
            </h1>
            <p className="font-sans text-body-lg text-zinc-400 leading-relaxed text-[16px]">
              Verio workspaces enforce absolute multi-tenancy. Resetting credentials uses secure, signed tokens to guarantee identity isolation.
            </p>
          </div>
        </div>
      </section>

      {/* Right Side: Form Panel */}
      <section className="w-full lg:w-1/2 bg-[#F9F8F6] flex justify-center items-center p-lg md:p-margin-page">
        <Suspense fallback={
          <div className="text-center font-sans text-body-md text-on-surface-variant">
            Loading reset form...
          </div>
        }>
          <ResetPasswordForm />
        </Suspense>
      </section>
    </main>
  );
}
