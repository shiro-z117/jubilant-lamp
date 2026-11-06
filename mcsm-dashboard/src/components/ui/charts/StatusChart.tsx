"use client";

import { Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import BaseChart from "@/components/ui/charts/BaseChart";
import { tooltipStyle } from "@/components/ui/charts/chartTheme";

type Point = {
  status: string;
  count: number;
};

const COLORS: Record<string, { fill: string; opacity: number }> = {
  Pending: { fill: "var(--warning)", opacity: 1 },
  Quoted: { fill: "var(--info)", opacity: 0.5 },
  Confirmed: { fill: "var(--info)", opacity: 1 },
  Assigned: { fill: "var(--primary)", opacity: 0.55 },
  "In Progress": { fill: "var(--primary)", opacity: 1 },
  Completed: { fill: "var(--success)", opacity: 1 },
  Cancelled: { fill: "var(--destructive)", opacity: 0.5 },
  Rejected: { fill: "var(--destructive)", opacity: 1 },
};

export default function StatusChart({ data }: { data: Point[] }) {
  const shown = data
    .filter((p) => p.count > 0)
    .map((p) => ({
      ...p,
      fill: COLORS[p.status]?.fill ?? "var(--muted)",
      fillOpacity: COLORS[p.status]?.opacity ?? 1,
    }));

  const summary = shown.map((p) => `${p.status} ${p.count}`).join(", ");

  return (
    <BaseChart
      dataAvailable={shown.length > 0}
      emptyMessage="No bookings yet."
      ariaLabel={`Donut chart of bookings by status: ${summary}.`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={shown}
            dataKey="count"
            nameKey="status"
            innerRadius="55%"
            outerRadius="85%"
            paddingAngle={2}
            stroke="var(--card)"
          />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </BaseChart>
  );
}
