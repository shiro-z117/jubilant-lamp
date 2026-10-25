export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <body className="min-h-full flex flex-col">{children}</body>
    </>
  );
}
