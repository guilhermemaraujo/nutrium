import type { Service } from "@/api/types";

interface ServiceSelectorProps {
  nutritionistName: string;
  services: Service[];
  selectedService: Service;
  onSelectService: (id: number) => void;
}

const priceFormatter = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
});

export function ServiceSelector({
  nutritionistName,
  services,
  selectedService,
  onSelectService,
}: ServiceSelectorProps) {
  return (
    <div className="min-w-0 text-[0.86rem] text-[#7d858c]">
      <div className="flex items-center gap-[9px] [&>svg]:shrink-0 [&>svg]:text-[#9ddbd3]">
        <svg
          aria-hidden="true"
          width="21"
          height="21"
          viewBox="0 0 24 24"
          fill="none"
        >
          <rect
            x="3"
            y="7"
            width="18"
            height="13"
            rx="1.5"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <path
            d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7M3 12h18"
            stroke="currentColor"
            strokeWidth="1.7"
          />
        </svg>
        <div className="relative w-max max-w-full min-w-0 flex-[0_1_auto]">
          <select
            aria-label={`Service for ${nutritionistName}`}
            className="w-full cursor-pointer appearance-none pr-5 font-semibold text-[#657488] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[#2ab78d] disabled:cursor-default disabled:opacity-100"
            value={selectedService.id}
            disabled={services.length < 2}
            onChange={(event) => onSelectService(Number(event.target.value))}
          >
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
          {services.length > 1 && (
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 right-0 -translate-y-1/2"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="m6 9 6 6 6-6"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      </div>
      <p
        className="mt-3 flex items-center gap-[9px] [&>svg]:shrink-0 [&>svg]:text-[#9ddbd3]"
        aria-live="polite"
      >
        <svg
          aria-hidden="true"
          width="21"
          height="21"
          viewBox="0 0 24 24"
          fill="none"
        >
          <rect
            x="2.5"
            y="5"
            width="19"
            height="14"
            rx="1.5"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <circle
            cx="12"
            cy="12"
            r="3"
            stroke="currentColor"
            strokeWidth="1.7"
          />
        </svg>
        <span>
          {priceFormatter.format(selectedService.price_cents / 100)} ·{" "}
          {selectedService.duration_minutes} min
        </span>
      </p>
    </div>
  );
}
