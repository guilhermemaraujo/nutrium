import type { SubmitEvent } from "react";

import type { Nutritionist } from "@/api/types";
import type {
  BookingErrors,
  BookingField,
  BookingValues,
} from "@/features/booking/bookingValidation";

import { FieldError } from "./FieldError";

interface AppointmentFormProps {
  person: Nutritionist;
  values: BookingValues;
  errors: BookingErrors;
  message: string;
  submitting: boolean;
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
  onChange,
  onSubmit,
}: AppointmentFormProps) {
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
                {service.name} · €{(service.price_cents / 100).toFixed(2)} ·{" "}
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
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            Date
            <input
              required
              type="date"
              value={values.date}
              onChange={(event) => onChange("date", event.target.value)}
              aria-invalid={!!errors.date}
              aria-describedby={errors.date ? "booking-date-error" : undefined}
              className={fieldClass}
            />
            <FieldError id="booking-date-error" message={errors.date} />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Time
            <input
              required
              type="time"
              value={values.time}
              onChange={(event) => onChange("time", event.target.value)}
              aria-invalid={!!errors.time}
              aria-describedby={errors.time ? "booking-time-error" : undefined}
              className={fieldClass}
            />
            <FieldError id="booking-time-error" message={errors.time} />
          </label>
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
