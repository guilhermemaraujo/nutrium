import type {
  ApiError,
  AppointmentRequest,
  AppointmentRequestListResponse,
  AvailableDatesResponse,
  AvailableSlotsResponse,
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

export interface AvailabilityApi {
  listAvailableDates(
    nutritionistId: number,
    serviceId: number,
    month: string,
    signal?: AbortSignal,
  ): Promise<AvailableDatesResponse>;
  listAvailableSlots(
    nutritionistId: number,
    serviceId: number,
    date: string,
    signal?: AbortSignal,
  ): Promise<AvailableSlotsResponse>;
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
