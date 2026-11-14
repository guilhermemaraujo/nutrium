import { useEffect, useRef } from "react";

import type { Nutritionist } from "@/api/types";
import { AppointmentForm } from "@/features/booking/components/AppointmentForm";
import { useAppointmentForm } from "@/features/booking/hooks/useAppointmentForm";

interface AppointmentDialogProps {
  person: Nutritionist;
  initialServiceId: number;
  onClose: () => void;
}

export function AppointmentDialog({
  person,
  initialServiceId,
  onClose,
}: AppointmentDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const form = useAppointmentForm(person, initialServiceId);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    dialog.showModal();
    dialog.querySelector("select")?.focus();
    return () => {
      dialog.close();
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  useEffect(() => {
    if (form.status === "success") closeRef.current?.focus();
  }, [form.status]);

  function handleBackdropClick(event: React.MouseEvent<HTMLDialogElement>) {
    if (event.target !== event.currentTarget || form.status === "submitting")
      return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    )
      onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="booking-title"
      aria-describedby={
        form.status === "success" ? "booking-success" : "booking-description"
      }
      onCancel={(event) => {
        event.preventDefault();
        if (form.status !== "submitting") onClose();
      }}
      onClick={handleBackdropClick}
      className="fixed inset-0 m-auto w-[calc(100%-1.5rem)] max-w-lg max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-lg border-0 bg-white p-5 text-slate-800 shadow-xl backdrop:bg-slate-900/55 sm:p-7"
    >
      <div className="flex items-start justify-between gap-4">
        <h2 id="booking-title" className="text-xl font-semibold text-[#239a79]">
          Request an appointment
        </h2>
        <button
          ref={closeRef}
          type="button"
          aria-label="Close appointment request"
          onClick={onClose}
          disabled={form.status === "submitting"}
          className="rounded px-2 text-2xl text-slate-500 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-[#2ab78d]"
        >
          ×
        </button>
      </div>
      {form.status === "success" ? (
        <div id="booking-success" role="status" className="mt-5 space-y-3">
          <p className="font-semibold text-[#239a79]">
            Your appointment request was submitted.
          </p>
          <p>
            The request for {person.name} is pending. The professional will
            review it; this is not a confirmed appointment.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-[#2daf93] px-5 py-2 font-semibold text-white"
          >
            Done
          </button>
        </div>
      ) : (
        <>
          <p id="booking-description" className="mt-2 text-sm text-slate-600">
            Choose a service and a future local time for {person.name} (
            {person.time_zone}).
          </p>
          <AppointmentForm
            person={person}
            values={form.values}
            errors={form.errors}
            message={form.message}
            submitting={form.status === "submitting"}
            onChange={form.update}
            onSubmit={() => void form.submit()}
          />
        </>
      )}
    </dialog>
  );
}
