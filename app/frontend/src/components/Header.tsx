import { Link } from "react-router";

import logo from "@/assets/nutrium_logo.webp";

interface HeaderProps {
  showProfessionalCta?: boolean;
}

export function Header({ showProfessionalCta = true }: HeaderProps) {
  return (
    <header className="mx-auto flex max-w-[1380px] items-center justify-between gap-3 px-5 py-5 sm:px-8 sm:py-6">
      <Link to="/" className="inline-flex items-center">
        <img src={logo} alt="Nutrium" className="h-8 w-auto sm:h-10" />
      </Link>
      {showProfessionalCta && (
        <Link
          to="/requests"
          aria-label="Are you a nutrition professional? Get to know our software"
          className="inline-flex items-center gap-2 text-sm text-white/90 underline-offset-4 hover:underline focus-visible:underline sm:text-[17px]"
        >
          <span aria-hidden="true" className="sm:hidden">
            For professionals
          </span>
          <span aria-hidden="true" className="hidden sm:inline">
            Are you a nutrition professional? Get to know our software
          </span>
          <svg
            aria-hidden="true"
            className="shrink-0"
            width="21"
            height="21"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M4 12h15m-6-6 6 6-6 6"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      )}
    </header>
  );
}
