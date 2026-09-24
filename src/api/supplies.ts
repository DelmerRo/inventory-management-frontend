// api/supplies.ts
import apiClient from './client';
import type { 
    SupplyResponse, 
    SupplyRequest, 
    SupplyMovementRequest, 
    SupplyMovementResponse, 
    ApiResponse 
} from '../types/supply';

export const supplyApi = {
    getAll: async (): Promise<SupplyResponse[]> => {
        const response = await apiClient.get<ApiResponse<SupplyResponse[]>>('/supplies');
        return response.data.data;
    },

    create: async (data: SupplyRequest): Promise<SupplyResponse> => {
        const response = await apiClient.post<ApiResponse<SupplyResponse>>('/supplies', data);
        return response.data.data;
    },

    update: async (id: number, data: SupplyRequest): Promise<SupplyResponse> => {
        const response = await apiClient.put<ApiResponse<SupplyResponse>>(`/supplies/${id}`, data);
        return response.data.data;
    },

    deactivate: async (id: number): Promise<void> => {
        await apiClient.delete(`/supplies/${id}`);
    },

    registerMovement: async (id: number, data: SupplyMovementRequest): Promise<SupplyMovementResponse> => {
        const response = await apiClient.post<ApiResponse<SupplyMovementResponse>>(`/supplies/${id}/movements`, data);
        return response.data.data;
    },

    getMovements: async (id: number): Promise<SupplyMovementResponse[]> => {
        const response = await apiClient.get<ApiResponse<SupplyMovementResponse[]>>(`/supplies/${id}/movements`);
        return response.data.data;
    }
};