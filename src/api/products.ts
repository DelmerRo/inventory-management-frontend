// api/products.ts
import apiClient from './client';
import type {
    ProductSummary,
    ProductDetail,
    ProductRequest,
    ApiResponse,
    SupplierAssociation,
    QuickProductRequest
} from '../types/product';

export const productApi = {
    // ========== CRUD BÁSICO ==========

    getAll: async (): Promise<ProductSummary[]> => {
        const response = await apiClient.get<ApiResponse<ProductSummary[]>>('/products');
        return response.data.data;
    },

    getById: async (id: number): Promise<ProductDetail> => {
        const response = await apiClient.get<ApiResponse<ProductDetail>>(`/products/${id}`);
        return response.data.data;
    },

    getBySku: async (sku: string): Promise<ProductDetail> => {
        const response = await apiClient.get<ApiResponse<ProductDetail>>(`/products/sku/${sku}`);
        return response.data.data;
    },

    // 🔥 CORRECCIÓN SENIOR: Uso de Query Params (?supplierSku=) para evitar bloqueo de Tomcat con el carácter "/"
    // Además, el backend retorna una Lista (ProductSummary[]), no un ProductDetail único.
    getBySupplierSku: async (supplierSku: string): Promise<ProductSummary[]> => {
        const response = await apiClient.get<ApiResponse<ProductSummary[]>>(
            `/products/by-supplier-sku?supplierSku=${encodeURIComponent(supplierSku)}`
        );
        return response.data.data;
    },

    create: async (product: ProductRequest): Promise<ProductDetail> => {
        const response = await apiClient.post<ApiResponse<ProductDetail>>('/products', product);
        return response.data.data;
    },

    createQuick: async (product: QuickProductRequest): Promise<ProductDetail> => {
        const response = await apiClient.post<ApiResponse<ProductDetail>>('/products/quick', product);
        return response.data.data;
    },

    update: async (id: number, product: ProductRequest): Promise<ProductDetail> => {
        const response = await apiClient.put<ApiResponse<ProductDetail>>(`/products/${id}`, product);
        return response.data.data;
    },

    delete: async (id: number): Promise<void> => {
        await apiClient.delete(`/products/${id}`);
    },

    hardDelete: async (id: number): Promise<void> => {
        await apiClient.delete(`/products/${id}/hard`);
    },

    toggleStatus: async (id: number): Promise<ProductDetail> => {
        const response = await apiClient.patch<ApiResponse<ProductDetail>>(`/products/${id}/toggle-status`);
        return response.data.data;
    },

    // ========== GESTIÓN DE STOCK ==========

    addStock: async (productId: number, quantity: number, reason: string, user: string): Promise<ProductDetail> => {
        const response = await apiClient.post<ApiResponse<ProductDetail>>('/products/add-stock', {
            productId, quantity, reason, user
        });
        return response.data.data;
    },

    removeStock: async (productId: number, quantity: number, reason: string, user: string): Promise<ProductDetail> => {
        const response = await apiClient.post<ApiResponse<ProductDetail>>('/products/remove-stock', {
            productId, quantity, reason, user
        });
        return response.data.data;
    },

    // ========== GESTIÓN DE PROVEEDORES ==========

    getProductSuppliers: async (productId: number): Promise<SupplierAssociation[]> => {
        const response = await apiClient.get<ApiResponse<SupplierAssociation[]>>(`/products/${productId}/suppliers`);
        return response.data.data;
    },

    addSupplierToProduct: async (productId: number, supplierDTO: SupplierAssociationDTO): Promise<ProductDetail> => {
        const response = await apiClient.post<ApiResponse<ProductDetail>>(`/products/${productId}/suppliers`, supplierDTO);
        return response.data.data;
    },

    removeSupplierFromProduct: async (productId: number, supplierId: number): Promise<void> => {
        await apiClient.delete(`/products/${productId}/suppliers/${supplierId}`);
    },

    updateSupplierSku: async (productId: number, supplierId: number, supplierSku: string): Promise<ProductDetail> => {
        const response = await apiClient.patch<ApiResponse<ProductDetail>>(
            `/products/${productId}/suppliers/${supplierId}/sku?supplierSku=${encodeURIComponent(supplierSku)}`
        );
        return response.data.data;
    },

    // ========== CONSULTAS ==========

    search: async (params: {
        name?: string;
        sku?: string;
        minPrice?: number;
        maxPrice?: number;
        subcategoryId?: number;
        supplierId?: number;
    }): Promise<ProductSummary[]> => {
        const queryParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                queryParams.append(key, value.toString());
            }
        });
        const response = await apiClient.get<ApiResponse<ProductSummary[]>>(`/products/search?${queryParams.toString()}`);
        return response.data.data;
    },

    getBySupplier: async (supplierId: number): Promise<ProductSummary[]> => {
        const response = await apiClient.get<ApiResponse<ProductSummary[]>>(`/products/supplier/${supplierId}`);
        return response.data.data;
    },

    getLowStock: async (threshold: number = 10): Promise<ProductSummary[]> => {
        const response = await apiClient.get<ApiResponse<ProductSummary[]>>(`/products/low-stock?threshold=${threshold}`);
        return response.data.data;
    },

    // ========== ESTADÍSTICAS ==========

    getStatistics: async (): Promise<{
        totalProducts: number;
        totalStock: number;
        totalInventoryValue: number;
    }> => {
        const response = await apiClient.get<ApiResponse<{
            totalProducts: number;
            totalStock: number;
            totalInventoryValue: number;
        }>>('/products/statistics');
        return response.data.data;
    }
};

export interface SupplierAssociationDTO {
    supplierId: number;
    supplierSku?: string;
    isPrimary?: boolean;
    notes?: string;
}