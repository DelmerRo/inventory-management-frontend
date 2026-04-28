// types/supplier.ts
export interface Supplier {
    id: number;
    name: string;
    contactPerson: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    notes: string | null;
    registeredAt: string;
    active: boolean;
    createdAt: string;
    updatedAt: string;
    productCount: number;
}

export interface SupplierSummary {
    id: number;
    name: string;
    contactPerson: string;
    email: string;
    phone: string;
    active: boolean;
    productCount: number;
}

export interface SupplierRequest {
    name: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
   地址?: string;
    notes?: string;
}

export interface ApiResponse<T> {
    error: boolean;
    code: number;
    status: string;
    message: string;
    data: T;
}