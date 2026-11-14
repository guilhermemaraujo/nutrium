import { type NutritionistOption } from "@/api/types";
import { usePendingRequests } from "@/features/requests/hooks/usePendingRequests";

interface NutritionistSelectProps {
  selected: NutritionistOption;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  dashboard: ReturnType<typeof usePendingRequests>;
}

export function NutritionistSelect({
  selected,
  setPage,
  dashboard,
}: NutritionistSelectProps) {
  return (
    <div className="mb-5 sm:ml-auto sm:max-w-64">
      <label
        htmlFor="nutritionist-select"
        className="mb-1 block text-xs font-semibold text-[#526065]"
      >
        View requests for
      </label>
      <select
        id="nutritionist-select"
        value={selected.id}
        disabled={dashboard.decidingId !== null}
        aria-describedby="nutritionist-select-help"
        onChange={(event) => {
          setPage(1);
          dashboard.selectNutritionist(Number(event.target.value));
        }}
        className="w-full rounded-lg border border-[#d9e2df] bg-white px-3 py-2 text-sm text-[#263b3e] disabled:opacity-60"
      >
        {dashboard.nutritionists.map((person) => (
          <option key={person.id} value={person.id}>
            {person.name}
          </option>
        ))}
      </select>
      <p id="nutritionist-select-help" className="mt-1 text-xs text-[#626e73]">
        {dashboard.decidingId === null
          ? "Demo view; no account sign-in"
          : "Finish updating this request before switching."}
      </p>
    </div>
  );
}
