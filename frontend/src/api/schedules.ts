import client from './client';
import type { ApiResponse, Schedule } from '../types';

export interface ScheduleFilters {
  locationId?: string;
  employeeId?: string;
  from?: string;
  to?: string;
}

export interface SchedulePayload {
  employeeId: string;
  locationId: string;
  date: string;
  startTime: string;
  endTime: string;
  notes?: string | null;
}

export const getSchedules = async (filters: ScheduleFilters = {}): Promise<Schedule[]> => {
  const { data } = await client.get<ApiResponse<Schedule[]>>('/schedules', { params: filters });
  return data.data;
};

export const createSchedule = async (payload: SchedulePayload): Promise<Schedule> => {
  const { data } = await client.post<ApiResponse<Schedule>>('/schedules', payload);
  return data.data;
};

export const updateSchedule = async (id: string, payload: Partial<SchedulePayload>): Promise<Schedule> => {
  const { data } = await client.patch<ApiResponse<Schedule>>(`/schedules/${id}`, payload);
  return data.data;
};

export const deleteSchedule = async (id: string): Promise<void> => {
  await client.delete(`/schedules/${id}`);
};
