type Tone =
  "success" | "warning" | "info" | "primary" | "destructive" | "neutral";

const toneClasses: Record<Tone, string> = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  info: "bg-info/10 text-info",
  primary: "bg-primary/10 text-primary",
  destructive: "bg-destructive/10 text-destructive",
  neutral: "bg-muted text-muted-foreground",
};

const statusTones: Record<string, Tone> = {
  // booking
  Pending: "warning",
  Quoted: "neutral",
  Confirmed: "info",
  Assigned: "info",
  Accepted: "info",
  "On the Way": "primary",
  "In Progress": "primary",
  Completed: "success",
  Cancelled: "neutral",
  Rejected: "destructive",
  // payment
  Paid: "success",
  Failed: "destructive",
  Refunded: "neutral",
  // staff
  Available: "success",
  Busy: "warning",
  Offline: "neutral",
};

type StatusBadgeProps = {
  status: string;
  // only pass distinguishAssigned={true} if you need to distinguish between Assigned (booking) and Assigned (staff job)
  distinguishAssigned?: boolean;
};

export default function StatusBadge({
  status,
  distinguishAssigned,
}: StatusBadgeProps) {
  const label =
    status === "Assigned" && distinguishAssigned ? "Pending" : status;
  const tone = statusTones[label] ?? "neutral";

  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${toneClasses[tone]}`}
    >
      {label}
    </span>
  );
}
