import client from './client';
import type { ApiResponse, Location, Employee } from '../types';

export const getLocations = async (): Promise<Location[]> => {
  const { data } = await client.get<ApiResponse<Location[]>>('/locations');
  return data.data;
};

export const getEmployees = async (): Promise<Employee[]> => {
  const { data } = await client.get<ApiResponse<Employee[]>>('/employees');
  return data.data;
};
