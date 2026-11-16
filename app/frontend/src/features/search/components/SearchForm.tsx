import { type SubmitEvent, useState } from "react";

import styles from "./SearchForm.module.css";

interface SearchFormProps {
  onSearch: (query: string, location: string) => void;
}

export function SearchForm({ onSearch }: SearchFormProps) {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");

  function submit(event: SubmitEvent) {
    event.preventDefault();
    onSearch(query, location);
  }

  return (
    <form
      onSubmit={submit}
      role="search"
      className="grid gap-3 sm:grid-cols-[minmax(0,1.02fr)_minmax(0,1fr)_minmax(7rem,0.34fr)] sm:gap-4"
    >
      <label className="sr-only" htmlFor="query">
        Name or service
      </label>
      <input
        id="query"
        className={`${styles.field} text-slate-800`}
        placeholder="Name, service, online appointment..."
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <label className="sr-only" htmlFor="location">
        Location
      </label>
      <div className="relative">
        <input
          id="location"
          className={`${styles.field} ${styles.locationField} text-slate-800`}
          placeholder="Location"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
        />
        <button
          type="button"
          disabled
          className="absolute inset-y-0 right-0 grid w-12 place-items-center text-emerald-600"
          aria-label="Use current location (unavailable)"
          title="Current location is not available yet"
        >
          <svg
            aria-hidden="true"
            width="21"
            height="21"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              cx="12"
              cy="12"
              r="4.25"
              stroke="currentColor"
              strokeWidth="1.7"
            />
            <path
              d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
            <circle cx="12" cy="12" r="1.35" fill="currentColor" />
          </svg>
        </button>
      </div>
      <button
        className={`${styles.submit} px-7 font-semibold text-white`}
        type="submit"
      >
        Search
      </button>
    </form>
  );
}
