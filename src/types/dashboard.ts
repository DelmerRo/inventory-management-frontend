// types/dashboard.ts
export interface ImmobilizedCapital {
    productsValueArs: number;
    suppliesValueArs: number;
    totalCombinedArs: number;
    totalCombinedUsd: number;
    currentExchangeRate: number;
}

export interface Profitability {
    averageProductCost: number;
    averagePackagingCost: number;
    potentialRevenue: number;
    potentialNetProfit: number;
}

export interface Prediction {
    salesLast30Days: number;
    estimatedStockOutDays: number;
    criticalStockAlert: boolean;
}

export interface DashboardResponse {
    capital: ImmobilizedCapital;
    profitability: Profitability;
    predictions: Prediction;
}