"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/conversions";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || "Invalid email or password.");
      }

      const data = await res.json().catch(() => ({}));
      const destination =
        searchParams.get("redirect") ||
        (data.user?.role === "admin" ? "/admin" : "/conversions");

      router.push(destination);
      router.refresh();
    } catch (err: unknown) {
      setErrorMessage((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-800/80 bg-[#0d1322]/90 backdrop-blur-xl p-8 shadow-2xl space-y-6">
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-2">
          <Logo size="md" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Sign In to Your Account
        </h1>
        <p className="text-xs text-slate-400">
          Access your persistent audio conversion history across all devices.
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 flex items-center gap-2.5 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 block">
            Email Address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full h-11 px-3.5 rounded-xl border border-slate-800 bg-[#0d1424] text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 block">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-11 pl-3.5 pr-10 rounded-xl border border-slate-800 bg-[#0d1424] text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          variant="gradient"
          size="lg"
          disabled={isLoading}
          className="w-full h-11 font-semibold text-sm rounded-xl gap-2 mt-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-white" />
              <span>Signing In...</span>
            </>
          ) : (
            <>
              <LogIn className="h-4 w-4" />
              <span>Sign In</span>
            </>
          )}
        </Button>
      </form>

      <div className="text-center pt-2 border-t border-slate-800/60 text-xs text-slate-400">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-purple-400 hover:text-purple-300 font-medium">
          Create an account
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[calc(100vh-16rem)]">
      <Suspense
        fallback={
          <div className="w-full max-w-md p-12 text-center flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
            <p className="text-xs text-slate-400">Loading sign in...</p>
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
