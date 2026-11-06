"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import BaseChart from "@/components/dashboard/charts/BaseChart";
import {
  axisProps,
  gridStroke,
  tooltipStyle,
} from "@/components/dashboard/charts/chartTheme";

type Point = {
  serviceId: string;
  title: string;
  requests: number;
};

export default function TopServicesChart({ data }: { data: Point[] }) {
  const summary = data.map((p) => `${p.title} ${p.requests}`).join(", ");

  return (
    <BaseChart
      dataAvailable={data.length > 0}
      emptyMessage="No service requests yet."
      ariaLabel={`Bar chart of most requested services: ${summary}.`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{
            top: 8,
            right: 16,
            bottom: 0,
            left: 8,
          }}
        >
          <CartesianGrid
            stroke={gridStroke}
            strokeDasharray="3 3"
            horizontal={false}
          />
          <XAxis type="number" allowDecimals={false} {...axisProps} />
          <YAxis type="category" dataKey="title" width={130} {...axisProps} />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ fill: "var(--accent)" }}
          />
          <Bar
            dataKey="requests"
            name="Requests"
            fill="var(--primary)"
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </BaseChart>
  );
}
