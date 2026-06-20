"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Brand from "@/components/Brand";
import { toast } from "sonner";
import { signIn } from "@/utils/auth-client";

const RegisterSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid corporate email address"),
  orgName: z.string().min(2, "Organization name must be at least 2 characters"),
  password: z.string().min(6, "Security credential must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof RegisterSchema>;

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteEmail = searchParams.get("invite") || "";
  const inviteOrg = searchParams.get("org") || "";
  const isInvited = !!inviteEmail && !!inviteOrg;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      fullName: "",
      email: inviteEmail,
      orgName: "",
      password: "",
      confirmPassword: "",
    },
  });

  const handleGoogleSignIn = async () => {
    try {
      await signIn.social({
        provider: "google",
        callbackURL: "/dashboard",
      });
    } catch {
      toast.error("Google sign-in failed. Please try again.");
    }
  };

  const onSubmit = async (data: RegisterFormValues) => {
    setLoading(true);
    setError("");

    try {
      if (isInvited) {
        // Invited flow — register user then accept-invite (org created by backend)
        const res = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: data.fullName,
            email: data.email,
            // Invited users join an existing org — pass a dummy orgName that gets ignored
            orgName: "__INVITED_USER_NO_ORG__",
            password: data.password,
            inviteOrg,
          }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Registration failed");
        toast.success("Account created! Joining your workspace...");
        router.push("/login?invite=1");
      } else {
        const { confirmPassword: _, ...submitData } = data;
        const res = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(submitData),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Failed to create workspace");
        toast.success("Workspace created! Please sign in.");
        router.push("/login");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Registration failed.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen w-full">
      {/* ── Left Panel ── */}
      <section className="hidden lg:flex lg:w-1/2 bg-[#121212] flex-col p-margin-page relative overflow-hidden">
        {/* Subtle background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,_rgba(255,255,255,0.04)_0%,_transparent_60%)]" />
        </div>

        {/* Logo — always at top */}
        <div className="z-10 flex-shrink-0">
          <Brand theme="dark" />
        </div>

        {/* Main content — centred vertically */}
        <div className="z-10 flex-1 flex flex-col justify-center py-3xl">
          <div className="flex items-center gap-sm mb-lg">
            <span className="material-symbols-outlined text-white text-[28px]">
              {isInvited ? "group_add" : "verified_user"}
            </span>
            <div className="h-[1px] w-12 bg-white/20" />
          </div>

          {isInvited ? (
            <>
              <h1 className="font-serif text-white mb-md leading-snug text-[28px]">
                You've been invited to join a workspace on Verio.
              </h1>
              <p className="font-sans text-zinc-400 leading-relaxed text-[15px]">
                Create your account below or continue with Google. Your membership will be linked automatically once you sign in.
              </p>
            </>
          ) : (
            <>
              <h1 className="font-serif text-white mb-md leading-snug text-[28px]">
                Extract, verify, and organize financial transactions with organization-level isolation.
              </h1>
              <p className="font-sans text-zinc-400 leading-relaxed text-[15px]">
                Every workspace is isolated by design — your team&apos;s transaction data stays scoped to your organization only.
              </p>
            </>
          )}
        </div>

        {/* Footer — always at bottom */}
        <div className="z-10 flex-shrink-0 flex justify-between items-end">
          <div className="font-mono text-zinc-500 text-[10px] uppercase tracking-widest">
            Established MMXXIV
          </div>
          <div className="h-24 w-24 opacity-10 border border-white/20 flex items-center justify-center rotate-45">
            <span className="material-symbols-outlined text-white -rotate-45 text-[36px]">token</span>
          </div>
        </div>
      </section>

      {/* ── Right Panel ── */}
      <section className="w-full lg:w-1/2 bg-[#F9F8F6] flex justify-center items-start py-3xl px-lg md:px-margin-page overflow-y-auto">
        <div className="w-full max-w-[440px]">
          {/* Mobile Branding */}
          <div className="lg:hidden mb-2xl">
            <Brand theme="light" />
          </div>

          <div className="mb-2xl">
            <h2 className="font-serif text-primary text-[24px] mb-xs">
              {isInvited ? "Join your workspace" : "Create your workspace"}
            </h2>
            <p className="font-sans text-on-surface-variant text-[14px] text-zinc-500">
              {isInvited
                ? `You've been invited. Create an account to get started.`
                : "Set up an isolated workspace for your team."}
            </p>
          </div>

          {error && (
            <div className="mb-md p-sm bg-error-container text-on-error-container border border-error/20 font-sans text-body-md text-[14px]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-lg">
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

            {/* Email — locked if invited */}
            <div className="flex flex-col gap-base relative group">
              <label className="font-sans text-label-sm text-[12px] text-on-surface-variant uppercase tracking-wider" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                {...register("email")}
                placeholder="name@company.com"
                readOnly={isInvited}
                className={`bg-transparent border-0 border-b border-outline-variant focus:border-primary focus:outline-none focus:ring-0 py-sm px-0 font-sans text-body-md text-[14px] text-primary placeholder:text-outline-variant transition-colors focus:placeholder-transparent ${isInvited ? "opacity-60 cursor-not-allowed" : ""}`}
              />
              {isInvited && (
                <span className="font-sans text-[10px] text-on-surface-variant opacity-60 mt-xs">
                  This email was used in your invitation.
                </span>
              )}
              {errors.email && (
                <span className="font-sans text-label-sm text-[10px] text-error mt-xs">{errors.email.message}</span>
              )}
            </div>

            {/* Organization Name — hidden for invited users */}
            {!isInvited && (
              <div className="flex flex-col gap-base relative group">
                <label className="font-sans text-label-sm text-[12px] text-on-surface-variant uppercase tracking-wider" htmlFor="orgName">
                  Organization Name
                </label>
                <input
                  id="orgName"
                  type="text"
                  {...register("orgName")}
                  placeholder="Lakeview Consulting"
                  className="bg-transparent border-0 border-b border-outline-variant focus:border-primary focus:outline-none focus:ring-0 py-sm px-0 font-sans text-body-md text-[14px] text-primary placeholder:text-outline-variant transition-colors focus:placeholder-transparent"
                />
                {errors.orgName && (
                  <span className="font-sans text-label-sm text-[10px] text-error mt-xs">{errors.orgName.message}</span>
                )}
                <div className="flex items-start gap-xs mt-xs opacity-70">
                  <span className="material-symbols-outlined text-[14px] text-outline mt-[2px]">info</span>
                  <p className="font-sans text-label-sm text-[10px] text-on-surface-variant leading-relaxed">
                    This creates an isolated workspace for your team.
                  </p>
                </div>
              </div>
            )}

            {/* Password */}
            <div className="flex flex-col gap-base relative group">
              <label className="font-sans text-label-sm text-[12px] text-on-surface-variant uppercase tracking-wider" htmlFor="password">
                Password
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

            {/* Confirm Password */}
            <div className="flex flex-col gap-base relative group">
              <label className="font-sans text-label-sm text-[12px] text-on-surface-variant uppercase tracking-wider" htmlFor="confirmPassword">
                Confirm Password
              </label>
              <div className="relative w-full flex items-center">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  {...register("confirmPassword")}
                  placeholder="Re-enter password"
                  className="bg-transparent border-0 border-b border-outline-variant focus:border-primary focus:outline-none focus:ring-0 py-sm pr-8 pl-0 font-sans text-body-md text-[14px] text-primary placeholder:text-outline-variant transition-colors focus:placeholder-transparent w-full"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-0 bottom-2 text-on-surface-variant hover:text-primary focus:outline-none"
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

            {/* Policy */}
            <div className="pt-xs opacity-80">
              <p className="font-sans text-label-sm text-[10px] text-on-surface-variant leading-relaxed">
                By proceeding, you acknowledge our{" "}
                <Link href="#" className="text-primary underline underline-offset-4">Privacy Policy</Link>
                {" "}and{" "}
                <Link href="#" className="text-primary underline underline-offset-4">Terms of Service</Link>.
              </p>
            </div>

            <div className="pt-md flex flex-col gap-md">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-on-primary py-md px-xl font-sans text-label-sm text-[12px] uppercase tracking-widest transition-all hover:opacity-90 active:scale-[0.98] rounded-none border border-primary"
              >
                {loading
                  ? (isInvited ? "Creating account..." : "Creating workspace...")
                  : (isInvited ? "Create Account & Join" : "Create Organization")}
              </button>

              <div className="flex items-center my-xs">
                <div className="flex-1 h-[1px] bg-outline-variant/30" />
                <span className="px-sm font-sans text-[10px] uppercase tracking-widest text-on-surface-variant opacity-60">or</span>
                <div className="flex-1 h-[1px] bg-outline-variant/30" />
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full bg-transparent hover:bg-surface-container-low text-primary py-md px-xl font-sans text-label-sm text-[12px] uppercase tracking-widest transition-all rounded-none border border-outline-variant flex items-center justify-center gap-md"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>
            </div>
          </form>

          <footer className="mt-2xl pt-xl border-t border-outline-variant text-center">
            <p className="font-sans text-body-md text-[14px] text-on-surface-variant">
              Already have an account?{" "}
              <Link href="/login" className="text-primary font-semibold hover:underline underline-offset-4 ml-xs">
                Sign in
              </Link>
            </p>
          </footer>
        </div>
      </section>
    </main>
  );
}

export default function Register() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F9F8F6] flex items-center justify-center font-sans text-body-md text-on-surface-variant">
        Loading...
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
