import { useEffect, useRef, useState } from "react";

import { api, ApiRequestError } from "@/api/client";
import { type Nutritionist } from "@/api/types";
import {
  type BookingErrors,
  type BookingField,
  type BookingValues,
  futureSlots,
  nutritionistLocalDate,
  validateBooking,
} from "@/features/booking/bookingValidation";
import { resolveLocalSlot } from "@/lib/localSlot";

import { useAvailableDates } from "./useAvailableDates";
import { useAvailableSlots } from "./useAvailableSlots";

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
  const [now, setNow] = useState(() => Date.now());
  const statusRef = useRef<BookingStatus>("editing");
  const minDate = nutritionistLocalDate(person.time_zone, new Date(now));
  const [month, setMonth] = useState(() => minDate.slice(0, 7));
  const dates = useAvailableDates(person.id, values.service_id, month);
  const refreshDates = dates.retry;
  const visibleDate =
    dates.status === "success" &&
    month === values.date.slice(0, 7) &&
    dates.dates.includes(values.date) &&
    values.date >= minDate
      ? values.date
      : "";
  const availability = useAvailableSlots(
    person.id,
    values.service_id,
    visibleDate,
    dates.key,
  );
  const selectableAvailability = {
    ...availability,
    items: futureSlots(availability.items, now),
  };
  const visibleTime =
    selectableAvailability.status === "success" &&
    selectableAvailability.items.some((slot) => slot.time === values.time)
      ? values.time
      : "";

  useEffect(() => {
    const refreshClock = () => {
      const currentNow = Date.now();
      setNow(currentNow);
      const localMonth = nutritionistLocalDate(
        person.time_zone,
        new Date(currentNow),
      ).slice(0, 7);
      setMonth((current) => (current < localMonth ? localMonth : current));
      setValues((current) => {
        if (
          current.date &&
          current.date <
            nutritionistLocalDate(person.time_zone, new Date(currentNow))
        )
          return { ...current, date: "", time: "" };
        if (current.date && current.time) {
          const slot = resolveLocalSlot(
            current.date,
            current.time,
            person.time_zone,
          );
          if (slot.kind !== "valid" || slot.startsAt.getTime() <= currentNow)
            return { ...current, time: "" };
        }
        return current;
      });
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        refreshClock();
        if (statusRef.current === "editing") refreshDates();
      }
    };
    const interval = window.setInterval(refreshClock, 30_000);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [person.time_zone, refreshDates]);

  function update<K extends BookingField>(field: K, value: BookingValues[K]) {
    if (statusRef.current !== "editing") return;
    setValues((current) => ({
      ...current,
      [field]: value,
      ...(field === "service_id" ? { date: "", time: "" } : {}),
      ...(field === "date" ? { time: "" } : {}),
    }));
    setErrors((current) => {
      const next = { ...current };
      delete next[field];
      if (field === "service_id" || field === "date" || field === "time") {
        delete next.date;
        delete next.time;
      }
      return next;
    });
    setMessage("");
  }

  function changeMonth(nextMonth: string) {
    if (statusRef.current !== "editing" || nextMonth === month) return;
    setMonth(nextMonth);
    setValues((current) => ({ ...current, date: "", time: "" }));
    setErrors((current) => ({ ...current, date: undefined, time: undefined }));
    setMessage("");
  }

  function selectDate(date: string) {
    if (
      statusRef.current !== "editing" ||
      dates.status !== "success" ||
      !dates.dates.includes(date) ||
      date < minDate ||
      date.slice(0, 7) !== month
    )
      return;
    update("date", date);
  }

  function retryDates() {
    if (statusRef.current !== "editing") return;
    refreshDates();
  }

  async function submit() {
    if (statusRef.current !== "editing") return;
    const selectedValues = { ...values, date: visibleDate, time: visibleTime };
    const nextErrors = validateBooking(selectedValues, person);
    if (
      visibleDate &&
      selectedValues.time &&
      selectableAvailability.status === "success" &&
      !futureSlots(availability.items).some(
        (slot) => slot.time === selectedValues.time,
      )
    )
      nextErrors.time = "Choose an available time.";
    if (visibleDate && availability.status !== "success")
      nextErrors.time = "Load available times before submitting.";
    if (values.date && !visibleDate)
      nextErrors.date = "Choose an available date.";
    setErrors(nextErrors);
    setMessage("");
    if (Object.keys(nextErrors).length) return;

    statusRef.current = "submitting";
    setStatus("submitting");
    try {
      await api.createAppointmentRequest({
        service_id: values.service_id,
        guest: { name: values.name.trim(), email: values.email.trim() },
        date: selectedValues.date,
        time: selectedValues.time,
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
        if (fieldErrors.time || !Object.keys(fieldErrors).length) {
          setValues((current) => ({ ...current, time: "" }));
          refreshDates();
        }
      } else {
        setMessage("Could not submit your request. Please try again.");
      }
    }
  }

  return {
    values: { ...values, date: visibleDate, time: visibleTime },
    errors,
    message,
    status,
    minDate,
    month,
    dates: { ...dates, retry: retryDates },
    availability: selectableAvailability,
    changeMonth,
    selectDate,
    update,
    submit,
  };
}
