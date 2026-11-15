import { useState } from "react";

import { type Nutritionist } from "@/api/types";

import { ServiceSelector } from "./ServiceSelector";

import styles from "./NutritionistCard.module.css";

interface NutritionistCardProps {
  person: Nutritionist;
  onBook: (person: Nutritionist, serviceId: number) => void;
}

export function NutritionistCard({ person, onBook }: NutritionistCardProps) {
  const [selectedServiceId, setSelectedServiceId] = useState(
    person.services[0]?.id ?? 0,
  );
  const selectedService =
    person.services.find((service) => service.id === selectedServiceId) ??
    person.services[0];
  const initials = person.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

  return (
    <article className={styles.card}>
      <div
        className={`${styles.avatar} grid shrink-0 place-items-center overflow-hidden rounded-full bg-[#dff7ee] text-2xl font-extrabold text-[#239a79]`}
        aria-hidden="true"
      >
        {initials}
      </div>
      <div className="min-w-0">
        <span className="inline-block rounded-full bg-[#dff9ef] px-[10px] py-[5px] text-[0.66rem] leading-none font-bold text-[#29b795]">
          ☆{" "}
          {person.services.some((service) => service.name === "Follow-up")
            ? "FOLLOW-UP"
            : "NUTRITIONIST"}
        </span>
        <h3 className="mt-1 text-xl font-semibold leading-tight text-[#29b795]">
          {person.name}
        </h3>
        <p className="mt-1 text-sm text-[#7d858c]">
          {person.credential} · {person.registration_number}
        </p>
        {selectedService && (
          <div className={styles.serviceGrid}>
            <div className="grid min-w-0 gap-2 text-[0.86rem] text-[#7d858c]">
              <span className="flex items-center gap-[9px] font-bold text-[#2bb697] [&_svg]:shrink-0 [&_svg]:text-[#9ddbd3]">
                <svg
                  aria-hidden="true"
                  width="21"
                  height="21"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  />
                  <circle
                    cx="12"
                    cy="10"
                    r="2.5"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  />
                </svg>
                <span>
                  {selectedService.modality === "online"
                    ? "Online appointment"
                    : "In-person appointment"}
                </span>
              </span>
              {selectedService.modality === "in_person" && (
                <>
                  <span className="pl-[30px]">{selectedService.address}</span>
                  <span className="pl-[30px]">{selectedService.city}</span>
                </>
              )}
            </div>
            <ServiceSelector
              nutritionistName={person.name}
              services={person.services}
              selectedService={selectedService}
              onSelectService={setSelectedServiceId}
            />
          </div>
        )}
      </div>
      <div className={`${styles.actions} flex flex-col gap-2`}>
        <button
          className="min-h-[42px] rounded-[2px] bg-[#f9e5e0] text-[0.88rem] text-[#e99775]"
          disabled={!selectedService}
          onClick={() => selectedService && onBook(person, selectedService.id)}
        >
          Schedule appointment
        </button>
        <button
          className="min-h-[42px] rounded-[2px] bg-[#def9ef] text-[0.88rem] text-[#2daf93]"
          disabled
          title="Website is not part of this challenge"
        >
          Website
        </button>
      </div>
    </article>
  );
}
