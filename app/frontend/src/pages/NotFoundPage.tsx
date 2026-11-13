import { Link } from "react-router";

import { Header } from "@/components/Header";

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col bg-slate-50">
      <div className="bg-[linear-gradient(115deg,#38b989,#31ab91)] text-white">
        <Header />
      </div>
      <div className="grid flex-1 place-items-center px-5 text-center">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-emerald-600">
            404
          </p>
          <h1 className="mt-2 text-3xl font-bold">Page not found</h1>
          <p className="mt-2 text-slate-500">This page does not exist.</p>
          <Link
            className="mt-6 inline-block rounded-lg bg-[#28af87] px-[1.2rem] py-[0.72rem] font-bold text-white hover:bg-[#168d70]"
            to="/"
          >
            Back to search
          </Link>
        </div>
      </div>
    </main>
  );
}
