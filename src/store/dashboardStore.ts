// store/dashboardStore.ts
import { create } from 'zustand';
import { dashboardApi } from '../api/dashboard';
import type { DashboardResponse } from '../types/dashboard';

export interface ExchangeRateInfo {
    casa: string;
    nombre: string;
    compra: number;
    venta: number;
    fechaActualizacion?: string;
}

interface DashboardState {
    // Estado original
    data: DashboardResponse | null;
    isLoading: boolean;
    error: string | null;
    targetMargin: number;

    // Estado para Cotización Dólar Live
    rates: ExchangeRateInfo[];
    selectedFxCasa: string; // 'cripto' (DolarApp) | 'oficial' | 'blue' | 'bolsa'
    customExchangeRate: number | null;
    isFetchingFx: boolean;
    fxError: string | null;

    // Acciones originales
    fetchDashboard: (margin: number) => Promise<void>;

    // Nuevas acciones para el manejo del Dólar Live
    fetchFxRates: () => Promise<void>;
    setSelectedFxCasa: (casa: string) => void;
    setCustomExchangeRate: (rate: number | null) => void;
    getActiveExchangeRate: () => number;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
    // Estado inicial original
    data: null,
    isLoading: false,
    error: null,
    targetMargin: 35.0, // Margen por defecto

    // Estado inicial del Dólar Live
    rates: [],
    selectedFxCasa: 'cripto', // DolarApp / Dólar Cripto por defecto
    customExchangeRate: null,
    isFetchingFx: false,
    fxError: null,

    // Cargar métricas del Dashboard (Tu implementación original)
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
    },

    // 💵 Consulta de cotizaciones del dólar en tiempo real
    fetchFxRates: async () => {
        set({ isFetchingFx: true, fxError: null });
        try {
            const response = await fetch('https://dolarapi.com/v1/dolares');
            if (!response.ok) {
                throw new Error('Error al conectar con el servicio de cotizaciones');
            }
            const ratesData: ExchangeRateInfo[] = await response.json();
            set({ rates: ratesData, isFetchingFx: false });
        } catch (error: any) {
            console.warn('Error fetchFxRates:', error);
            set({ fxError: 'No se pudo obtener el dólar en vivo', isFetchingFx: false });
        }
    },

    // Cambiar el tipo de dólar seleccionado (Cripto/DolarApp, Oficial, Blue, MEP)
    setSelectedFxCasa: (casa: string) => set({ selectedFxCasa: casa, customExchangeRate: null }),

    // Fijar un valor de dólar manual personalizado
    setCustomExchangeRate: (rate: number | null) => set({ customExchangeRate: rate }),

    // Obtener el valor activo del dólar para realizar conversiones a USD
    getActiveExchangeRate: () => {
        const { customExchangeRate, rates, selectedFxCasa, data } = get();

        // 1. Prioridad: Cotización personalizada manual ingresada por el usuario
        if (customExchangeRate && customExchangeRate > 0) {
            return customExchangeRate;
        }

        // 2. Cotización en vivo según la casa seleccionada (ej. 'cripto' para DolarApp)
        const matchedRate = rates.find(
            (r) => r.casa.toLowerCase() === selectedFxCasa.toLowerCase()
        );
        if (matchedRate && matchedRate.venta > 0) {
            return matchedRate.venta;
        }

        // 3. Fallback a la tasa devuelta por el backend en data.capital
        return data?.capital?.currentExchangeRate || 1050;
    }
}));