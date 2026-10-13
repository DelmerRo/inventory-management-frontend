// pages/Dashboard.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboardStore } from '../store/dashboardStore';
import { useProductStore } from '../store/productStore';

// Formateadores numéricos
const formatARS = (value: number) => 
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value || 0);

const formatUSD = (value: number) => 
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value || 0);

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { 
    data, 
    isLoading, 
    error, 
    fetchDashboard, 
    targetMargin,
    rates,
    isFetchingFx,
    fetchFxRates,
    selectedFxCasa,
    setSelectedFxCasa,
    customExchangeRate,
    setCustomExchangeRate,
    getActiveExchangeRate
  } = useDashboardStore();

  const { products, fetchProducts } = useProductStore();
  const [sliderValue, setSliderValue] = useState<number>(targetMargin || 35);
  const [isEditingFx, setIsEditingFx] = useState(false);

  useEffect(() => {
    fetchDashboard(targetMargin || 35);
    fetchFxRates();
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeFxRate = getActiveExchangeRate();

  const handleSliderRelease = () => {
    if (sliderValue !== targetMargin) {
      fetchDashboard(sliderValue);
    }
  };

  const handleManualRefresh = () => {
    fetchDashboard(sliderValue);
    fetchFxRates();
    fetchProducts();
  };

  // 📊 Métricas, salud de inventario y rankings calculados
  const analytics = useMemo(() => {
    if (!data) return null;

    const productCapital = data.capital.productsValueArs || 0;
    const suppliesCapital = data.capital.suppliesValueArs || 0;
    const totalCapitalArs = productCapital + suppliesCapital;
    const totalCapitalUsd = activeFxRate > 0 ? totalCapitalArs / activeFxRate : 0;

    // Participación de insumos sobre capital
    const packagingShare = totalCapitalArs > 0 ? (suppliesCapital / totalCapitalArs) * 100 : 0;

    // Peso del empaque sobre el costo directo
    const packagingCostRatio = data.profitability.averageProductCost > 0
      ? (data.profitability.averagePackagingCost / data.profitability.averageProductCost) * 100
      : 0;

    // SIMULADOR CORREGIDO: Basado en el capital total de mercadería
    const scenarios = [20, 35, sliderValue, 50, 75, 100];
    const uniqueScenarios = Array.from(new Set(scenarios)).sort((a, b) => a - b);

    const simulatedMargins = uniqueScenarios.map(margin => {
      const revenue = productCapital * (1 + margin / 100);
      const profit = productCapital * (margin / 100);
      const isCurrent = margin === sliderValue;

      let label = `${margin}%`;
      if (margin === 20) label = 'Conservador (20%)';
      else if (margin === 35) label = 'Estándar (35%)';
      else if (margin === 50) label = 'Optimista (50%)';
      else if (margin === 75) label = 'Premium (75%)';
      else if (margin === 100) label = 'Máximo (100%)';
      if (isCurrent) label = `Objetivo Actual (${margin}%)`;

      return {
        label,
        margin,
        revenue,
        profit,
        roi: margin,
        isCurrent
      };
    });

    // Productos activos e indicadores de estado
    const activeProducts = products.filter(p => p.active);
    const lowStockItems = activeProducts.filter(p => p.currentStock > 0 && p.currentStock < 10);
    const outOfStockItems = activeProducts.filter(p => p.currentStock === 0);
    const healthyStockCount = activeProducts.filter(p => p.currentStock >= 10).length;

    // 🏆 RANKING 1: Top 5 Mayor Stock (Unidades)
    const topStockProducts = [...activeProducts]
      .sort((a, b) => b.currentStock - a.currentStock)
      .slice(0, 5);

    // 🔥 RANKING 2: Top 5 Más Vendidos
    const topSellingProducts = [...activeProducts]
      .sort((a, b) => {
        const salesA = (a as any).unitsSold || (a as any).salesCount || (a as any).sales30Days || 0;
        const salesB = (b as any).unitsSold || (b as any).salesCount || (b as any).sales30Days || 0;
        return salesB - salesA;
      })
      .slice(0, 5);

    return {
      totalCapitalArs,
      totalCapitalUsd,
      packagingShare,
      packagingCostRatio,
      simulatedMargins,
      lowStockItems,
      outOfStockItems,
      healthyStockCount,
      topStockProducts,
      topSellingProducts,
      totalActiveProducts: activeProducts.length
    };
  }, [data, activeFxRate, sliderValue, products]);

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-4 md:p-8 flex justify-center items-center min-h-[50vh]">
        <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-3xl shadow-sm text-center max-w-md">
          <span className="text-4xl block mb-3">⚠️</span>
          <h3 className="font-black text-lg mb-2">Error de Conexión</h3>
          <p className="text-sm font-medium mb-4">{error}</p>
          <button 
            onClick={handleManualRefresh}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-xl transition-colors shadow-md text-xs"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 pb-24 space-y-8 font-sans">
      
      {/* 💵 BARRA TICKER DE DÓLAR EN TIEMPO REAL */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-md flex flex-wrap justify-between items-center gap-4 border border-slate-800">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
            Cotización Dólar ARS (En Vivo):
          </span>
          {isFetchingFx && <span className="text-[10px] text-emerald-400 animate-pulse">Actualizando...</span>}
        </div>

        {/* Botones de Dólares */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {rates.map(r => {
            const isSelected = selectedFxCasa.toLowerCase() === r.casa.toLowerCase() && !customExchangeRate;
            let displayLabel = r.nombre;
            if (r.casa.toLowerCase() === 'cripto') displayLabel = 'DolarApp / Cripto';

            return (
              <button
                key={r.casa}
                onClick={() => {
                  setSelectedFxCasa(r.casa);
                  setIsEditingFx(false);
                }}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all border ${
                  isSelected 
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/20' 
                    : 'bg-slate-800 text-gray-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {displayLabel}: <span className="font-mono">${r.venta}</span>
              </button>
            );
          })}

          {/* Ajuste Manual */}
          <div className="flex items-center gap-1">
            {isEditingFx ? (
              <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
                <input
                  type="number"
                  placeholder="Valor"
                  className="w-16 px-2 py-0.5 text-xs bg-slate-900 text-white border border-slate-700 rounded font-mono"
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val > 0) setCustomExchangeRate(val);
                  }}
                />
                <button
                  onClick={() => setIsEditingFx(false)}
                  className="bg-emerald-600 text-white text-[10px] px-2 py-1 rounded font-bold"
                >
                  Ok
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditingFx(true)}
                className={`px-2.5 py-1.5 rounded-xl font-bold border transition text-xs ${
                  customExchangeRate 
                    ? 'bg-indigo-600 text-white border-indigo-500' 
                    : 'bg-slate-800 text-gray-400 border-slate-700 hover:text-white'
                }`}
                title="Ingresar cotización personalizada"
              >
                {customExchangeRate ? `Manual: $${customExchangeRate}` : '✏️ Personalizado'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* CABECERA PRINCIPAL */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-emerald-500 opacity-10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-2">
              <span>📊</span> Panel Financiero & Control Operativo
            </h1>
            <button 
              onClick={handleManualRefresh}
              disabled={isLoading}
              className="p-2 bg-gray-800/80 hover:bg-gray-700 rounded-full transition-colors border border-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
              title="Actualizar todo"
            >
              <svg className={`w-4 h-4 text-emerald-400 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
          <p className="text-gray-400 text-xs md:text-sm font-medium max-w-2xl">
            Control integral de inventario, costo ponderado (CPP), cotización USD activa y proyecciones comerciales.
          </p>
        </div>

        {/* MARGEN OBJETIVO INTERACTIVO */}
        <div className="w-full lg:w-96 bg-gray-900/80 backdrop-blur-md p-5 rounded-2xl border border-gray-700/80 relative z-10 shadow-inner">
          <div className="flex justify-between items-center mb-3">
            <label className="text-xs font-extrabold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
              🎯 Margen Objetivo
            </label>
            <span className="text-2xl font-black text-emerald-400 tracking-tight">+{sliderValue}%</span>
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
          <div className="flex justify-between text-[10px] text-gray-400 font-medium mt-2">
            <span>10% (Mínimo)</span>
            <span>Deslice para recálculo</span>
            <span>150% (Máximo)</span>
          </div>
        </div>
      </div>

      {isLoading && !data ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm h-64"></div>
          ))}
        </div>
      ) : data && analytics ? (
        <>
          {/* SECCIÓN 1: KPIS PRINCIPALES */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Capital Inmovilizado */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-5">
                  <h2 className="text-sm font-black text-gray-800 flex items-center gap-2">
                    <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl text-base">📦</span> Capital Inmovilizado
                  </h2>
                  <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg border border-indigo-100">
                    TC: ${activeFxRate}
                  </span>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-end border-b border-gray-100 pb-2">
                    <span className="text-xs font-bold text-gray-500">Mercadería ERP</span>
                    <span className="text-sm font-black text-gray-900">{formatARS(data.capital.productsValueArs)}</span>
                  </div>
                  <div className="flex justify-between items-end border-b border-gray-100 pb-2">
                    <span className="text-xs font-bold text-gray-500">Insumos/Embalaje</span>
                    <span className="text-sm font-black text-gray-900">{formatARS(data.capital.suppliesValueArs)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100">
                <p className="text-[10px] font-extrabold text-indigo-500 uppercase tracking-wider mb-0.5">Total Consolidado</p>
                <p className="text-2xl font-black text-indigo-900">{formatARS(analytics.totalCapitalArs)}</p>
                <p className="text-xs font-bold text-indigo-600 mt-1">
                  {formatUSD(analytics.totalCapitalUsd)} <span className="text-gray-400 text-[10px] font-normal">(USD)</span>
                </p>
              </div>
            </div>

            {/* Rentabilidad Proyectada */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-5">
                  <h2 className="text-sm font-black text-gray-800 flex items-center gap-2">
                    <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl text-base">💰</span> Rentabilidad Proyectada
                  </h2>
                  <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                    +{sliderValue}% Margen
                  </span>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-end border-b border-gray-100 pb-2">
                    <span className="text-xs font-bold text-gray-500">Costo Base Prom. (CPP)</span>
                    <span className="text-sm font-black text-gray-900">{formatARS(data.profitability.averageProductCost)}</span>
                  </div>
                  <div className="flex justify-between items-end border-b border-gray-100 pb-2">
                    <span className="text-xs font-bold text-gray-500">Costo Empaque Prom.</span>
                    <span className="text-sm font-black text-gray-900">{formatARS(data.profitability.averagePackagingCost)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 bg-emerald-50/70 p-4 rounded-2xl border border-emerald-100">
                <p className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider mb-0.5">Facturación Potencial Total</p>
                <p className="text-2xl font-black text-emerald-800">{formatARS(data.profitability.potentialRevenue)}</p>
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-emerald-200/50">
                  <span className="text-xs font-bold text-emerald-900">Ganancia Neta:</span>
                  <span className="text-xs font-black text-emerald-700 bg-white px-2 py-0.5 rounded shadow-sm">
                    +{formatARS(data.profitability.potentialNetProfit)}
                  </span>
                </div>
              </div>
            </div>

            {/* Velocidad Operativa */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-5">
                  <h2 className="text-sm font-black text-gray-800 flex items-center gap-2">
                    <span className="p-2 bg-blue-50 text-blue-600 rounded-xl text-base">⚡</span> Autonomía de Stock
                  </h2>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    data.predictions.criticalStockAlert ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {data.predictions.criticalStockAlert ? '⚠️ Crítico' : '✓ Estable'}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Ventas (Últimos 30 días)</span>
                    <span className="text-2xl font-black text-gray-900">{data.predictions.salesLast30Days} <span className="text-xs text-gray-400 font-normal">unidades</span></span>
                  </div>

                  <div className={`p-3 rounded-xl border ${data.predictions.criticalStockAlert ? 'bg-red-50 border-red-200' : 'bg-blue-50/50 border-blue-100'}`}>
                    <span className={`text-[10px] font-bold uppercase tracking-wider block ${data.predictions.criticalStockAlert ? 'text-red-600' : 'text-blue-600'}`}>
                      Días de Stock Restante
                    </span>
                    <span className={`text-2xl font-black ${data.predictions.criticalStockAlert ? 'text-red-700' : 'text-blue-800'}`}>
                      {data.predictions.estimatedStockOutDays === 999 ? '+90' : data.predictions.estimatedStockOutDays} <span className="text-xs font-normal">días</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* SECCIÓN 2: MONITOR DE SALUD DE INVENTARIO Y REPOSICIÓN URGENTE */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Barra Visual de Salud de Stock */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm lg:col-span-1 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-black text-gray-800 mb-2 flex items-center gap-2">
                  <span>🟢</span> Estado de Catálogo ({analytics.totalActiveProducts} SKUs)
                </h3>
                <p className="text-xs text-gray-400 mb-4">Salud general de las existencias activas.</p>

                {/* Barra Segmentada */}
                <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden flex p-0.5 gap-0.5 mb-4">
                  <div 
                    style={{ width: `${(analytics.healthyStockCount / (analytics.totalActiveProducts || 1)) * 100}%` }}
                    className="bg-emerald-500 h-full rounded-l-full transition-all"
                    title="Stock Óptimo"
                  ></div>
                  <div 
                    style={{ width: `${(analytics.lowStockItems.length / (analytics.totalActiveProducts || 1)) * 100}%` }}
                    className="bg-yellow-400 h-full transition-all"
                    title="Stock Bajo"
                  ></div>
                  <div 
                    style={{ width: `${(analytics.outOfStockItems.length / (analytics.totalActiveProducts || 1)) * 100}%` }}
                    className="bg-red-500 h-full rounded-r-full transition-all"
                    title="Agotados"
                  ></div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center font-bold">
                    <span className="flex items-center gap-1.5 text-emerald-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Óptimo (&gt;10 un.)
                    </span>
                    <span>{analytics.healthyStockCount} SKUs</span>
                  </div>
                  <div className="flex justify-between items-center font-bold">
                    <span className="flex items-center gap-1.5 text-yellow-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block"></span> Stock Bajo (&lt;10 un.)
                    </span>
                    <span>{analytics.lowStockItems.length} SKUs</span>
                  </div>
                  <div className="flex justify-between items-center font-bold">
                    <span className="flex items-center gap-1.5 text-red-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span> Agotados (0 un.)
                    </span>
                    <span>{analytics.outOfStockItems.length} SKUs</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigate('/products')}
                className="w-full mt-5 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-xl border border-gray-200 transition"
              >
                Ver Catálogo Completo →
              </button>
            </div>

            {/* Productos Críticos a Reponer */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm lg:col-span-2 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-black text-gray-800 flex items-center gap-2">
                    <span>🚨</span> Requieren Reposición Urgente ({analytics.lowStockItems.length + analytics.outOfStockItems.length})
                  </h3>
                  <button 
                    onClick={() => navigate('/reconciliation')} 
                    className="text-xs text-blue-600 font-bold hover:underline"
                  >
                    Auditar Stock →
                  </button>
                </div>
                <p className="text-xs text-gray-400 mb-4">Productos sin stock o próximos a quiebre que impactan la facturación.</p>

                {analytics.lowStockItems.length === 0 && analytics.outOfStockItems.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-xs bg-gray-50 rounded-2xl border border-dashed">
                    🎉 ¡Excelente! No hay productos en nivel crítico de inventario.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {[...analytics.outOfStockItems, ...analytics.lowStockItems].slice(0, 5).map(prod => (
                      <div 
                        key={prod.id} 
                        className="flex items-center justify-between p-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-100 transition text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-white border flex items-center justify-center overflow-hidden flex-shrink-0">
                            {prod.imageUrl ? (
                              <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-contain p-0.5" />
                            ) : '📦'}
                          </div>
                          <div>
                            <p className="font-bold text-gray-800 line-clamp-1">{prod.name}</p>
                            <span className="font-mono text-[10px] text-gray-400">SKU: {prod.sku}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            prod.currentStock === 0 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {prod.currentStock === 0 ? 'Sin Stock' : `${prod.currentStock} un.`}
                          </span>

                          <button
                            onClick={() => navigate(`/products/${prod.id}`)}
                            className="bg-white hover:bg-indigo-50 text-indigo-600 border border-indigo-200 text-[10px] font-bold px-2.5 py-1 rounded-lg transition"
                          >
                            Ver
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* 🏆 SECCIÓN 3: RANKINGS DE PRODUCTOS (MAYOR STOCK & MÁS VENDIDOS) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* RANKING: TOP 5 MAYOR STOCK */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-black text-gray-800 flex items-center gap-2">
                    <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-sm">📦</span> 
                    Top 5 Mayor Stock (Unidades)
                  </h3>
                  <button 
                    onClick={() => navigate('/products')} 
                    className="text-xs font-bold text-indigo-600 hover:underline"
                  >
                    Ver Catálogo →
                  </button>
                </div>
                <p className="text-xs text-gray-400 mb-4">Productos con mayor volumen de existencias inmovilizadas.</p>

                {analytics.topStockProducts.length === 0 ? (
                  <div className="p-6 text-center text-xs text-gray-400 bg-gray-50 rounded-2xl border border-dashed">
                    No hay productos registrados en el catálogo.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {analytics.topStockProducts.map((prod, idx) => {
                      const capitalInProduct = prod.currentStock * (prod.costPrice || 0);
                      return (
                        <div key={prod.id} className="flex items-center justify-between p-2.5 bg-gray-50 hover:bg-gray-100 rounded-2xl border border-gray-100 transition text-xs">
                          <div className="flex items-center gap-3">
                            <span className="w-5 font-black text-gray-400 text-center">#{idx + 1}</span>
                            <div className="w-9 h-9 rounded-xl bg-white border flex items-center justify-center overflow-hidden flex-shrink-0">
                              {prod.imageUrl ? <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-contain p-0.5" /> : '📦'}
                            </div>
                            <div>
                              <p className="font-bold text-gray-800 line-clamp-1">{prod.name}</p>
                              <span className="font-mono text-[10px] text-gray-400">SKU: {prod.sku}</span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-lg text-xs block">
                              {prod.currentStock} un.
                            </span>
                            {capitalInProduct > 0 && (
                              <span className="text-[10px] text-gray-400 font-medium block mt-0.5">
                                Val: {formatARS(capitalInProduct)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* RANKING: TOP 5 MÁS VENDIDOS */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-black text-gray-800 flex items-center gap-2">
                    <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-sm">🔥</span> 
                    Top 5 Más Vendidos
                  </h3>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-100">
                    Rotación Comercial
                  </span>
                </div>
                <p className="text-xs text-gray-400 mb-4">Productos con mayor preferencia de salida en el mercado.</p>

                {analytics.topSellingProducts.length === 0 ? (
                  <div className="p-6 text-center text-xs text-gray-400 bg-gray-50 rounded-2xl border border-dashed">
                    No hay registros de ventas para clasificar.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {analytics.topSellingProducts.map((prod, idx) => {
                      const sales = (prod as any).unitsSold || (prod as any).salesCount || (prod as any).sales30Days || 0;
                      return (
                        <div key={prod.id} className="flex items-center justify-between p-2.5 bg-gray-50 hover:bg-gray-100 rounded-2xl border border-gray-100 transition text-xs">
                          <div className="flex items-center gap-3">
                            <span className="w-5 font-black text-emerald-500 text-center">#{idx + 1}</span>
                            <div className="w-9 h-9 rounded-xl bg-white border flex items-center justify-center overflow-hidden flex-shrink-0">
                              {prod.imageUrl ? <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-contain p-0.5" /> : '📦'}
                            </div>
                            <div>
                              <p className="font-bold text-gray-800 line-clamp-1">{prod.name}</p>
                              <span className="font-mono text-[10px] text-gray-400">SKU: {prod.sku}</span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg text-xs block">
                              {sales > 0 ? `${sales} vendidos` : `Stock: ${prod.currentStock}`}
                            </span>
                            <span className="text-[10px] text-gray-400 font-medium block mt-0.5">
                              Precio: {formatARS(prod.salePrice)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* SECCIÓN 4: SIMULADOR DE ESCENARIOS DE MARGEN & ESTRUCTURA DE COSTOS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Simulador de Sensibilidad Corregido */}
            <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-base font-black text-gray-800 flex items-center gap-2">
                    <span>🧮</span> Simulador de Sensibilidad de Margen
                  </h3>
                  <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-md">
                    Sobre Capital Mercadería
                  </span>
                </div>
                <p className="text-xs text-gray-400 font-medium mb-4">
                  Proyección de facturación total y rentabilidad estimada evaluando distintos márgenes comerciales sobre la totalidad del inventario.
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                        <th className="py-2.5">Escenario</th>
                        <th className="py-2.5 text-right">Facturación Potencial</th>
                        <th className="py-2.5 text-right">Ganancia Neta</th>
                        <th className="py-2.5 text-right">ROI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {analytics.simulatedMargins.map((item, idx) => (
                        <tr 
                          key={idx} 
                          className={`transition-colors ${
                            item.isCurrent 
                              ? 'bg-emerald-50/70 font-black text-emerald-950' 
                              : 'hover:bg-gray-50/80 text-gray-700'
                          }`}
                        >
                          <td className="py-3 font-bold flex items-center gap-2">
                            {item.isCurrent && (
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            )}
                            <span>{item.label}</span>
                          </td>
                          <td className="py-3 text-right font-black text-gray-900">
                            {formatARS(item.revenue)}
                          </td>
                          <td className="py-3 text-right font-black text-emerald-600">
                            +{formatARS(item.profit)}
                          </td>
                          <td className="py-3 text-right font-bold text-gray-500">
                            {item.roi.toFixed(0)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <p className="text-[10px] text-gray-400 font-medium text-right mt-4">
                Calculado sobre inventario de mercadería de {formatARS(data.capital.productsValueArs)}
              </p>
            </div>

            {/* Estructura de Costos y Embalaje */}
            <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-base font-black text-gray-800 mb-2 flex items-center gap-2">
                  <span>📊</span> Estructura y Composición de Costos
                </h3>
                <p className="text-xs text-gray-400 font-medium mb-6">
                  Incidencia financiera del embalaje e insumos sobre el costo directo de productos.
                </p>

                <div className="space-y-6">
                  {/* Métrica 1 */}
                  <div>
                    <div className="flex justify-between items-center text-xs font-bold text-gray-700 mb-2">
                      <span>Incidencia de Embalaje sobre Costo Directo</span>
                      <span className="text-indigo-600 font-black">{analytics.packagingCostRatio.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden p-0.5">
                      <div 
                        className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(analytics.packagingCostRatio, 100)}%` }}
                      ></div>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1 font-medium">
                      Impacto de cajas, cintas y etiquetas en relación al costo base unitario.
                    </p>
                  </div>

                  {/* Métrica 2 */}
                  <div>
                    <div className="flex justify-between items-center text-xs font-bold text-gray-700 mb-2">
                      <span>Distribución de Capital Inmovilizado</span>
                      <span className="text-blue-600 font-black">{analytics.packagingShare.toFixed(1)}% Insumos</span>
                    </div>
                    <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden flex p-0.5 gap-0.5">
                      <div 
                        className="bg-blue-500 h-full rounded-l-full transition-all duration-500" 
                        style={{ width: `${Math.min(analytics.packagingShare, 100)}%` }}
                        title="Insumos"
                      ></div>
                      <div 
                        className="bg-emerald-500 h-full rounded-r-full transition-all duration-500 flex-1" 
                        title="Mercadería"
                      ></div>
                    </div>
                    <div className="flex justify-between text-[11px] text-gray-500 mt-2 font-bold">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
                        Insumos: {formatARS(data.capital.suppliesValueArs)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                        Mercadería: {formatARS(data.capital.productsValueArs)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 mt-6">
                <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                  💡 <strong>Análisis Ejecutivo:</strong> Mantener la incidencia de empaque por debajo del 15% optimiza la rentabilidad neta de tu marca.
                </p>
              </div>
            </div>

          </div>
        </>
      ) : null}
    </div>
  );
};

export default Dashboard;