// api/auth.ts
import apiClient from './client';
import type { ApiResponse } from '../types/product';

interface LoginResponse {
  token: string;
  tokenType: string;
  username: string;
  role: string;
  expiresIn: number;
}

export const authApi = {
  login: async (username: string, password: string): Promise<string> => {
    const response = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', {
      username,
      password
    });
    const token = response.data.data.token;
    localStorage.setItem('auth_token', token);
    return token;
  },

  logout: () => {
    localStorage.removeItem('auth_token');
  },

  getToken: (): string | null => {
    return localStorage.getItem('auth_token');
  },

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('auth_token');
  }
};