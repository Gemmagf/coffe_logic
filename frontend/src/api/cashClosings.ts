import client from './client';
import type { ApiResponse, CashClosing } from '../types';

export interface CashClosingPayload {
  locationId: string;
  date: string;
  openingAmount: number;
  closingAmount: number;
  sales: number;
  cardSales: number;
  cashSales: number;
  expenses: number;
  notes?: string | null;
}

export const getCashClosings = async (filters: { locationId?: string; from?: string; to?: string } = {}): Promise<CashClosing[]> => {
  const { data } = await client.get<ApiResponse<CashClosing[]>>('/cash-closings', { params: filters });
  return data.data;
};

export const createCashClosing = async (payload: CashClosingPayload): Promise<CashClosing> => {
  const { data } = await client.post<ApiResponse<CashClosing>>('/cash-closings', payload);
  return data.data;
};

export const updateCashClosing = async (id: string, payload: CashClosingPayload): Promise<CashClosing> => {
  const { data } = await client.put<ApiResponse<CashClosing>>(`/cash-closings/${id}`, payload);
  return data.data;
};

export const deleteCashClosing = async (id: string): Promise<void> => {
  await client.delete(`/cash-closings/${id}`);
};
