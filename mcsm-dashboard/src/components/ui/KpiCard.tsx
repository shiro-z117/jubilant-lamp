import type { LucideIcon } from "lucide-react";
import Card from "@/components/ui/Card";

type KpiCardProps = {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  hint?: string;
};

export default function KpiCard({
  label,
  value,
  icon: Icon,
  hint,
}: KpiCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-lg text-secondary-foreground">{label}</p>
          <p className="mt-1 text-4xl font-semibold">{value}</p>
          {hint && <p className="mt-1 text-md text-muted-foreground">{hint}</p>}
        </div>
        {Icon && (
          <div className="rounded-md bg-primary/10 p-2 text-primary">
            <Icon size={24} aria-hidden="true" />
          </div>
        )}
      </div>
    </Card>
  );
}
