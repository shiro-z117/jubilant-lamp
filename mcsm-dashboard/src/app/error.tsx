"use client";

import { startTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  function retry() {
    startTransition(() => {
      router.refresh();
      reset();
    });
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6">
      <div role="alert" className="mx-auto w-full max-w-lg py-12">
        <Card title="Something went wrong">
          <p className="text-muted-foreground">
            This page could not be loaded. Please try again, and if the problem
            continues, contact an admin.
          </p>

          {error.digest && (
            <p className="mt-2 text-xs text-muted-foreground">
              Reference: {error.digest}
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={retry}
              className="cursor-pointer rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground"
            >
              Try again
            </button>

            <Link href="/" className="rounded-md border border-input px-4 py-2">
              Return
            </Link>
          </div>
        </Card>
      </div>
    </main>
  );
}
