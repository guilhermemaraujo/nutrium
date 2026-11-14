import { useRef, useState } from "react";

import { api, ApiRequestError } from "@/api/client";
import { type Nutritionist } from "@/api/types";
import {
  type BookingErrors,
  type BookingField,
  type BookingValues,
  validateBooking,
} from "@/features/booking/bookingValidation";

export type BookingStatus = "editing" | "submitting" | "success";

export function useAppointmentForm(
  person: Nutritionist,
  initialServiceId: number,
) {
  const [values, setValues] = useState<BookingValues>({
    service_id: initialServiceId,
    name: "",
    email: "",
    date: "",
    time: "",
  });
  const [errors, setErrors] = useState<BookingErrors>({});
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<BookingStatus>("editing");
  const statusRef = useRef<BookingStatus>("editing");

  function update<K extends BookingField>(field: K, value: BookingValues[K]) {
    if (statusRef.current !== "editing") return;
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[field];
      if (field === "date" || field === "time") {
        delete next.date;
        delete next.time;
      }
      return next;
    });
    setMessage("");
  }

  async function submit() {
    if (statusRef.current !== "editing") return;
    const nextErrors = validateBooking(values, person);
    setErrors(nextErrors);
    setMessage("");
    if (Object.keys(nextErrors).length) return;

    statusRef.current = "submitting";
    setStatus("submitting");
    try {
      await api.createAppointmentRequest({
        service_id: values.service_id,
        guest: { name: values.name.trim(), email: values.email.trim() },
        date: values.date,
        time: values.time,
      });
      statusRef.current = "success";
      setStatus("success");
    } catch (error) {
      statusRef.current = "editing";
      setStatus("editing");
      if (error instanceof ApiRequestError) {
        const fieldErrors: BookingErrors = {};
        for (const field of [
          "service_id",
          "name",
          "email",
          "date",
          "time",
        ] as const) {
          const fieldMessage = error.fields?.[field]?.[0];
          if (fieldMessage) fieldErrors[field] = fieldMessage;
        }
        setErrors(fieldErrors);
        setMessage(error.message);
      } else {
        setMessage("Could not submit your request. Please try again.");
      }
    }
  }

  return { values, errors, message, status, update, submit };
}
