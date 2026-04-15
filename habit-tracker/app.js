const { useMemo, useState, useEffect } = React;

const STORAGE_KEY = "habit-tracker-v1";
const BADGE_THRESHOLDS = [7, 30, 100];

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function toDisplayDate(dateStr) {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function getWeekDates(anchor = new Date()) {
  const date = new Date(anchor);
  const day = date.getDay();
  const diffToMonday = (day + 6) % 7;
  date.setDate(date.getDate() - diffToMonday);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(date);
    d.setDate(date.getDate() + i);
    return formatDate(d);
  });
}

function calculateCurrentStreak(entries) {
  const days = Object.entries(entries)
    .filter(([, intensity]) => intensity > 0)
    .map(([date]) => date)
    .sort((a, b) => (a < b ? -1 : 1));

  if (days.length === 0) return 0;

  let streak = 0;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  while (true) {
    const cursorKey = formatDate(cursor);
    if (entries[cursorKey] > 0) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }

    if (streak === 0) {
      cursor.setDate(cursor.getDate() - 1);
      const yesterdayKey = formatDate(cursor);
      if (entries[yesterdayKey] > 0) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
        continue;
      }
    }
    break;
  }

  return streak;
}

function calculateTotalPoints(habits) {
  return habits.reduce((sum, habit) => {
    const habitPoints = Object.values(habit.entries).reduce((entrySum, intensity) => {
      return entrySum + intensity * habit.pointsPerIntensity;
    }, 0);
    return sum + habitPoints;
  }, 0);
}

function App() {
  const [habits, setHabits] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [name, setName] = useState("");
  const [pointsPerIntensity, setPointsPerIntensity] = useState(10);

  const weekDates = useMemo(() => getWeekDates(new Date()), []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
  }, [habits]);

  const totalScore = useMemo(() => calculateTotalPoints(habits), [habits]);

  const addHabit = (event) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    const points = Number(pointsPerIntensity);
    const safePoints = Number.isFinite(points) && points > 0 ? points : 10;

    setHabits((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: trimmed,
        pointsPerIntensity: safePoints,
        entries: {},
      },
    ]);

    setName("");
    setPointsPerIntensity(10);
  };

  const removeHabit = (habitId) => {
    setHabits((prev) => prev.filter((habit) => habit.id !== habitId));
  };

  const setIntensity = (habitId, date, intensity) => {
    setHabits((prev) =>
      prev.map((habit) => {
        if (habit.id !== habitId) return habit;
        return {
          ...habit,
          entries: {
            ...habit.entries,
            [date]: intensity,
          },
        };
      })
    );
  };

  return (
    <main className="mx-auto max-w-6xl p-6">
      <header className="mb-6 rounded-xl bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold">Habit Tracker</h1>
        <p className="mt-2 text-slate-600">
          Track daily habit intensity (1-5), keep streaks alive, and earn points.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2">
          <span className="text-sm font-medium text-indigo-900">Total Score</span>
          <span className="rounded bg-indigo-600 px-2 py-1 text-sm font-bold text-white">
            {totalScore}
          </span>
        </div>
      </header>

      <section className="mb-6 rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Add Daily Habit</h2>
        <form className="flex flex-wrap items-end gap-3" onSubmit={addHabit}>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-600">Habit name</span>
            <input
              className="w-64 rounded border border-slate-300 px-3 py-2 outline-none ring-indigo-500 focus:ring"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Read 20 minutes"
              required
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-600">Points per intensity level</span>
            <input
              type="number"
              min="1"
              className="w-48 rounded border border-slate-300 px-3 py-2 outline-none ring-indigo-500 focus:ring"
              value={pointsPerIntensity}
              onChange={(e) => setPointsPerIntensity(e.target.value)}
            />
          </label>

          <button
            type="submit"
            className="rounded bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700"
          >
            Add Habit
          </button>
        </form>
      </section>

      <section className="rounded-xl bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Weekly Calendar</h2>
          <p className="text-sm text-slate-500">Green = done (&gt;0), Red = missed (0)</p>
        </div>

        {habits.length === 0 ? (
          <p className="rounded border border-dashed border-slate-300 p-4 text-slate-500">
            No habits yet. Add your first daily habit above.
          </p>
        ) : (
          <div className="space-y-4">
            {habits.map((habit) => {
              const streak = calculateCurrentStreak(habit.entries);
              const earnedBadges = BADGE_THRESHOLDS.filter((threshold) => streak >= threshold);
              const habitPoints = Object.values(habit.entries).reduce(
                (sum, intensity) => sum + intensity * habit.pointsPerIntensity,
                0
              );

              return (
                <article key={habit.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-semibold">{habit.name}</h3>
                      <p className="text-sm text-slate-600">
                        Streak: <span className="font-semibold">{streak} day(s)</span> · Points:{" "}
                        <span className="font-semibold">{habitPoints}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => removeHabit(habit.id)}
                      className="rounded border border-rose-300 px-3 py-1 text-sm font-medium text-rose-700 hover:bg-rose-50"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="mb-3 flex flex-wrap gap-2">
                    {BADGE_THRESHOLDS.map((threshold) => {
                      const earned = earnedBadges.includes(threshold);
                      return (
                        <span
                          key={threshold}
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            earned
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {threshold}-day badge {earned ? "✓" : ""}
                        </span>
                      );
                    })}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
                    {weekDates.map((date) => {
                      const intensity = Number(habit.entries[date] || 0);
                      const done = intensity > 0;

                      return (
                        <div
                          key={`${habit.id}-${date}`}
                          className={`rounded-md border p-3 ${
                            done
                              ? "border-emerald-200 bg-emerald-50"
                              : "border-rose-200 bg-rose-50"
                          }`}
                        >
                          <div className="mb-2 text-sm font-medium">{toDisplayDate(date)}</div>
                          <label className="text-xs text-slate-600">Intensity (0–5)</label>
                          <input
                            type="range"
                            min="0"
                            max="5"
                            step="1"
                            value={intensity}
                            onChange={(e) => setIntensity(habit.id, date, Number(e.target.value))}
                            className="mt-1 w-full"
                          />
                          <div className="mt-1 text-sm font-semibold">
                            {intensity === 0 ? "Didn’t do it" : `Intensity ${intensity}/5`}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
