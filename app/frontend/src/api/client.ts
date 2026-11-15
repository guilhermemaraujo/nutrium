import { createMockApi } from "@/mocks/createMockApi";

import type {
  AvailabilityApi,
  BookingApi,
  RequestsApi,
  SearchApi,
} from "./contracts";
import { httpApi } from "./httpApi";

export type {
  AvailabilityApi,
  BookingApi,
  RequestsApi,
  SearchApi,
} from "./contracts";
export { ApiRequestError } from "./contracts";
export { httpApi } from "./httpApi";
export { createMockApi } from "@/mocks/createMockApi";

export const api: SearchApi & BookingApi & RequestsApi & AvailabilityApi =
  import.meta.env.VITE_API_MODE === "http" ? httpApi : createMockApi();
