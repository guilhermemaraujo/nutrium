import type { SubmitEvent } from "react";

import type { Nutritionist } from "@/api/types";
import type {
  BookingErrors,
  BookingField,
  BookingValues,
} from "@/features/booking/bookingValidation";
import type { useAvailableDates } from "@/features/booking/hooks/useAvailableDates";
import type { useAvailableSlots } from "@/features/booking/hooks/useAvailableSlots";

import { AvailabilityCalendar } from "./AvailabilityCalendar";
import { FieldError } from "./FieldError";

interface AppointmentFormProps {
  person: Nutritionist;
  values: BookingValues;
  errors: BookingErrors;
  message: string;
  submitting: boolean;
  minDate: string;
  month: string;
  dates: ReturnType<typeof useAvailableDates>;
  availability: ReturnType<typeof useAvailableSlots>;
  onMonthChange: (month: string) => void;
  onDateSelect: (date: string) => void;
  onChange: <K extends BookingField>(field: K, value: BookingValues[K]) => void;
  onSubmit: () => void;
}

const fieldClass =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-800 focus-visible:outline-2 focus-visible:outline-[#2ab78d]";

export function AppointmentForm({
  person,
  values,
  errors,
  message,
  submitting,
  minDate,
  month,
  dates,
  availability,
  onMonthChange,
  onDateSelect,
  onChange,
  onSubmit,
}: AppointmentFormProps) {
  const timeReady =
    Boolean(values.date) &&
    availability.status === "success" &&
    availability.items.length > 0;

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-busy={submitting}
      className="mt-5 grid gap-4"
    >
      <fieldset disabled={submitting} className="contents">
        <label className="block text-sm font-medium text-slate-700">
          Service
          <select
            required
            value={values.service_id}
            onChange={(event) =>
              onChange("service_id", Number(event.target.value))
            }
            aria-invalid={!!errors.service_id}
            aria-describedby={
              errors.service_id ? "booking-service-error" : undefined
            }
            className={fieldClass}
          >
            {person.services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} ·{" "}
                {service.modality === "online" ? "Online" : "In person"} · €
                {(service.price_cents / 100).toFixed(2)} ·{" "}
                {service.duration_minutes} min
              </option>
            ))}
          </select>
          <FieldError id="booking-service-error" message={errors.service_id} />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Your name
          <input
            required
            value={values.name}
            onChange={(event) => onChange("name", event.target.value)}
            autoComplete="name"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "booking-name-error" : undefined}
            className={fieldClass}
          />
          <FieldError id="booking-name-error" message={errors.name} />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Email
          <input
            required
            type="email"
            value={values.email}
            onChange={(event) => onChange("email", event.target.value)}
            autoComplete="email"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "booking-email-error" : undefined}
            className={fieldClass}
          />
          <FieldError id="booking-email-error" message={errors.email} />
        </label>
        <div className="grid min-w-0 gap-4 sm:grid-cols-[224px_minmax(0,1fr)] sm:items-start">
          <AvailabilityCalendar
            timeZone={person.time_zone}
            month={month}
            minDate={minDate}
            selectedDate={values.date}
            availability={dates}
            error={errors.date}
            onMonthChange={onMonthChange}
            onDateSelect={onDateSelect}
          />
          <div className="min-w-0 text-sm text-slate-700">
            <label
              htmlFor="booking-time"
              className="inline-flex items-center gap-2 font-medium"
            >
              Available time
              <span
                aria-hidden="true"
                className={`size-3.5 rounded-full border-2 border-[#9ddbd3] border-t-[#239a79] ${availability.status === "loading" ? "animate-spin" : "invisible"}`}
              />
            </label>
            {availability.status === "loading" && (
              <span role="status" className="sr-only">
                Loading available times…
              </span>
            )}
            <select
              id="booking-time"
              aria-busy={availability.status === "loading"}
              required
              disabled={submitting || !timeReady}
              value={values.time}
              onChange={(event) => onChange("time", event.target.value)}
              aria-invalid={!!errors.time}
              aria-describedby={errors.time ? "booking-time-error" : undefined}
              className={`${fieldClass} ${!values.date ? "opacity-50" : !timeReady ? "opacity-60" : ""}`}
            >
              <option value="">
                {values.date ? "Choose a time" : "Choose a date first"}
              </option>
              {availability.items.map((slot) => (
                <option key={slot.starts_at} value={slot.time}>
                  {slot.time}
                </option>
              ))}
            </select>
            <FieldError id="booking-time-error" message={errors.time} />
            {values.date &&
              availability.status === "success" &&
              availability.items.length === 0 && (
                <p role="status" className="mt-2 text-slate-600">
                  No available times on this date. Choose another date.
                </p>
              )}
            {availability.status === "error" && (
              <div role="alert" className="mt-2 text-red-800">
                <p>Could not load available times.</p>
                <button
                  type="button"
                  onClick={availability.retry}
                  className="font-semibold underline"
                >
                  Retry times
                </button>
              </div>
            )}
          </div>
        </div>
      </fieldset>
      {message && (
        <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-800">
          {message}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="rounded bg-[#e99775] px-5 py-3 font-semibold text-white hover:bg-[#d98565] disabled:opacity-60"
      >
        {submitting ? "Submitting request…" : "Submit appointment request"}
      </button>
    </form>
  );
}
