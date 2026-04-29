import client from './client';
import type { ApiResponse, Order, OrderItem, OrderStatus } from '../types';
import { mockGetOrders, mockCreateOrder, mockUpdateOrderStatus, mockDeleteOrder } from './mock/handlers';

const DEMO = import.meta.env.VITE_DEMO_MODE === 'true';

export interface OrderPayload {
  supplierId: string;
  locationId: string;
  items: OrderItem[];
  notes?: string | null;
  deliveryAt?: string | null;
}

export const getOrders = async (filters: { locationId?: string; supplierId?: string; status?: OrderStatus } = {}): Promise<Order[]> => {
  if (DEMO) return mockGetOrders(filters);
  const { data } = await client.get<ApiResponse<Order[]>>('/orders', { params: filters });
  return data.data;
};

export const createOrder = async (payload: OrderPayload): Promise<Order> => {
  if (DEMO) return mockCreateOrder(payload);
  const { data } = await client.post<ApiResponse<Order>>('/orders', payload);
  return data.data;
};

export const updateOrderStatus = async (id: string, status: OrderStatus): Promise<Order> => {
  if (DEMO) return mockUpdateOrderStatus(id, status);
  const { data } = await client.patch<ApiResponse<Order>>(`/orders/${id}/status`, { status });
  return data.data;
};

export const deleteOrder = async (id: string): Promise<void> => {
  if (DEMO) return mockDeleteOrder(id);
  await client.delete(`/orders/${id}`);
};
