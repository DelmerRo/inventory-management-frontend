// store/supplierStore.ts
import { create } from 'zustand';
import { supplierApi } from '../api/suppliers';
import type { Supplier, SupplierSummary, SupplierRequest } from '../types/supplier';

interface SupplierStore {
    suppliers: Supplier[];
    suppliersSummary: SupplierSummary[];
    selectedSupplier: Supplier | null;
    isLoading: boolean;
    error: string | null;
    showInactive: boolean;
    
    fetchSuppliers: () => Promise<void>;
    fetchSuppliersSummary: () => Promise<void>;
    fetchSupplierById: (id: number) => Promise<void>;
    createSupplier: (data: SupplierRequest) => Promise<void>;
    updateSupplier: (id: number, data: SupplierRequest) => Promise<void>;
    deleteSupplier: (id: number) => Promise<void>;
    toggleSupplierStatus: (id: number) => Promise<void>;
    setShowInactive: (show: boolean) => void;
    clearError: () => void;
    clearSelected: () => void;
}

export const useSupplierStore = create<SupplierStore>((set, get) => ({
    suppliers: [],
    suppliersSummary: [],
    selectedSupplier: null,
    isLoading: false,
    error: null,
    showInactive: false,

    fetchSuppliers: async () => {
        set({ isLoading: true, error: null });
        try {
            const suppliers = await supplierApi.getAll();
            set({ suppliers, isLoading: false });
        } catch (error: any) {
            set({ error: error.message || 'Error al cargar proveedores', isLoading: false });
        }
    },

    fetchSuppliersSummary: async () => {
        set({ isLoading: true, error: null });
        try {
            const suppliersSummary = await supplierApi.getAllSummary();
            set({ suppliersSummary, isLoading: false });
        } catch (error: any) {
            set({ error: error.message || 'Error al cargar resumen de proveedores', isLoading: false });
        }
    },

    fetchSupplierById: async (id: number) => {
        set({ isLoading: true, error: null });
        try {
            const supplier = await supplierApi.getById(id);
            set({ selectedSupplier: supplier, isLoading: false });
        } catch (error: any) {
            set({ error: error.message || 'Error al cargar proveedor', isLoading: false });
        }
    },

    createSupplier: async (data: SupplierRequest) => {
        set({ isLoading: true, error: null });
        try {
            await supplierApi.create(data);
            await get().fetchSuppliers();
            await get().fetchSuppliersSummary();
            set({ isLoading: false });
        } catch (error: any) {
            set({ error: error.message || 'Error al crear proveedor', isLoading: false });
            throw error;
        }
    },

    updateSupplier: async (id: number, data: SupplierRequest) => {
        set({ isLoading: true, error: null });
        try {
            await supplierApi.update(id, data);
            await get().fetchSuppliers();
            await get().fetchSuppliersSummary();
            set({ isLoading: false });
        } catch (error: any) {
            set({ error: error.message || 'Error al actualizar proveedor', isLoading: false });
            throw error;
        }
    },

    deleteSupplier: async (id: number) => {
        set({ isLoading: true, error: null });
        try {
            await supplierApi.delete(id);
            await get().fetchSuppliers();
            await get().fetchSuppliersSummary();
            set({ isLoading: false });
        } catch (error: any) {
            set({ error: error.message || 'Error al eliminar proveedor', isLoading: false });
            throw error;
        }
    },

    toggleSupplierStatus: async (id: number) => {
        set({ isLoading: true, error: null });
        try {
            await supplierApi.toggleStatus(id);
            await get().fetchSuppliers();
            await get().fetchSuppliersSummary();
            set({ isLoading: false });
        } catch (error: any) {
            set({ error: error.message || 'Error al cambiar estado', isLoading: false });
            throw error;
        }
    },

    setShowInactive: (show: boolean) => {
        set({ showInactive: show });
        get().fetchSuppliers();
    },

    clearError: () => set({ error: null }),
    clearSelected: () => set({ selectedSupplier: null })
}));