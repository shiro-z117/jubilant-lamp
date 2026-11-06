"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import BaseChart from "@/components/ui/charts/BaseChart";
import {
  axisProps,
  gridStroke,
  tooltipStyle,
} from "@/components/ui/charts/chartTheme";
type Point = {
  date: string;
  bookings: number;
};

const label = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

export default function BookingsChart({ data }: { data: Point[] }) {
  const total = data.reduce((sum, p) => sum + p.bookings, 0);

  return (
    <BaseChart
      dataAvailable={total > 0}
      emptyMessage="No bookings in the last 90 days."
      ariaLabel={`Line chart: ${total} booking requests over the last 90 days.`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{
            top: 8,
            right: 8,
            bottom: 0,
            left: -16,
          }}
        >
          <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={label}
            minTickGap={32}
            {...axisProps}
          />
          <YAxis allowDecimals={false} {...axisProps} />
          <Tooltip
            contentStyle={tooltipStyle}
            labelFormatter={(d) => label(String(d))}
          />
          <Line
            type="monotone"
            dataKey="bookings"
            name="Requests"
            stroke="var(--primary)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </BaseChart>
  );
}
