import { Route, Routes } from "react-router";

import { RequestsPage } from "@/features/requests";
import { SearchPage } from "@/features/search";
import { NotFoundPage } from "@/pages/NotFoundPage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<SearchPage />} />
      <Route path="/requests" element={<RequestsPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
