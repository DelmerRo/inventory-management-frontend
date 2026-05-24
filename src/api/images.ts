import apiClient from './client';
import type { ApiResponse } from '../types/product';

export interface ImageUploadResponse {
  id: number;
  url: string;
  publicId: string;
  message: string;
}

export interface ImageResponse {
  id: number;
  fileName: string;
  fileUrl: string;
  fileType: string;
  createdAt: string;
}

export const imageApi = {
  // Subir imagen a un producto
  upload: async (productId: number, file: File): Promise<ImageUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post<ApiResponse<ImageUploadResponse>>(
      `/products/${productId}/images`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.data;
  },

  // Obtener imágenes de un producto
  getByProduct: async (productId: number): Promise<ImageResponse[]> => {
    const response = await apiClient.get<ApiResponse<ImageResponse[]>>(`/products/${productId}/images`);
    return response.data.data;
  },
};