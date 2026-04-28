// api/categories.ts
import apiClient from './client';
import type { ApiResponse } from '../types/product';

export interface Subcategory {
    id: number;
    name: string;
    active: boolean;
    categoryId: number;
    categoryName: string;
    productCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface Category {
    id: number;
    name: string;
    active: boolean;
    subcategoryCount: number;
    subcategories: Subcategory[];
    createdAt: string;
    updatedAt: string;
}

export interface CategoryRequest {
    name: string;
    active?: boolean;
}

export interface SubcategoryRequest {
    name: string;
    categoryId: number;
    active?: boolean;
}

export const categoryApi = {
    // ========== CATEGORÍAS ==========
    
    // ✅ Único método - Siempre trae TODAS las categorías
    getAll: async (): Promise<Category[]> => {
        const response = await apiClient.get<ApiResponse<Category[]>>('/categories');
        return response.data.data;
    },

    getById: async (id: number): Promise<Category> => {
        const response = await apiClient.get<ApiResponse<Category>>(`/categories/${id}`);
        return response.data.data;
    },

    create: async (data: CategoryRequest): Promise<Category> => {
        const response = await apiClient.post<ApiResponse<Category>>('/categories', data);
        return response.data.data;
    },

    update: async (id: number, data: CategoryRequest): Promise<Category> => {
        const response = await apiClient.put<ApiResponse<Category>>(`/categories/${id}`, data);
        return response.data.data;
    },

    delete: async (id: number): Promise<void> => {
        await apiClient.delete(`/categories/${id}`);
    },

    toggleStatus: async (id: number): Promise<Category> => {
        const response = await apiClient.patch<ApiResponse<Category>>(`/categories/${id}/toggle-status`);
        return response.data.data;
    },

    // ========== SUBCATEGORÍAS ==========

    getAllSubcategories: async (): Promise<Subcategory[]> => {
        const response = await apiClient.get<ApiResponse<Subcategory[]>>('/subcategories');
        return response.data.data;
    },

    getSubcategoryById: async (id: number): Promise<Subcategory> => {
        const response = await apiClient.get<ApiResponse<Subcategory>>(`/subcategories/${id}`);
        return response.data.data;
    },

    getSubcategoriesByCategory: async (categoryId: number): Promise<Subcategory[]> => {
        const response = await apiClient.get<ApiResponse<Subcategory[]>>(`/categories/${categoryId}/subcategories`);
        return response.data.data;
    },

    createSubcategory: async (data: SubcategoryRequest): Promise<Subcategory> => {
        const response = await apiClient.post<ApiResponse<Subcategory>>('/subcategories', data);
        return response.data.data;
    },

    updateSubcategory: async (id: number, data: SubcategoryRequest): Promise<Subcategory> => {
        const response = await apiClient.put<ApiResponse<Subcategory>>(`/subcategories/${id}`, data);
        return response.data.data;
    },

    deleteSubcategory: async (id: number): Promise<void> => {
        await apiClient.delete(`/subcategories/${id}`);
    },

    toggleSubcategoryStatus: async (id: number): Promise<Subcategory> => {
        const response = await apiClient.patch<ApiResponse<Subcategory>>(`/subcategories/${id}/toggle-status`);
        return response.data.data;
    }
};