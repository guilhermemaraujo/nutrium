export type LocalSlotResult =
  | { kind: "valid"; startsAt: Date }
  | {
      kind:
        "invalid_date" | "invalid_time" | "nonexistent_time" | "ambiguous_time";
    };

const hourMs = 60 * 60 * 1000;

export function resolveLocalSlot(
  date: string,
  time: string,
  timeZone: string,
): LocalSlotResult {
  const dateParts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!dateParts) return { kind: "invalid_date" };
  const timeParts = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!timeParts) return { kind: "invalid_time" };

  const [year, month, day] = dateParts.slice(1).map(Number);
  const [hour, minute] = timeParts.slice(1).map(Number);
  const wall = new Date(0);
  wall.setUTCFullYear(year, month - 1, day);
  wall.setUTCHours(hour, minute, 0, 0);
  if (
    wall.getUTCFullYear() !== year ||
    wall.getUTCMonth() !== month - 1 ||
    wall.getUTCDate() !== day
  )
    return { kind: "invalid_date" };

  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const localPartsAt = (instant: number) => {
    const parts = formatter.formatToParts(new Date(instant));
    const part = (type: string) =>
      Number(parts.find((item) => item.type === type)?.value);
    return {
      year: part("year"),
      month: part("month"),
      day: part("day"),
      hour: part("hour"),
      minute: part("minute"),
    };
  };
  const wallMs = wall.getTime();
  // Try offsets around the date, then retain only instants that round-trip to
  // the exact wall time. A gap has none; a repeated hour has two.
  const offsets = new Set<number>();
  for (let hours = -36; hours <= 36; hours += 6) {
    const sample = wallMs + hours * hourMs;
    const local = localPartsAt(sample);
    offsets.add(
      Date.UTC(
        local.year,
        local.month - 1,
        local.day,
        local.hour,
        local.minute,
      ) - sample,
    );
  }
  const matches = [...offsets]
    .map((offset) => new Date(wallMs - offset))
    .filter((candidate) => {
      const local = localPartsAt(candidate.getTime());
      return (
        local.year === year &&
        local.month === month &&
        local.day === day &&
        local.hour === hour &&
        local.minute === minute
      );
    });
  if (matches.length === 0) return { kind: "nonexistent_time" };
  if (matches.length > 1) return { kind: "ambiguous_time" };
  return { kind: "valid", startsAt: matches[0] };
}
