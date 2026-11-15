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
import { SegmentedControl } from "@/components/ui/SegmentedControl";

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
  const [weightError, setWeightError] = useState<string | null>(null);

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
    const nextWeight = value ? Number(value) : null;
    if (nextWeight !== null && (!Number.isFinite(nextWeight) || nextWeight <= 0)) {
      setWeightError("Enter a weight above 0.");
      return;
    }
    setWeightError(null);
    if (nextWeight === (user?.weight ?? null)) return;
    setIsSavingWeight(true);
    updateProfile({ weight: nextWeight })
      .catch(() => {
        setWeightError("Couldn't save your weight. Check your connection and try again.");
        setWeightInput(user?.weight?.toString() ?? "");
      })
      .finally(() => setIsSavingWeight(false));
  }

  return (
    <div>
      <PageHeader title="Profile" />

      <Card variant="outline" className="mb-6 flex items-center gap-3.5">
        <Avatar name={user?.displayName ?? "?"} size={56} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold text-ink">{user?.displayName}</p>
          <p className="truncate text-sm text-muted">{user?.email}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={signOut}>
          <SignOut size={16} />
          Sign out
        </Button>
      </Card>

      <h2 className="section-title mb-2.5 px-1">Body weight</h2>
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
          {weightError && <span className="text-xs text-error">{weightError}</span>}
        </label>
      </Card>

      <h2 className="section-title mb-2.5 px-1">This week</h2>
      <Card variant="outline" className="mb-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted">Time working out</p>
            <p className="tabular text-xl font-semibold text-ink">{formatDuration(stats.minutesThisWeek)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted">Volume</p>
            <p className="tabular text-xl font-semibold text-ink">{stats.volumeThisWeek.toLocaleString()} lb</p>
          </div>
        </div>
        <WeeklyActivityChart minutesByDay={stats.minutesByDay} />
      </Card>

      <h2 className="section-title mb-2.5 px-1">Lifetime</h2>
      <Card variant="outline" className="mb-6">
        <p className="text-xs text-muted">Total volume</p>
        <p className="tabular text-2xl font-semibold text-ink">{stats.volumeLifetime.toLocaleString()} lb</p>
      </Card>

      <h2 className="section-title mb-2.5 px-1">Appearance</h2>
      <SegmentedControl
        ariaLabel="Appearance"
        className="mb-6"
        value={theme}
        onChange={setTheme}
        options={themeOptions.map(({ value, label, icon: Icon }) => ({
          value,
          label,
          icon: <Icon size={16} />,
        }))}
      />

    </div>
  );
}
