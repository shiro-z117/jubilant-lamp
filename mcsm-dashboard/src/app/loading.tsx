export default function LoadingPage() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-screen flex-col items-center justify-center gap-4"
    >
      <div className="h-40 w-40 animate-spin rounded-full border-8 border-muted border-t-primary" />
      <p className="text-3xl font-medium text-muted-foreground mt-4">Loading</p>
    </div>
  );
}
