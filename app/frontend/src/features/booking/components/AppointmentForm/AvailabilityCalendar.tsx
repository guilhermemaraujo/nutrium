import { useMemo } from "react";

import { DayPicker, TZDate } from "@daypicker/react";

import type { useAvailableDates } from "@/features/booking/hooks/useAvailableDates";

import { FieldError } from "./FieldError";

import "@daypicker/react/style.css";
import styles from "./AvailabilityCalendar.module.css";

interface AvailabilityCalendarProps {
  timeZone: string;
  month: string;
  minDate: string;
  selectedDate: string;
  availability: Pick<
    ReturnType<typeof useAvailableDates>,
    "status" | "dates" | "retry"
  >;
  error?: string;
  onMonthChange: (month: string) => void;
  onDateSelect: (date: string) => void;
}

function zonedDate(date: string, timeZone: string) {
  const [year, month, day = 1] = date.split("-").map(Number);
  return TZDate.tz(timeZone, year, month - 1, day);
}

export function AvailabilityCalendar({
  timeZone,
  month,
  minDate,
  selectedDate,
  availability,
  error,
  onMonthChange,
  onDateSelect,
}: AvailabilityCalendarProps) {
  const available = new Set(availability.dates);
  const endYear = Number(minDate.slice(0, 4)) + 100;
  const localDate = useMemo(() => {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return (day: Date) => {
      const parts = formatter.formatToParts(day);
      const value = (type: "year" | "month" | "day") =>
        parts.find((part) => part.type === type)!.value;
      return `${value("year")}-${value("month")}-${value("day")}`;
    };
  }, [timeZone]);
  const isDisabled = (day: Date) => {
    const date = localDate(day);
    return (
      availability.status !== "success" ||
      date < minDate ||
      !available.has(date)
    );
  };

  return (
    <div className="min-w-0 text-sm text-slate-700">
      <span
        id="booking-date-label"
        className="inline-flex items-center gap-2 font-medium"
      >
        Date
        <span
          aria-hidden="true"
          className={`size-3.5 rounded-full border-2 border-[#9ddbd3] border-t-[#239a79] ${availability.status === "loading" ? "animate-spin" : "invisible"}`}
        />
      </span>
      {availability.status === "loading" && (
        <span role="status" className="sr-only">
          Loading available dates…
        </span>
      )}
      <div aria-busy={availability.status === "loading"}>
        <DayPicker
          mode="single"
          timeZone={timeZone}
          weekStartsOn={1}
          captionLayout="dropdown"
          navLayout="after"
          aria-labelledby="booking-date-label"
          aria-describedby={error ? "booking-date-error" : undefined}
          month={zonedDate(month, timeZone)}
          startMonth={zonedDate(minDate.slice(0, 7), timeZone)}
          endMonth={TZDate.tz(timeZone, endYear, 11, 1)}
          selected={
            selectedDate ? zonedDate(selectedDate, timeZone) : undefined
          }
          disabled={isDisabled}
          onMonthChange={(day) => onMonthChange(localDate(day).slice(0, 7))}
          onSelect={(day) => {
            if (!day) return;
            const date = localDate(day);
            if (!isDisabled(day)) onDateSelect(date);
          }}
          className={
            availability.status === "loading"
              ? `${styles.calendar} ${styles.loading}`
              : styles.calendar
          }
        />
      </div>
      <FieldError id="booking-date-error" message={error} />
      {availability.status === "error" && (
        <div role="alert" className="mt-2 text-sm text-red-800">
          <p>Could not load available dates.</p>
          <button
            type="button"
            onClick={availability.retry}
            className="font-semibold underline"
          >
            Retry dates
          </button>
        </div>
      )}
      {availability.status === "success" && availability.dates.length === 0 && (
        <p role="status" className="mt-2 text-sm text-slate-600">
          No available dates this month. Try another month.
        </p>
      )}
    </div>
  );
}
