import client from './client';
import type { ApiResponse, Location, Employee } from '../types';
import { mockGetLocations, mockGetEmployees } from './mock/handlers';

const DEMO = import.meta.env.VITE_DEMO_MODE === 'true';

export const getLocations = async (): Promise<Location[]> => {
  if (DEMO) return mockGetLocations();
  const { data } = await client.get<ApiResponse<Location[]>>('/locations');
  return data.data;
};

export const getEmployees = async (): Promise<Employee[]> => {
  if (DEMO) return mockGetEmployees();
  const { data } = await client.get<ApiResponse<Employee[]>>('/employees');
  return data.data;
};
