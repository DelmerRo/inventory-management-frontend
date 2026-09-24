// store/dashboardStore.ts
import { create } from 'zustand';
import { dashboardApi } from '../api/dashboard';
import type { DashboardResponse } from '../types/dashboard';

interface DashboardState {
    data: DashboardResponse | null;
    isLoading: boolean;
    error: string | null;
    targetMargin: number;
    
    fetchDashboard: (margin: number) => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set) => ({
    data: null,
    isLoading: false,
    error: null,
    targetMargin: 35.0, // Margen por defecto

    fetchDashboard: async (margin: number) => {
        set({ isLoading: true, error: null, targetMargin: margin });
        try {
            const data = await dashboardApi.getFinancials(margin);
            set({ data, isLoading: false });
        } catch (error: any) {
            const errorMsg = error.response?.data?.message || 'Error al cargar métricas del dashboard';
            console.error('Error fetchDashboard:', errorMsg);
            set({ error: errorMsg, isLoading: false });
        }
    }
}));