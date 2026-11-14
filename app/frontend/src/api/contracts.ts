import type {
  ApiError,
  AppointmentRequest,
  AppointmentRequestListResponse,
  CreateAppointmentRequest,
  DecideAppointmentRequest,
  NutritionistOption,
  SearchResponse,
} from "./types";

export interface SearchApi {
  search(
    query: string,
    location: string,
    page: number,
    signal?: AbortSignal,
  ): Promise<SearchResponse>;
}

export interface BookingApi {
  createAppointmentRequest(
    input: CreateAppointmentRequest,
  ): Promise<AppointmentRequest>;
}

export interface RequestsApi {
  listNutritionists(signal?: AbortSignal): Promise<NutritionistOption[]>;
  listAppointmentRequests(
    nutritionistId: number,
    signal?: AbortSignal,
  ): Promise<AppointmentRequestListResponse>;
  decideAppointmentRequest(
    nutritionistId: number,
    requestId: AppointmentRequest["id"],
    input: DecideAppointmentRequest,
  ): Promise<AppointmentRequest>;
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly fields: ApiError["fields"] = {},
  ) {
    super(message);
  }
}
