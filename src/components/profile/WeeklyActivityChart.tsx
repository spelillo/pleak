import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DAY_LABELS } from "@/lib/weekPlanning";

export function WeeklyActivityChart({ minutesByDay }: { minutesByDay: number[] }) {
  const data = DAY_LABELS.map((day, i) => ({ day, minutes: Math.round(minutesByDay[i]) }));

  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--color-hairline)" />
          <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "var(--color-muted)", fontSize: 12 }} />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--color-muted)", fontSize: 12 }}
            width={32}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: "var(--color-surface-soft)" }}
            contentStyle={{
              background: "var(--color-canvas)",
              border: "1px solid var(--color-hairline)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--color-ink)" }}
            formatter={(value) => [`${value} min`, "Time"]}
          />
          <Bar dataKey="minutes" fill="var(--color-brand-blue)" radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
