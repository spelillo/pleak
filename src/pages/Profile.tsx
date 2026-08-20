import { useMemo, useState } from "react";
import type { FocusEvent } from "react";
import { Sun, Moon, Desktop, SignOut } from "@phosphor-icons/react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { WeeklyActivityChart } from "@/components/profile/WeeklyActivityChart";
import { useTheme } from "@/contexts/theme-context";
import { useAuth } from "@/contexts/auth-context";
import { useWorkoutSessions } from "@/lib/queries/workoutSessions";
import { formatDuration, minutesByDayThisWeek, totalVolume } from "@/lib/workoutStats";
import { addDays, startOfWeek } from "@/lib/weekPlanning";
import { cn } from "@/lib/cn";

const themeOptions = [
  { value: "light" as const, label: "Light", icon: Sun },
  { value: "system" as const, label: "System", icon: Desktop },
  { value: "dark" as const, label: "Dark", icon: Moon },
];

export function Profile() {
  const { theme, setTheme } = useTheme();
  const { user, signOut, updateProfile } = useAuth();
  const [weightInput, setWeightInput] = useState(() => user?.weight?.toString() ?? "");
  const [isSavingWeight, setIsSavingWeight] = useState(false);

  const { data: sessions } = useWorkoutSessions(user?.id);
  const weekStart = useMemo(() => startOfWeek(new Date()), []);
  const stats = useMemo(() => {
    const all = sessions ?? [];
    const minutesByDay = minutesByDayThisWeek(all, weekStart);
    return {
      minutesByDay,
      minutesThisWeek: minutesByDay.reduce((sum, m) => sum + m, 0),
      volumeThisWeek: totalVolume(all, { start: weekStart, end: addDays(weekStart, 7) }),
      volumeLifetime: totalVolume(all),
    };
  }, [sessions, weekStart]);

  function handleWeightBlur(e: FocusEvent<HTMLInputElement>) {
    const value = e.target.value.trim();
    const nextWeight = value ? Number(value) : undefined;
    if (nextWeight === user?.weight) return;
    setIsSavingWeight(true);
    updateProfile({ weight: nextWeight }).finally(() => setIsSavingWeight(false));
  }

  return (
    <div>
      <PageHeader title="Profile" />

      <Card variant="outline" className="mb-6 flex items-center gap-4">
        <Avatar name={user?.displayName ?? "?"} size={48} />
        <div className="flex-1">
          <p className="text-sm font-semibold text-ink">{user?.displayName}</p>
          <p className="text-sm text-muted">{user?.email}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={signOut}>
          <SignOut size={16} />
          Sign out
        </Button>
      </Card>

      <h2 className="mb-3 text-sm font-semibold text-ink">Body weight</h2>
      <Card variant="outline" className="mb-6">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">Used to quick-fill bodyweight movements during a workout</span>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              inputMode="decimal"
              placeholder="e.g. 155"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              onBlur={handleWeightBlur}
              className="max-w-32"
            />
            <span className="text-sm text-muted">lb{isSavingWeight && " · Saving…"}</span>
          </div>
        </label>
      </Card>

      <h2 className="mb-3 text-sm font-semibold text-ink">This week</h2>
      <Card variant="outline" className="mb-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted">Time working out</p>
            <p className="text-lg font-semibold text-ink">{formatDuration(stats.minutesThisWeek)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted">Volume</p>
            <p className="text-lg font-semibold text-ink">{stats.volumeThisWeek.toLocaleString()} lb</p>
          </div>
        </div>
        <WeeklyActivityChart minutesByDay={stats.minutesByDay} />
      </Card>

      <h2 className="mb-3 text-sm font-semibold text-ink">Lifetime</h2>
      <Card variant="outline" className="mb-6">
        <p className="text-xs text-muted">Total volume</p>
        <p className="text-2xl font-semibold text-ink">{stats.volumeLifetime.toLocaleString()} lb</p>
      </Card>

      <h2 className="mb-3 text-sm font-semibold text-ink">Appearance</h2>
      <Card variant="outline" className="mb-6 flex items-center gap-1 p-1.5">
        {themeOptions.map((option) => {
          const Icon = option.icon;
          const isActive = theme === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setTheme(option.value)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition-colors",
                isActive ? "bg-surface-card text-ink" : "text-muted hover:text-ink",
              )}
              aria-pressed={isActive}
            >
              <Icon size={16} />
              {option.label}
            </button>
          );
        })}
      </Card>

    </div>
  );
}
