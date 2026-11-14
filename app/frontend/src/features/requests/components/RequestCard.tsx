import type { AppointmentRequest } from "@/api/types";

interface RequestCardProps {
  request: AppointmentRequest;
  timeZone: string;
  updating: boolean;
  disabled: boolean;
  error: string | null;
  onAccept: () => void;
  onReject: () => void;
}

export function RequestCard({
  request,
  timeZone,
  updating,
  disabled,
  error,
  onAccept,
  onReject,
}: RequestCardProps) {
  const startsAt = new Date(request.starts_at);
  const date = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(startsAt);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const initials = request.guest.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <article
      className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-[#e8ebeb] bg-white"
      aria-labelledby={`request-${request.id}`}
    >
      <div className="flex flex-1 gap-3 p-4 sm:p-[18px]">
        <span
          aria-hidden="true"
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#d7f3e8] text-lg font-semibold text-[#249d7c]"
        >
          {initials}
        </span>
        <div className="min-w-0">
          <h2
            id={`request-${request.id}`}
            className="text-[15px] font-medium leading-5 text-[#5e696d]"
          >
            {request.guest.name}
          </h2>
          <p className="text-xs text-[#626e73]">
            {request.service.modality === "online"
              ? "Online appointment"
              : "In-person appointment"}
          </p>
          <p className="mt-1 text-xs text-[#626e73]">{request.service.name}</p>
          <p className="mt-1 break-all text-xs text-[#626e73]">
            {request.guest.email}
          </p>
          <dl className="mt-4 space-y-1.5 text-xs text-[#68767a]">
            <div className="flex items-center gap-2">
              <dt className="sr-only">Date</dt>
              <svg
                aria-hidden="true"
                className="size-3.5 shrink-0 text-[#27b78e]"
                viewBox="0 0 16 16"
                fill="none"
              >
                <rect
                  x="2"
                  y="3.5"
                  width="12"
                  height="10.5"
                  rx="1.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M5 2v3M11 2v3M2 6.5h12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <dd>{date}</dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="sr-only">Time</dt>
              <svg
                aria-hidden="true"
                className="size-3.5 shrink-0 text-[#27b78e]"
                viewBox="0 0 16 16"
                fill="none"
              >
                <circle
                  cx="8"
                  cy="8"
                  r="6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M8 4.5V8l2.5 1.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <dd>{time.format(startsAt)}</dd>
            </div>
          </dl>
        </div>
      </div>
      <div className="flex border-t border-[#e8ebeb]">
        <button
          type="button"
          disabled={disabled}
          onClick={onAccept}
          className="min-w-0 flex-1 px-3 py-3 text-sm font-semibold text-[#167b63] hover:bg-[#edf9f4] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#167b63] disabled:opacity-60"
        >
          {updating ? "Updating…" : "Accept"}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onReject}
          className="min-w-0 flex-1 border-l border-[#e8ebeb] px-3 py-3 text-sm font-semibold text-[#a34543] hover:bg-[#fff3f2] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#a34543] disabled:opacity-60"
        >
          Reject
        </button>
      </div>
      {error && (
        <p
          role="alert"
          className="border-t border-[#e8ebeb] p-3 text-sm text-[#b74342]"
        >
          {error}
        </p>
      )}
    </article>
  );
}
