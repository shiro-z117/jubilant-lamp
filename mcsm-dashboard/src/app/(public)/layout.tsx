import type { Metadata } from "next";
import Image from "next/image";
import logo from "@/app/micro-clean-logo.png";

export const metadata: Metadata = {
  title: "Micro Clean (Quote)",
  robots: { index: false },
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex w-full flex-1 flex-col items-center gap-8 py-12">
      <Image
        src={logo}
        alt="Micro Clean Cleaning Services"
        priority
        className="h-48 w-auto"
      />
      <div className="w-full max-w-2xl">{children}</div>
    </main>
  );
}
