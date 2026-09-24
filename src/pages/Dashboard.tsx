// pages/Dashboard.tsx
import React, { useEffect, useState } from 'react';
import { useDashboardStore } from '../store/dashboardStore';

// Utilidades puras fuera del componente para no recrearlas en cada render
const formatARS = (value: number) => 
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);

const formatUSD = (value: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);

const Dashboard: React.FC = () => {
    const { data, isLoading, error, fetchDashboard, targetMargin } = useDashboardStore();
    
    // Estado local para el movimiento fluido del slider sin bloquear la UI
    const [sliderValue, setSliderValue] = useState(targetMargin);

    useEffect(() => {
        fetchDashboard(targetMargin);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Dispara la consulta a la API solo cuando el usuario suelta el slider
    const handleSliderRelease = () => {
        if (sliderValue !== targetMargin) {
            fetchDashboard(sliderValue);
        }
    };

    const handleManualRefresh = () => {
        fetchDashboard(sliderValue);
    };

    if (error) {
        return (
            <div className="max-w-7xl mx-auto p-4 md:p-8 flex justify-center items-center min-h-[50vh]">
                <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-3xl shadow-sm text-center max-w-md">
                    <span className="text-4xl block mb-3">⚠️</span>
                    <h3 className="font-black text-lg mb-2">Error de Conexión</h3>
                    <p className="text-sm font-medium mb-4">{error}</p>
                    <button 
                        onClick={handleManualRefresh}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-xl transition-colors shadow-md"
                    >
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 pb-24">
            
            {/* Cabecera Interactiva Premium */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-3xl p-6 md:p-8 mb-8 shadow-xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 relative overflow-hidden">
                {/* Elemento decorativo de fondo */}
                <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl pointer-events-none"></div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight">📊 Panel Financiero</h1>
                        <button 
                            onClick={handleManualRefresh}
                            disabled={isLoading}
                            className="p-2 bg-gray-800/50 hover:bg-gray-700 rounded-full transition-colors border border-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                            title="Actualizar datos"
                            aria-label="Actualizar datos"
                        >
                            <svg className={`w-5 h-5 text-gray-300 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        </button>
                    </div>
                    <p className="text-gray-400 font-medium">Métricas operativas y proyección de rentabilidad en tiempo real</p>
                </div>

                <div className="w-full lg:w-96 bg-gray-900/50 backdrop-blur-sm p-5 rounded-2xl border border-gray-700 relative z-10 shadow-inner">
                    <div className="flex justify-between items-center mb-3">
                        <label className="text-sm font-bold text-gray-300 uppercase tracking-wider">Margen Esperado</label>
                        <span className="text-2xl font-black text-emerald-400">{sliderValue}%</span>
                    </div>
                    <input 
                        type="range" 
                        min="10" 
                        max="150" 
                        step="1"
                        value={sliderValue}
                        onChange={(e) => setSliderValue(Number(e.target.value))}
                        onMouseUp={handleSliderRelease}
                        onTouchEnd={handleSliderRelease}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                    <p className="text-[10px] text-gray-400 mt-2 text-right">Deslice y suelte para recalcular</p>
                </div>
            </div>

            {/* Skeleton Loading Estructurado */}
            {isLoading && !data ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col h-[320px]">
                            <div className="h-6 w-3/4 bg-gray-200 rounded mb-6"></div>
                            <div className="flex-1 space-y-4">
                                <div className="h-4 w-full bg-gray-100 rounded"></div>
                                <div className="h-4 w-5/6 bg-gray-100 rounded"></div>
                            </div>
                            <div className="h-24 w-full bg-gray-100 rounded-2xl mt-6"></div>
                        </div>
                    ))}
                </div>
            ) : data ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Tarjeta 1: Capital Inmovilizado */}
                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                        <h2 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-2">
                            <span className="text-2xl">📦</span> Capital Inmovilizado
                        </h2>
                        
                        <div className="flex-1 space-y-4">
                            <div className="flex justify-between items-end border-b border-gray-50 pb-3">
                                <span className="text-sm font-bold text-gray-500">Valor Mercadería</span>
                                <span className="text-lg font-black text-gray-800">{formatARS(data.capital.productsValueArs)}</span>
                            </div>
                            <div className="flex justify-between items-end border-b border-gray-50 pb-3">
                                <span className="text-sm font-bold text-gray-500">Insumos (Embalaje)</span>
                                <span className="text-lg font-black text-gray-800">{formatARS(data.capital.suppliesValueArs)}</span>
                            </div>
                        </div>

                        <div className="mt-6 bg-gray-50 p-5 rounded-2xl border border-gray-100 group">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 group-hover:text-indigo-500 transition-colors">Total Consolidado</p>
                            <p className="text-3xl font-black text-indigo-700 tracking-tight">{formatARS(data.capital.totalCombinedArs)}</p>
                            <p className="text-sm font-bold text-indigo-400 mt-1">
                                {formatUSD(data.capital.totalCombinedUsd)} 
                                <span className="text-gray-400 text-xs ml-1 font-medium">(TC: ${data.capital.currentExchangeRate})</span>
                            </p>
                        </div>
                    </div>

                    {/* Tarjeta 2: Rentabilidad */}
                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                        <h2 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-2">
                            <span className="text-2xl">💰</span> Rentabilidad Proyectada
                        </h2>
                        
                        <div className="flex-1 space-y-4">
                            <div className="flex justify-between items-end border-b border-gray-50 pb-3">
                                <span className="text-sm font-bold text-gray-500">Costo Base Promedio</span>
                                <span className="text-lg font-black text-gray-800">{formatARS(data.profitability.averageProductCost)}</span>
                            </div>
                            <div className="flex justify-between items-end border-b border-gray-50 pb-3">
                                <span className="text-sm font-bold text-gray-500">Costo Empaque Prom.</span>
                                <span className="text-lg font-black text-gray-800">{formatARS(data.profitability.averagePackagingCost)}</span>
                            </div>
                        </div>

                        <div className="mt-6 bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100 group">
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest group-hover:text-emerald-700 transition-colors">Venta Proyectada</p>
                                <p className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md shadow-sm">+{sliderValue}%</p>
                            </div>
                            <p className="text-3xl font-black text-emerald-700 tracking-tight">{formatARS(data.profitability.potentialRevenue)}</p>
                            <div className="flex justify-between items-center mt-3 pt-3 border-t border-emerald-200/50">
                                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Ganancia Neta</span>
                                <span className="text-sm font-black text-emerald-600 bg-white px-2 py-1 rounded-lg shadow-sm border border-emerald-50">+{formatARS(data.profitability.potentialNetProfit)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Tarjeta 3: Predicciones */}
                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                        <h2 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-2">
                            <span className="text-2xl">📈</span> Predicción Operativa
                        </h2>
                        
                        <div className="flex-1 space-y-6">
                            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">Velocidad de Salida</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-black text-gray-800 tracking-tight">{data.predictions.salesLast30Days}</span>
                                    <span className="text-sm font-bold text-gray-400">un. / últimos 30 días</span>
                                </div>
                            </div>

                            <div className={`p-5 rounded-2xl border transition-colors ${data.predictions.criticalStockAlert ? 'bg-red-50 border-red-200' : 'bg-blue-50/50 border-blue-100'}`}>
                                <div className="flex items-center gap-2 mb-2">
                                    {data.predictions.criticalStockAlert && <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span></span>}
                                    <span className={`text-xs font-bold uppercase tracking-widest block ${data.predictions.criticalStockAlert ? 'text-red-600' : 'text-blue-600'}`}>
                                        Proyección de Quiebre
                                    </span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className={`text-4xl font-black tracking-tight ${data.predictions.criticalStockAlert ? 'text-red-700' : 'text-blue-700'}`}>
                                        {data.predictions.estimatedStockOutDays === 999 ? '+90' : data.predictions.estimatedStockOutDays}
                                    </span>
                                    <span className={`text-sm font-bold ${data.predictions.criticalStockAlert ? 'text-red-500' : 'text-blue-500'}`}>
                                        días restantes de stock
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            ) : null}
        </div>
    );
};

export default Dashboard;