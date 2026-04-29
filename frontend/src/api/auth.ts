import client from './client';
import type { LoginResponse } from '../types';
import { mockLogin } from './mock/handlers';

const DEMO = import.meta.env.VITE_DEMO_MODE === 'true';

export const login = async (email: string, password: string): Promise<LoginResponse['data']> => {
  if (DEMO) return mockLogin(email, password);
  const { data } = await client.post<LoginResponse>('/auth/login', { email, password });
  return data.data;
};

export const register = async (payload: {
  email: string; password: string; name: string; groupName: string;
}): Promise<LoginResponse['data']> => {
  const { data } = await client.post<LoginResponse>('/auth/register', payload);
  return data.data;
};
