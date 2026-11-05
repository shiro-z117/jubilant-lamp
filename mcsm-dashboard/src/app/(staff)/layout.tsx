import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import { requireRole } from "@/services/authService";

export const metadata: Metadata = {
  title: "Micro Clean (Staff)",
};

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("staff");
  return (
    <>
      <Header adminLogin={false} />
      <main>{children}</main>
    </>
  );
}
