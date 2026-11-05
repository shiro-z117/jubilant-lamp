import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import { requireRole } from "@/services/authService";

export const metadata: Metadata = {
  title: "Micro Clean (Admin)",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("admin");
  return (
    <>
      <Header adminLogin={true} />
      <main>{children}</main>
    </>
  );
}
