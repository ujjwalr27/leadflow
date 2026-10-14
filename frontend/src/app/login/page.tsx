import { TrendingUp } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/states";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = {
  title: "Sign in · LeadFlow",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="flex items-center gap-2 text-blue-600">
            <TrendingUp className="size-7" strokeWidth={2.5} aria-hidden />
            <span className="text-3xl font-bold tracking-tight">LeadFlow</span>
          </span>
          <h1 className="mt-6 text-xl font-semibold text-gray-900">Sign in to your account</h1>
          <p className="mt-1 text-sm text-gray-500">Track leads and never miss a follow-up.</p>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200 sm:p-8">
          {/* The form reads `?next=` from the URL, so it renders on the client. */}
          <Suspense fallback={<LoginFormSkeleton />}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

function LoginFormSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-9 w-full" />
    </div>
  );
}
