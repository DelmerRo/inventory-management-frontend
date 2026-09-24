// types/supply.ts
import type { ApiResponse } from './product';

export interface SupplyResponse {
    id: number;
    name: string;
    description: string | null;
    unitMeasure: string;
    unitCost: number;
    currentStock: number;
    active: boolean;
    updatedAt: string;
}

export interface SupplyRequest {
    name: string;
    description?: string;
    unitMeasure: string;
    unitCost: number;
    initialStock?: number;
}

export type MovementType = 'ENTRADA' | 'SALIDA' | 'AJUSTE';

export interface SupplyMovementRequest {
    quantity: number;
    movementType: MovementType;
    reason?: string;
    unitCost?: number;
}

export interface SupplyMovementResponse {
    id: number;
    supplyId: number;
    supplyName: string;
    quantity: number;
    movementType: MovementType;
    reason: string | null;
    unitCost: number;
    totalValue: number;
    movementDate: string;
    registeredBy: string;
}

export type { ApiResponse };