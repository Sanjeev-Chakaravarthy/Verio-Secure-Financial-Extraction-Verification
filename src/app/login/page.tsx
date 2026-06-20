"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { signIn } from "@/utils/auth-client";
import Brand from "@/components/Brand";
import { toast } from "sonner";

const LoginSchema = z.object({
  email: z.string().email("Invalid corporate email address"),
  password: z.string().min(6, "Security credential must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof LoginSchema>;

export default function Login() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Check for OAuth error in URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get("error");
    if (oauthError) {
      const messages: Record<string, string> = {
        account_not_linked: "This Google account is not linked to any workspace. Please sign in with email first, then link Google from your profile.",
        state_mismatch: "Sign-in session expired. Please try again.",
        access_denied: "Google sign-in was cancelled.",
      };
      const msg = messages[oauthError] || `Sign-in error: ${oauthError}`;
      setError(msg);
      toast.error(msg);
    }
  }, []);

  const handleGoogleSignIn = async () => {
    setError("");
    try {
      const result = await signIn.social({
        provider: "google",
        callbackURL: "/dashboard",
      });
      if (result?.error) {
        const msg = result.error.message || "Google sign-in failed. Please try again.";
        setError(msg);
        toast.error(msg);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Google sign-in failed. Please try again.";
      setError(msg);
      toast.error(msg);
    }
  };

  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true);
    setError("");

    try {
      const { error: authError } = await signIn.email({
        email: data.email,
        password: data.password,
        callbackURL: "/dashboard",
      });

      if (authError) {
        const msg = authError.message || "Failed to authenticate credentials.";
        setError(msg);
        toast.error(msg);
        return;
      }

      toast.success("Signed in — redirecting to dashboard.");
      router.push("/dashboard");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to authenticate credentials.";
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
        {/* Partition Motif Decorations */}
        <div className="absolute top-1/4 left-[-10%] rotate-[-5deg] w-[120%] h-[1px] border border-white/5 pointer-events-none"></div>
        <div className="absolute left-1/3 top-[-10%] rotate-[2deg] w-[1px] h-[120%] border border-white/5 pointer-events-none"></div>
        <div className="absolute bottom-1/3 left-[-10%] rotate-[3deg] w-[120%] h-[1px] border border-white/5 pointer-events-none"></div>

        <div className="z-10 flex flex-col gap-xl w-full">
          <Brand theme="dark" />
          <div className="w-full max-w-md mt-3xl">
            <h1 className="font-serif text-display-lg text-white mb-lg text-[48px] leading-[1.1] tracking-tight">
              Securely extract and isolate your personal financial data per workspace.
            </h1>
            <p className="font-sans text-body-lg text-on-primary-container leading-relaxed text-[16px] text-zinc-400">
              Verified, secure, and auditable. Experience a monastic approach to digital ledgers, where architectural precision meets modern security.
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
            <h2 className="font-serif text-headline-md text-primary text-[24px] mb-xs">Sign in</h2>
            <p className="font-sans text-body-md text-on-surface-variant text-[14px] text-zinc-500">
              Access your workspace with administrative credentials.
            </p>
          </div>

          {error && (
            <div className="mb-md p-sm bg-error-container text-on-error-container border border-error/20 font-sans text-body-md text-[14px]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-xl">
            {/* Email Field */}
            <div className="flex flex-col gap-base relative group">
              <label className="font-sans text-label-sm text-[12px] text-on-surface-variant uppercase tracking-wider" htmlFor="email">
                Email
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

            {/* Password Field */}
            <div className="flex flex-col gap-base relative group">
              <div className="flex justify-between items-end">
                <label className="font-sans text-label-sm text-[12px] text-on-surface-variant uppercase tracking-wider" htmlFor="password">
                  Password
                </label>
                <Link href="/forgot-password" className="font-sans text-label-sm text-[12px] text-on-surface-variant hover:text-primary transition-colors underline underline-offset-4">
                  Forgot?
                </Link>
              </div>
              <div className="relative w-full flex items-center">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  {...register("password")}
                  placeholder="••••••••"
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

            <div className="mt-md flex flex-col gap-md">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-on-primary py-md px-xl font-sans text-label-sm text-[12px] uppercase tracking-widest transition-all hover:opacity-90 active:scale-[0.98] rounded-none border border-primary"
              >
                {loading ? "Verifying..." : "Sign in"}
              </button>

              <div className="flex items-center my-xs">
                <div className="flex-1 h-[1px] bg-outline-variant/30"></div>
                <span className="px-sm font-sans text-[10px] uppercase tracking-widest text-on-surface-variant opacity-60">or</span>
                <div className="flex-1 h-[1px] bg-outline-variant/30"></div>
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

          <div className="mt-xl text-center">
            <p className="font-sans text-body-md text-[14px] text-on-surface-variant">
              Don’t have an account?{" "}
              <Link
                href="/register"
                className="text-primary font-semibold hover:underline underline-offset-4 ml-xs"
              >
                Create a workspace
              </Link>
            </p>
          </div>

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
