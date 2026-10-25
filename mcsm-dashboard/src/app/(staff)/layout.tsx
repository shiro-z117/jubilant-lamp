import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Micro Clean (Staff)",
};

export default function StaffLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <body className="min-h-full flex flex-col">{children}</body>
    </>
  );
}
