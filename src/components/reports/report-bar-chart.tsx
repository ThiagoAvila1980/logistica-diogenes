"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { cn } from "@/lib/utils";

export type BarChartDataItem = {
  label: string;
  value: number;
  color?: string;
};

type ReportBarChartProps = {
  data: BarChartDataItem[];
  valueLabel?: string;
  height?: number;
  className?: string;
  layout?: "horizontal" | "vertical";
};

const DEFAULT_COLOR = "hsl(var(--primary))";

export function ReportBarChart({
  data,
  valueLabel = "Qtd.",
  height = 240,
  className,
  layout = "horizontal",
}: ReportBarChartProps) {
  if (data.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center text-sm text-muted-foreground",
          className,
        )}
        style={{ height }}
      >
        Sem dados suficientes para exibir o gráfico.
      </div>
    );
  }

  if (layout === "vertical") {
    return (
      <div className={cn("w-full", className)} style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
          >
            <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis
              dataKey="label"
              type="category"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={120}
            />
            <Tooltip
              formatter={(v) => [v, valueLabel]}
              labelFormatter={(l) => String(l)}
              contentStyle={{ fontSize: 12 }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={28}>
              {data.map((entry, idx) => (
                <Cell
                  key={idx}
                  fill={entry.color ?? DEFAULT_COLOR}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 4, right: 8, bottom: 4, left: 0 }}
        >
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={32}
          />
          <Tooltip
            formatter={(v) => [v, valueLabel]}
            labelFormatter={(l) => String(l)}
            contentStyle={{ fontSize: 12 }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48}>
            {data.map((entry, idx) => (
              <Cell
                key={idx}
                fill={entry.color ?? DEFAULT_COLOR}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
