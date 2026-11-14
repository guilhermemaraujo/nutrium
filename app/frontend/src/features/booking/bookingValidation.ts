import type { Nutritionist } from "@/api/types";

export interface BookingValues {
  service_id: number;
  name: string;
  email: string;
  date: string;
  time: string;
}

export type BookingField = keyof BookingValues;
export type BookingErrors = Partial<Record<BookingField, string>>;

function localNow(timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

export function validateBooking(
  values: BookingValues,
  person: Nutritionist,
): BookingErrors {
  const errors: BookingErrors = {};
  if (!person.services.some((service) => service.id === values.service_id))
    errors.service_id = "Choose a service.";
  if (!values.name.trim()) errors.name = "Enter your name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()))
    errors.email = "Enter a valid email address.";
  if (!values.date) errors.date = "Choose a date.";
  if (!values.time) errors.time = "Choose a time.";
  if (
    values.date &&
    values.time &&
    `${values.date}T${values.time}` <= localNow(person.time_zone)
  )
    errors.date = "Choose a future date and time.";
  return errors;
}
