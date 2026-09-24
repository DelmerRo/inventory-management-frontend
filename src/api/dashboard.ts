// api/dashboard.ts
import apiClient from './client';
import type { ApiResponse } from '../types/product'; // Reutilizamos tu ApiResponse base
import type { DashboardResponse } from '../types/dashboard';

export const dashboardApi = {
    getFinancials: async (targetMarginPercentage: number = 35.0): Promise<DashboardResponse> => {
        const response = await apiClient.get<ApiResponse<DashboardResponse>>(
            `/dashboard/financials?targetMarginPercentage=${targetMarginPercentage}`
        );
        return response.data.data;
    }
};