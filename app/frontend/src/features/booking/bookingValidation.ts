import type { Nutritionist } from "@/api/types";
import { resolveLocalSlot } from "@/lib/localSlot";

export interface BookingValues {
  service_id: number;
  name: string;
  email: string;
  date: string;
  time: string;
}

export type BookingField = keyof BookingValues;
export type BookingErrors = Partial<Record<BookingField, string>>;

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
  if (values.date && values.time) {
    const slot = resolveLocalSlot(values.date, values.time, person.time_zone);
    if (slot.kind === "invalid_date") errors.date = "Choose a valid date.";
    if (slot.kind === "invalid_time") errors.time = "Choose a valid time.";
    if (slot.kind === "nonexistent_time")
      errors.time = "This local time does not exist. Choose another time.";
    if (slot.kind === "ambiguous_time")
      errors.time = "This local time occurs twice. Choose another time.";
    if (slot.kind === "valid" && slot.startsAt.getTime() <= Date.now())
      errors.date = "Choose a future date and time.";
  }
  return errors;
}
