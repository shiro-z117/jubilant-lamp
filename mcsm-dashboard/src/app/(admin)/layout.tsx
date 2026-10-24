import type { Metadata } from "next";
import Header from "@/components/layout/Header";

export const metadata: Metadata = {
  title: "Micro Clean (Admin)",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {/**TODO: this should pull admin login status from auth not be hardcoded */}
        <Header adminLogin={true} />
        {children}
      </body>
    </html>
  );
}
