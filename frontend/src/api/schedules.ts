import client, { DEMO } from './client';
import type { ApiResponse, Schedule } from '../types';
import { mockGetSchedules, mockCreateSchedule, mockUpdateSchedule, mockDeleteSchedule } from './mock/handlers';

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
  if (DEMO) return mockGetSchedules(filters);
  const { data } = await client.get<ApiResponse<Schedule[]>>('/schedules', { params: filters });
  return data.data;
};

export const createSchedule = async (payload: SchedulePayload): Promise<Schedule> => {
  if (DEMO) return mockCreateSchedule(payload);
  const { data } = await client.post<ApiResponse<Schedule>>('/schedules', payload);
  return data.data;
};

export const updateSchedule = async (id: string, payload: Partial<SchedulePayload>): Promise<Schedule> => {
  if (DEMO) return mockUpdateSchedule(id, payload);
  const { data } = await client.patch<ApiResponse<Schedule>>(`/schedules/${id}`, payload);
  return data.data;
};

export const deleteSchedule = async (id: string): Promise<void> => {
  if (DEMO) return mockDeleteSchedule(id);
  await client.delete(`/schedules/${id}`);
};
