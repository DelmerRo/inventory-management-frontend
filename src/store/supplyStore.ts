// store/supplyStore.ts
import { create } from 'zustand';
import { supplyApi } from '../api/supplies';
import type { 
    SupplyResponse, 
    SupplyRequest, 
    SupplyMovementRequest, 
    SupplyMovementResponse 
} from '../types/supply';
import { useToastStore } from './toastStore';

interface SupplyState {
    supplies: SupplyResponse[];
    selectedSupplyMovements: SupplyMovementResponse[];
    isLoading: boolean;
    isMovementsLoading: boolean;
    error: string | null;

    fetchSupplies: () => Promise<void>;
    createSupply: (data: SupplyRequest) => Promise<boolean>;
    updateSupply: (id: number, data: SupplyRequest) => Promise<boolean>;
    deactivateSupply: (id: number) => Promise<boolean>;
    registerMovement: (supplyId: number, data: SupplyMovementRequest) => Promise<boolean>;
    fetchMovements: (supplyId: number) => Promise<void>;
    clearError: () => void;
}

export const useSupplyStore = create<SupplyState>((set, get) => ({
    supplies: [],
    selectedSupplyMovements: [],
    isLoading: false,
    isMovementsLoading: false,
    error: null,

    fetchSupplies: async () => {
        set({ isLoading: true, error: null });
        try {
            const supplies = await supplyApi.getAll();
            set({ supplies: supplies || [], isLoading: false });
        } catch (error: any) {
            const errorMsg = error.response?.data?.message || 'Error al cargar los insumos';
            set({ error: errorMsg, isLoading: false, supplies: [] });
            useToastStore.getState().showToast(errorMsg, 'error');
        }
    },

    createSupply: async (data: SupplyRequest) => {
        set({ isLoading: true, error: null });
        try {
            await supplyApi.create(data);
            await get().fetchSupplies();
            set({ isLoading: false });
            useToastStore.getState().showToast('Insumo creado exitosamente', 'success');
            return true;
        } catch (error: any) {
            const errorMsg = error.response?.data?.message || 'Error al crear el insumo';
            set({ error: errorMsg, isLoading: false });
            useToastStore.getState().showToast(errorMsg, 'error');
            return false;
        }
    },

    updateSupply: async (id: number, data: SupplyRequest) => {
        set({ isLoading: true, error: null });
        try {
            await supplyApi.update(id, data);
            await get().fetchSupplies();
            set({ isLoading: false });
            useToastStore.getState().showToast('Insumo actualizado exitosamente', 'success');
            return true;
        } catch (error: any) {
            const errorMsg = error.response?.data?.message || 'Error al actualizar el insumo';
            set({ error: errorMsg, isLoading: false });
            useToastStore.getState().showToast(errorMsg, 'error');
            return false;
        }
    },

    deactivateSupply: async (id: number) => {
        set({ isLoading: true, error: null });
        try {
            await supplyApi.deactivate(id);
            await get().fetchSupplies();
            set({ isLoading: false });
            useToastStore.getState().showToast('Insumo desactivado correctamente', 'success');
            return true;
        } catch (error: any) {
            const errorMsg = error.response?.data?.message || 'Error al desactivar el insumo';
            set({ error: errorMsg, isLoading: false });
            useToastStore.getState().showToast(errorMsg, 'error');
            return false;
        }
    },

    registerMovement: async (supplyId: number, data: SupplyMovementRequest) => {
        set({ isLoading: true, error: null });
        try {
            await supplyApi.registerMovement(supplyId, data);
            await get().fetchSupplies();
            await get().fetchMovements(supplyId);
            set({ isLoading: false });
            useToastStore.getState().showToast('Movimiento registrado exitosamente', 'success');
            return true;
        } catch (error: any) {
            const errorMsg = error.response?.data?.message || 'Error al registrar el movimiento';
            set({ error: errorMsg, isLoading: false });
            useToastStore.getState().showToast(errorMsg, 'error');
            return false;
        }
    },

    fetchMovements: async (supplyId: number) => {
        set({ isMovementsLoading: true });
        try {
            const movements = await supplyApi.getMovements(supplyId);
            set({ selectedSupplyMovements: movements || [], isMovementsLoading: false });
        } catch (error: any) {
            const errorMsg = error.response?.data?.message || 'Error al cargar el historial';
            set({ isMovementsLoading: false, selectedSupplyMovements: [] });
            useToastStore.getState().showToast(errorMsg, 'error');
        }
    },

    clearError: () => set({ error: null })
}));