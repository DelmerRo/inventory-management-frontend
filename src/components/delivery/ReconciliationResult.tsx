import React, { useState, useMemo } from 'react';
import type { OrderReconciliation, PurchaseOrderResponse, PurchaseOrderItemResponse } from '../../types/purchaseOrder';

interface ReconciliationResultProps {
    reconciliation: OrderReconciliation;
    selectedOrder: PurchaseOrderResponse | null;
    onClose: () => void;
}

type AuditFilterTab = 'ALL' | 'MATCHED' | 'MISSING' | 'SURPLUS' | 'EXTRA';

export const ReconciliationResult: React.FC<ReconciliationResultProps> = ({
    reconciliation,
    selectedOrder,
    onClose,
}) => {
    const [viewMode, setViewMode] = useState<'audit' | 'vendor'>('audit');
    const [auditTab, setAuditTab] = useState<AuditFilterTab>('ALL');

    // 📊 Cálculos globales de ítems y montos
    const items = useMemo(() => selectedOrder?.items || [], [selectedOrder]);

    const totalOrderedUnits = useMemo(() => {
        return items.reduce((sum, i) => sum + (i.quantity || 0), 0) || reconciliation.summary.totalOrderedItems;
    }, [items, reconciliation]);

    const totalReceivedUnits = useMemo(() => {
        return items.reduce((sum, i) => sum + (i.quantityReceived || 0), 0) || reconciliation.summary.totalReceivedItems;
    }, [items, reconciliation]);

    const totalValue = useMemo(() => {
        return selectedOrder?.totalAmount || reconciliation.summary.totalOrderValue || 0;
    }, [selectedOrder, reconciliation]);

    const receivedValue = useMemo(() => {
        return items.reduce((sum, i) => sum + ((i.quantityReceived || 0) * (i.unitPrice || 0)), 0) || reconciliation.summary.totalReceivedValue || 0;
    }, [items, reconciliation]);

    const pendingValue = Math.max(0, totalValue - receivedValue);
    const percentageReceived = totalOrderedUnits > 0 ? Math.round((totalReceivedUnits / totalOrderedUnits) * 100) : 0;
    const percentageValueReceived = totalValue > 0 ? Math.round((receivedValue / totalValue) * 100) : 0;

    // 🗂️ Clasificación detallada de ítems para Auditoría Interna
    // 1. Ítems Entregados Conforme (Recibido === Pedido)
    const matchedItems = useMemo(() => {
        return items.filter(i => i.quantity > 0 && i.quantityReceived === i.quantity);
    }, [items]);

    // 2. Ítems Parciales o Faltantes (Recibido < Pedido)
    const missingItems = useMemo(() => {
        return items.filter(i => i.quantity > 0 && (i.quantityReceived || 0) < i.quantity);
    }, [items]);

    // 3. Ítems Sobrantes / Excedentes de la Orden (Recibido > Pedido)
    const surplusItems = useMemo(() => {
        return items.filter(i => i.quantity > 0 && (i.quantityReceived || 0) > i.quantity);
    }, [items]);

    // 4. Ítems Extras Fuera de Orden (No figuraban en el pedido original: quantity === 0)
    const extraItems = useMemo(() => {
        return items.filter(i => (i.quantity || 0) === 0 && (i.quantityReceived || 0) > 0);
    }, [items]);

    const isFullyReceived = missingItems.length === 0 && surplusItems.length === 0 && extraItems.length === 0;
    const hasDiscrepancies = reconciliation.summary.hasDiscrepancies || missingItems.length > 0 || surplusItems.length > 0 || extraItems.length > 0;

    // Totales calculados por categoría
    const totalMissingUnits = missingItems.reduce((sum, i) => sum + (i.quantity - (i.quantityReceived || 0)), 0);
    const totalSurplusUnits = surplusItems.reduce((sum, i) => sum + ((i.quantityReceived || 0) - i.quantity), 0);
    const totalExtraUnits = extraItems.reduce((sum, i) => sum + (i.quantityReceived || 0), 0);

    const totalMissingValue = missingItems.reduce((sum, i) => sum + ((i.quantity - (i.quantityReceived || 0)) * i.unitPrice), 0);
    const totalSurplusValue = surplusItems.reduce((sum, i) => sum + (((i.quantityReceived || 0) - i.quantity) * i.unitPrice), 0);
    const totalExtraValue = extraItems.reduce((sum, i) => sum + ((i.quantityReceived || 0) * i.unitPrice), 0);

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-8 relative pb-32">
            {/* BARRA SUPERIOR DE CONMUTACIÓN DE VISTAS E IMPRESIÓN */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 print:hidden">
                <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-2xl w-full sm:w-auto">
                    <button
                        onClick={() => setViewMode('audit')}
                        className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl font-black text-xs md:text-sm transition-all cursor-pointer ${
                            viewMode === 'audit' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        📊 Auditoría Interna Completa
                    </button>
                    <button
                        onClick={() => setViewMode('vendor')}
                        className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl font-black text-xs md:text-sm transition-all cursor-pointer ${
                            viewMode === 'vendor' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        📄 Resumen de Reclamo Proveedor
                    </button>
                </div>

                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-5 py-2.5 rounded-xl font-black text-xs transition-all shadow-md w-full sm:w-auto justify-center cursor-pointer"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    <span>Imprimir Documento</span>
                </button>
            </div>

            {/* ========================================================================= */}
            {/* VISTA 1: RESUMEN PARA PROVEEDOR (RECLAMO / FALTANTES)                     */}
            {/* ========================================================================= */}
            {(viewMode === 'vendor' || window.matchMedia('print').matches) && (
                <div className="bg-white rounded-3xl p-6 md:p-10 border border-gray-200 shadow-sm print:border-0 print:p-0">
                    <div className="text-center border-b border-gray-200 pb-6 mb-6">
                        <h1 className="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-wide">
                            Nota de Reclamo / Faltantes
                        </h1>
                        <p className="text-gray-500 font-bold mt-1 text-sm">Comprobante de Recepción y Control de Mercadería</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8 bg-gray-50 p-4 rounded-2xl border border-gray-100 text-sm">
                        <div>
                            <span className="text-gray-400 font-bold block text-[10px] uppercase">Proveedor:</span>
                            <strong className="text-gray-900 text-base">{selectedOrder?.supplierName}</strong>
                        </div>
                        <div>
                            <span className="text-gray-400 font-bold block text-[10px] uppercase">N° de Orden de Compra:</span>
                            <strong className="font-mono text-gray-900 text-base">{selectedOrder?.orderNumber}</strong>
                        </div>
                    </div>

                    <h3 className="font-black text-gray-800 mb-3 text-sm uppercase tracking-wider">
                        📦 Detalle de Ítems Faltantes o con Diferencias
                    </h3>

                    {missingItems.length === 0 ? (
                        <div className="bg-emerald-50 text-emerald-800 p-6 rounded-2xl text-center font-bold border border-emerald-200 mb-8">
                            ✅ Este pedido no registra faltantes ni diferencias. Todo fue entregado conforme a lo solicitado.
                        </div>
                    ) : (
                        <div className="overflow-x-auto mb-8 border border-gray-200 rounded-2xl">
                            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                                <thead className="bg-gray-100 text-gray-700 uppercase font-black text-[10px]">
                                    <tr>
                                        <th className="p-3">SKU Proveedor</th>
                                        <th className="p-3">Producto</th>
                                        <th className="p-3 text-center">Pedidas</th>
                                        <th className="p-3 text-center">Recibidas</th>
                                        <th className="p-3 text-center text-red-600">Faltantes</th>
                                        <th className="p-3 text-right">Subtotal Faltante</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 font-medium">
                                    {missingItems.map((item, i) => {
                                        const rec = item.quantityReceived || 0;
                                        const missing = item.quantity - rec;
                                        const subTotalMissing = missing * item.unitPrice;
                                        return (
                                            <tr key={i} className="hover:bg-gray-50">
                                                <td className="p-3 font-mono text-xs uppercase font-bold">{item.sku}</td>
                                                <td className="p-3 font-bold text-gray-900">{item.productName}</td>
                                                <td className="p-3 text-center font-bold">{item.quantity}</td>
                                                <td className="p-3 text-center text-emerald-600 font-bold">{rec}</td>
                                                <td className="p-3 text-center text-red-600 font-black">-{missing}</td>
                                                <td className="p-3 text-right font-black text-red-600">
                                                    ${subTotalMissing.toLocaleString('es-AR')}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ========================================================================= */}
            {/* VISTA 2: AUDITORÍA INTERNA COMPLETA (INFORME DETALLADO)                  */}
            {/* ========================================================================= */}
            {viewMode === 'audit' && (
                <div className="space-y-6">
                    {/* RESUMEN EJECUTIVO Y ESTADO GLOBAL */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                        <h2 className="text-lg font-black text-gray-800 mb-4 border-b border-gray-100 pb-2 flex items-center justify-between">
                            <span>📋 Resumen Ejecutivo de Auditoría</span>
                            <span className="text-xs font-mono font-bold text-gray-400">Orden N°: {selectedOrder?.orderNumber}</span>
                        </h2>

                        <div
                            className={`rounded-2xl p-5 mb-6 border ${
                                isFullyReceived
                                    ? 'bg-emerald-50 border-emerald-200'
                                    : totalMissingUnits > 0
                                    ? 'bg-amber-50 border-amber-200'
                                    : 'bg-indigo-50 border-indigo-200'
                            }`}
                        >
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div>
                                    <h3 className={`text-xl font-black mb-1 ${
                                        isFullyReceived ? 'text-emerald-800' : totalMissingUnits > 0 ? 'text-amber-800' : 'text-indigo-900'
                                    }`}>
                                        {isFullyReceived
                                            ? '✅ ¡PEDIDO COMPLETADO Y CONFORME AL 100%!'
                                            : totalMissingUnits > 0
                                            ? '⚠️ RECEPCIÓN CON FALTANTES PENDIENTES'
                                            : '📦 RECEPCIÓN REGISTRADA CON NOVEDADES'}
                                    </h3>
                                    <p className="text-gray-600 text-sm font-medium">
                                        {isFullyReceived
                                            ? 'Todas las unidades solicitadas han ingresado exactamente según lo pedido.'
                                            : totalMissingUnits > 0
                                            ? `Faltan ingresar ${totalMissingUnits} unidades de las líneas originales del pedido.`
                                            : 'Se registraron excedentes o productos extras fuera de la orden de compra.'}
                                    </p>
                                </div>
                                <div className="text-left sm:text-right bg-white/70 p-3 rounded-xl backdrop-blur-sm border border-white/50 shadow-2xs">
                                    <div className={`text-3xl font-black ${isFullyReceived ? 'text-emerald-600' : 'text-indigo-600'}`}>
                                        {percentageReceived}%
                                    </div>
                                    <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Nivel de Avance</div>
                                </div>
                            </div>
                        </div>

                        {hasDiscrepancies && (
                            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex gap-3 items-start text-xs font-bold text-orange-900">
                                <span className="text-xl leading-none">⚠️</span>
                                <div>
                                    <h4 className="font-black text-orange-800 text-sm mb-0.5">Discrepancias en Control Físico:</h4>
                                    <p className="text-orange-700 font-medium">
                                        {reconciliation.summary.recommendation || "Verifique los listados inferiores para auditar sobrantes, faltantes o productos extras."}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* MÓDULOS DE KPI: FLUJO DE UNIDADES Y BALANCE FINANCIERO */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* FLUJO DE UNIDADES */}
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                            <h2 className="text-base font-black text-gray-800 mb-4 flex justify-between items-center">
                                <span>📦 Flujo de Unidades Físicas</span>
                                <span className="text-gray-400 text-xs font-bold">{totalOrderedUnits} Solicitadas</span>
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-[11px] font-black uppercase tracking-wider mb-1.5">
                                        <span className="text-emerald-600">Recibidas ({totalReceivedUnits})</span>
                                        <span className="text-amber-600">Faltantes ({totalMissingUnits})</span>
                                    </div>
                                    <div className="w-full bg-amber-100 rounded-full h-3 overflow-hidden flex">
                                        <div className="bg-emerald-500 h-full transition-all" style={{ width: `${Math.min(100, percentageReceived)}%` }}></div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-4 gap-2 pt-3 border-t border-gray-100">
                                    <div className="bg-emerald-50 p-2.5 rounded-xl text-center border border-emerald-100">
                                        <div className="text-base font-black text-emerald-800">{matchedItems.length}</div>
                                        <div className="text-[9px] font-black text-emerald-600 uppercase">Conformes</div>
                                    </div>
                                    <div className="bg-amber-50 p-2.5 rounded-xl text-center border border-amber-100">
                                        <div className="text-base font-black text-amber-800">{totalMissingUnits}</div>
                                        <div className="text-[9px] font-black text-amber-600 uppercase">Faltantes</div>
                                    </div>
                                    <div className="bg-orange-50 p-2.5 rounded-xl text-center border border-orange-100">
                                        <div className="text-base font-black text-orange-800">+{totalSurplusUnits}</div>
                                        <div className="text-[9px] font-black text-orange-600 uppercase">Sobrantes</div>
                                    </div>
                                    <div className="bg-indigo-50 p-2.5 rounded-xl text-center border border-indigo-100">
                                        <div className="text-base font-black text-indigo-800">+{totalExtraUnits}</div>
                                        <div className="text-[9px] font-black text-indigo-600 uppercase">Extras</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* BALANCE FINANCIERO */}
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                            <h2 className="text-base font-black text-gray-800 mb-4 flex justify-between items-center">
                                <span>💰 Balance Financiero</span>
                                <span className="text-gray-400 text-xs font-bold">${totalValue.toLocaleString('es-AR')} Pedido</span>
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-[11px] font-black uppercase tracking-wider mb-1.5">
                                        <span className="text-blue-600">Ingresado (${receivedValue.toLocaleString('es-AR')})</span>
                                        <span className="text-amber-600">Retenido (${pendingValue.toLocaleString('es-AR')})</span>
                                    </div>
                                    <div className="w-full bg-amber-100 rounded-full h-3 overflow-hidden flex">
                                        <div className="bg-blue-500 h-full transition-all" style={{ width: `${Math.min(100, percentageValueReceived)}%` }}></div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-100">
                                    <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 flex justify-between items-center">
                                        <div>
                                            <div className="text-[9px] font-black text-blue-600 uppercase">Aprobado / Pagable</div>
                                            <div className="text-sm font-black text-blue-900">${receivedValue.toLocaleString('es-AR')}</div>
                                        </div>
                                        <div className="text-blue-500 font-black text-xs">{percentageValueReceived}%</div>
                                    </div>
                                    <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 flex justify-between items-center">
                                        <div>
                                            <div className="text-[9px] font-black text-amber-600 uppercase">Pendiente / Retenido</div>
                                            <div className="text-sm font-black text-amber-900">${pendingValue.toLocaleString('es-AR')}</div>
                                        </div>
                                        <div className="text-amber-500 font-black text-xs">{100 - percentageValueReceived}%</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* DETALLE COMPLETO DE AUDITORÍA POR CATEGORÍAS */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 border-b border-gray-100 pb-4">
                            <div>
                                <h2 className="text-lg font-black text-gray-900">📦 Detalle de Auditoría de Inventario</h2>
                                <p className="text-xs text-gray-500 font-medium">Revisión exhaustiva por estado de entrega de cada SKU.</p>
                            </div>

                            {/* PESTAÑAS DE FILTRO RÁPIDO */}
                            <div className="flex flex-wrap items-center gap-1 bg-gray-100 p-1 rounded-2xl text-xs font-bold">
                                <button
                                    onClick={() => setAuditTab('ALL')}
                                    className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                                        auditTab === 'ALL' ? 'bg-white text-gray-900 shadow-xs font-black' : 'text-gray-500'
                                    }`}
                                >
                                    Todos ({items.length})
                                </button>
                                <button
                                    onClick={() => setAuditTab('MATCHED')}
                                    className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                                        auditTab === 'MATCHED' ? 'bg-white text-emerald-700 shadow-xs font-black' : 'text-gray-500'
                                    }`}
                                >
                                    🟢 Conformes ({matchedItems.length})
                                </button>
                                <button
                                    onClick={() => setAuditTab('MISSING')}
                                    className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                                        auditTab === 'MISSING' ? 'bg-white text-amber-700 shadow-xs font-black' : 'text-gray-500'
                                    }`}
                                >
                                    ⚠️ Faltantes ({missingItems.length})
                                </button>
                                {surplusItems.length > 0 && (
                                    <button
                                        onClick={() => setAuditTab('SURPLUS')}
                                        className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                                            auditTab === 'SURPLUS' ? 'bg-white text-orange-700 shadow-xs font-black' : 'text-gray-500'
                                        }`}
                                    >
                                        🟠 Sobrantes ({surplusItems.length})
                                    </button>
                                )}
                                {extraItems.length > 0 && (
                                    <button
                                        onClick={() => setAuditTab('EXTRA')}
                                        className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                                            auditTab === 'EXTRA' ? 'bg-white text-indigo-700 shadow-xs font-black' : 'text-gray-500'
                                        }`}
                                    >
                                        🟣 Extras ({extraItems.length})
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* SECCIÓN 1: ÍTEMS CONFORMES */}
                        {(auditTab === 'ALL' || auditTab === 'MATCHED') && matchedItems.length > 0 && (
                            <div className="mb-8">
                                <h3 className="text-xs font-black text-emerald-800 uppercase tracking-wider mb-3 flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-xl w-fit border border-emerald-100">
                                    <span>✅</span> Ítems Recibidos Conforme ({matchedItems.length})
                                </h3>
                                <div className="overflow-x-auto border border-gray-100 rounded-2xl">
                                    <table className="min-w-full divide-y divide-gray-100 text-left text-xs">
                                        <thead className="bg-gray-50 text-gray-500 uppercase font-black">
                                            <tr>
                                                <th className="p-3">SKU Proveedor</th>
                                                <th className="p-3">Producto</th>
                                                <th className="p-3 text-center">Pedidas</th>
                                                <th className="p-3 text-center">Recibidas</th>
                                                <th className="p-3 text-right">Precio Un.</th>
                                                <th className="p-3 text-right">Total ($)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                                            {matchedItems.map((item, idx) => (
                                                <tr key={`matched-${idx}`} className="hover:bg-emerald-50/30">
                                                    <td className="p-3 font-mono font-bold uppercase">{item.sku}</td>
                                                    <td className="p-3 font-bold">{item.productName}</td>
                                                    <td className="p-3 text-center font-bold">{item.quantity}</td>
                                                    <td className="p-3 text-center text-emerald-700 font-black">{item.quantityReceived}</td>
                                                    <td className="p-3 text-right">${item.unitPrice.toLocaleString('es-AR')}</td>
                                                    <td className="p-3 text-right font-bold text-emerald-800">
                                                        ${(item.quantity * item.unitPrice).toLocaleString('es-AR')}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* SECCIÓN 2: ÍTEMS PARCIALES / FALTANTES */}
                        {(auditTab === 'ALL' || auditTab === 'MISSING') && missingItems.length > 0 && (
                            <div className="mb-8">
                                <div className="flex justify-between items-center mb-3 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100">
                                    <h3 className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-2">
                                        <span>⚠️</span> Ítems Parciales o Faltantes ({missingItems.length})
                                    </h3>
                                    <span className="text-xs font-black text-amber-700">Faltante Total: ${totalMissingValue.toLocaleString('es-AR')}</span>
                                </div>
                                <div className="overflow-x-auto border border-amber-100 rounded-2xl">
                                    <table className="min-w-full divide-y divide-amber-100 text-left text-xs">
                                        <thead className="bg-amber-50/60 text-amber-900 uppercase font-black">
                                            <tr>
                                                <th className="p-3">SKU Proveedor</th>
                                                <th className="p-3">Producto</th>
                                                <th className="p-3 text-center">Pedidas</th>
                                                <th className="p-3 text-center">Recibidas</th>
                                                <th className="p-3 text-center text-red-600">Faltante</th>
                                                <th className="p-3 text-right">Monto Retenido</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-amber-100 font-medium text-gray-800">
                                            {missingItems.map((item, idx) => {
                                                const rec = item.quantityReceived || 0;
                                                const missing = item.quantity - rec;
                                                return (
                                                    <tr key={`missing-${idx}`} className="hover:bg-amber-50/40">
                                                        <td className="p-3 font-mono font-bold uppercase">{item.sku}</td>
                                                        <td className="p-3 font-bold">{item.productName}</td>
                                                        <td className="p-3 text-center">{item.quantity}</td>
                                                        <td className="p-3 text-center text-emerald-700 font-bold">{rec}</td>
                                                        <td className="p-3 text-center text-red-600 font-black">-{missing}</td>
                                                        <td className="p-3 text-right font-black text-red-600">
                                                            ${(missing * item.unitPrice).toLocaleString('es-AR')}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* SECCIÓN 3: ÍTEMS SOBRANTES (EXCEDENTES DE LA ORDEN) */}
                        {(auditTab === 'ALL' || auditTab === 'SURPLUS') && surplusItems.length > 0 && (
                            <div className="mb-8">
                                <div className="flex justify-between items-center mb-3 bg-orange-50 px-3 py-1.5 rounded-xl border border-orange-200">
                                    <h3 className="text-xs font-black text-orange-900 uppercase tracking-wider flex items-center gap-2">
                                        <span>🟠</span> Ítems Sobrantes de la Orden ({surplusItems.length})
                                    </h3>
                                    <span className="text-xs font-black text-orange-700">Excedente: +${totalSurplusValue.toLocaleString('es-AR')}</span>
                                </div>
                                <div className="overflow-x-auto border border-orange-100 rounded-2xl">
                                    <table className="min-w-full divide-y divide-orange-100 text-left text-xs">
                                        <thead className="bg-orange-50/60 text-orange-900 uppercase font-black">
                                            <tr>
                                                <th className="p-3">SKU Proveedor</th>
                                                <th className="p-3">Producto</th>
                                                <th className="p-3 text-center">Pedidas</th>
                                                <th className="p-3 text-center">Recibidas</th>
                                                <th className="p-3 text-center text-orange-600">Excedente</th>
                                                <th className="p-3 text-right">Valor Excedente</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-orange-100 font-medium text-gray-800">
                                            {surplusItems.map((item, idx) => {
                                                const rec = item.quantityReceived || 0;
                                                const surplus = rec - item.quantity;
                                                return (
                                                    <tr key={`surplus-${idx}`} className="hover:bg-orange-50/40">
                                                        <td className="p-3 font-mono font-bold uppercase">{item.sku}</td>
                                                        <td className="p-3 font-bold">{item.productName}</td>
                                                        <td className="p-3 text-center">{item.quantity}</td>
                                                        <td className="p-3 text-center text-emerald-700 font-bold">{rec}</td>
                                                        <td className="p-3 text-center text-orange-600 font-black">+{surplus}</td>
                                                        <td className="p-3 text-right font-black text-orange-600">
                                                            ${(surplus * item.unitPrice).toLocaleString('es-AR')}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* SECCIÓN 4: ÍTEMS EXTRAS FUERA DE ORDEN */}
                        {(auditTab === 'ALL' || auditTab === 'EXTRA') && extraItems.length > 0 && (
                            <div className="mb-8">
                                <div className="flex justify-between items-center mb-3 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-200">
                                    <h3 className="text-xs font-black text-indigo-900 uppercase tracking-wider flex items-center gap-2">
                                        <span>🟣</span> Productos Extras Fuera de Orden ({extraItems.length})
                                    </h3>
                                    <span className="text-xs font-black text-indigo-700">Monto Extra: ${totalExtraValue.toLocaleString('es-AR')}</span>
                                </div>
                                <div className="overflow-x-auto border border-indigo-100 rounded-2xl">
                                    <table className="min-w-full divide-y divide-indigo-100 text-left text-xs">
                                        <thead className="bg-indigo-50/60 text-indigo-900 uppercase font-black">
                                            <tr>
                                                <th className="p-3">SKU Proveedor</th>
                                                <th className="p-3">Producto Extra</th>
                                                <th className="p-3 text-center">Unidades Recibidas</th>
                                                <th className="p-3 text-right">Precio Un.</th>
                                                <th className="p-3 text-right">Subtotal Extra</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-indigo-100 font-medium text-gray-800">
                                            {extraItems.map((item, idx) => (
                                                <tr key={`extra-${idx}`} className="hover:bg-indigo-50/40">
                                                    <td className="p-3 font-mono font-bold uppercase">{item.sku}</td>
                                                    <td className="p-3 font-bold text-indigo-950">{item.productName || 'Producto Extra sin Nombre'}</td>
                                                    <td className="p-3 text-center font-black text-indigo-700">+{item.quantityReceived}</td>
                                                    <td className="p-3 text-right">${item.unitPrice.toLocaleString('es-AR')}</td>
                                                    <td className="p-3 text-right font-black text-indigo-700">
                                                        ${((item.quantityReceived || 0) * item.unitPrice).toLocaleString('es-AR')}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* BARRA INFERIOR FIJA DE NAVEGACIÓN */}
            <div className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-md border-t border-gray-200 p-4 md:p-5 z-40 shadow-2xl print:hidden">
                <div className="max-w-5xl mx-auto flex justify-between items-center">
                    <div className="text-xs font-bold text-gray-500 hidden sm:block">
                        Total Unidades Auditadas: <strong className="text-gray-900">{totalReceivedUnits} un.</strong>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full sm:w-auto px-8 py-3.5 bg-gray-900 text-white font-black text-xs rounded-xl hover:bg-gray-800 transition-all shadow-md active:scale-98 cursor-pointer"
                    >
                        Finalizar y Volver a Pedidos ➔
                    </button>
                </div>
            </div>
        </div>
    );
};