import type { Metadata } from "next";
import Header from "@/components/layout/Header";

export const metadata: Metadata = {
  title: "Micro Clean (Admin)",
};

export default function AdminLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      {/**TODO: this should pull admin login status from auth not be hardcoded */}
      <Header adminLogin={true} />
      <main>{children}</main>
    </>
  );
}
