"use client";

import Link from "next/link";
import Card from "@/components/ui/Card";
import { usePathname } from "next/navigation";

export default function NotFound() {
  const isQuoteRoute = usePathname().startsWith("/quote/");

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg">
        <Card title="Page not found">
          <p className="text-muted-foreground">
            This page doesn&apos;t exist, or the link is no longer valid.
            {isQuoteRoute &&
              " If you were sent a quote link, please check that you copied all of it."}
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-md border border-input px-4 py-2"
          >
            Return
          </Link>
        </Card>
      </div>
    </main>
  );
}
