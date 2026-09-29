import client, { DEMO } from './client';
import type { ApiResponse, Location } from '../types';
import { mockGetLocations, mockCreateLocation, mockUpdateLocation, mockDeleteLocation } from './mock/handlers';

export interface LocationPayload { name: string; address?: string | null }

export const getLocations = async (): Promise<Location[]> => {
  if (DEMO) return mockGetLocations();
  const { data } = await client.get<ApiResponse<Location[]>>('/locations');
  return data.data;
};

export const createLocation = async (payload: LocationPayload): Promise<Location> => {
  if (DEMO) return mockCreateLocation(payload);
  const { data } = await client.post<ApiResponse<Location>>('/locations', { name: payload.name, address: payload.address || undefined });
  return data.data;
};

export const updateLocation = async (id: string, payload: Partial<LocationPayload>): Promise<Location> => {
  if (DEMO) return mockUpdateLocation(id, payload);
  const { data } = await client.patch<ApiResponse<Location>>(`/locations/${id}`, { ...payload, address: payload.address || undefined });
  return data.data;
};

export const deleteLocation = async (id: string): Promise<void> => {
  if (DEMO) return mockDeleteLocation(id);
  await client.delete(`/locations/${id}`);
};

export { getEmployees } from './employees';
