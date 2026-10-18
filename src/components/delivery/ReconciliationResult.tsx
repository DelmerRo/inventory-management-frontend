import React, { useState } from 'react';
import type { OrderReconciliation, PurchaseOrderResponse } from '../../types/purchaseOrder';

interface ReconciliationResultProps {
    reconciliation: OrderReconciliation;
    selectedOrder: PurchaseOrderResponse | null;
    onClose: () => void;
}

export const ReconciliationResult: React.FC<ReconciliationResultProps> = ({
    reconciliation,
    selectedOrder,
    onClose,
}) => {
    const [viewMode, setViewMode] = useState<'audit' | 'vendor'>('audit');

    const totalOrdered = selectedOrder?.items.reduce((sum, i) => sum + i.quantity, 0) || reconciliation.summary.totalOrderedItems;
    const totalReceived = selectedOrder?.items.reduce((sum, i) => sum + (i.quantityReceived || 0), 0) || reconciliation.summary.totalReceivedItems;
    const totalPending = totalOrdered - totalReceived;
    const percentageReceived = totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0;

    const totalValue = selectedOrder?.totalAmount || reconciliation.summary.totalOrderValue;
    const receivedValue = selectedOrder?.items.reduce((sum, i) => sum + ((i.quantityReceived || 0) * i.unitPrice), 0) || reconciliation.summary.totalReceivedValue;
    const pendingValue = totalValue - receivedValue;
    const percentageValueReceived = totalValue > 0 ? Math.round((receivedValue / totalValue) * 100) : 0;
    const percentageValuePending = totalValue > 0 ? Math.round((pendingValue / totalValue) * 100) : 0;

    const realMatchedItems = selectedOrder?.items.filter(item => item.quantityReceived === item.quantity) || [];
    const realPartialItems = selectedOrder?.items.filter(item => item.quantityReceived > 0 && item.quantityReceived < item.quantity) || [];
    const realMissingItems = selectedOrder?.items.filter(item => item.quantityReceived === 0) || [];

    const isFullyReceived = realMatchedItems.length === (selectedOrder?.items.length || 0) && totalPending === 0;
    const hasDiscrepancies = reconciliation.summary.hasDiscrepancies;

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-8 relative">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 print:hidden">
                <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-2xl w-full sm:w-auto">
                    <button
                        onClick={() => setViewMode('audit')}
                        className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                            viewMode === 'audit' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        📊 Auditoría Interna
                    </button>
                    <button
                        onClick={() => setViewMode('vendor')}
                        className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                            viewMode === 'vendor' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        📄 Resumen para Proveedor
                    </button>
                </div>

                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-md w-full sm:w-auto justify-center"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    <span>Imprimir Documento</span>
                </button>
            </div>

            {/* VISTA 1: RESUMEN PROVEEDOR */}
            {(viewMode === 'vendor' || window.matchMedia('print').matches) && (
                <div className="bg-white rounded-3xl p-6 md:p-10 border border-gray-200 shadow-sm print:border-0 print:p-0">
                    <div className="text-center border-b border-gray-200 pb-6 mb-6">
                        <h1 className="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-wide">
                            Nota de Reclamo / Faltantes
                        </h1>
                        <p className="text-gray-500 font-bold mt-1">Comprobante de Recepción de Mercadería</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8 bg-gray-50 p-4 rounded-2xl border border-gray-100 text-sm">
                        <div>
                            <span className="text-gray-400 font-bold block text-[10px] uppercase">Proveedor:</span>
                            <strong className="text-gray-900 text-base">{selectedOrder?.supplierName}</strong>
                        </div>
                        <div>
                            <span className="text-gray-400 font-bold block text-[10px] uppercase">N° de Pedido:</span>
                            <strong className="font-mono text-gray-900 text-base">{selectedOrder?.orderNumber}</strong>
                        </div>
                    </div>

                    <h3 className="font-black text-gray-800 mb-3 text-sm uppercase tracking-wider">
                        📦 Detalle de Ítems Faltantes o con Diferencias
                    </h3>

                    {realPartialItems.length === 0 && realMissingItems.length === 0 ? (
                        <div className="bg-green-50 text-green-800 p-6 rounded-2xl text-center font-bold border border-green-200 mb-8">
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
                                    {[...realPartialItems, ...realMissingItems].map((item, i) => {
                                        const rec = item.quantityReceived || 0;
                                        const missing = item.quantity - rec;
                                        const subTotalMissing = missing * item.unitPrice;
                                        return (
                                            <tr key={i} className="hover:bg-gray-50">
                                                <td className="p-3 font-mono text-xs">{item.sku}</td>
                                                <td className="p-3 font-bold text-gray-900">{item.productName}</td>
                                                <td className="p-3 text-center">{item.quantity}</td>
                                                <td className="p-3 text-center text-green-600 font-bold">{rec}</td>
                                                <td className="p-3 text-center text-red-600 font-black">{missing}</td>
                                                <td className="p-3 text-right font-black text-red-600">
                                                    \${subTotalMissing.toLocaleString('es-AR')}
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

            {/* VISTA 2: AUDITORÍA INTERNA */}
            {viewMode === 'audit' && (
                <>
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-6">
                        <h2 className="text-lg font-black text-gray-800 mb-4 border-b border-gray-50 pb-2">📋 Resumen Ejecutivo</h2>
                        <div
                            className={`rounded-2xl p-5 mb-6 border ${
                                isFullyReceived
                                    ? 'bg-green-50 border-green-200'
                                    : totalPending > 0
                                    ? 'bg-yellow-50 border-yellow-200'
                                    : 'bg-red-50 border-red-200'
                            }`}
                        >
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div>
                                    <h3 className={`text-xl font-black mb-1 ${isFullyReceived ? 'text-green-800' : totalPending > 0 ? 'text-yellow-800' : 'text-red-800'}`}>
                                        {isFullyReceived ? '✅ ¡PEDIDO COMPLETADO AL 100%!' : totalPending > 0 ? '⚠️ RECEPCIÓN PARCIAL INCOMPLETA' : '❌ PEDIDO PENDIENTE DE RECIBIR'}
                                    </h3>
                                    <p className="text-gray-600 text-sm font-medium">
                                        {isFullyReceived
                                            ? 'Todas las unidades han sido ingresadas correctamente al sistema.'
                                            : totalPending > 0
                                            ? `Se detectaron faltantes. Aún restan ingresar ${totalPending} unidades.`
                                            : 'Aún no se ha registrado el ingreso físico de ninguna mercadería.'}
                                    </p>
                                </div>
                                <div className="text-left sm:text-right bg-white/60 p-3 rounded-xl backdrop-blur-sm border border-white/40">
                                    <div className={`text-3xl font-black ${isFullyReceived ? 'text-green-600' : 'text-blue-600'}`}>
                                        {percentageReceived}%
                                    </div>
                                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Nivel de Avance</div>
                                </div>
                            </div>
                        </div>

                        {hasDiscrepancies && (
                            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4 flex gap-3 items-start">
                                <span className="text-xl">⚠️</span>
                                <div>
                                    <h4 className="font-bold text-orange-800 text-sm">Discrepancias Detectadas</h4>
                                    <p className="text-sm text-orange-700">
                                        {reconciliation.summary.recommendation || "Revise los listados inferiores para ver el detalle de faltantes o extras."}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Módulos de Flujo de Unidades y Balance Financiero */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                            <h2 className="text-lg font-black text-gray-800 mb-5 flex justify-between">
                                <span>📦 Flujo de Unidades</span>
                                <span className="text-gray-400 text-sm font-medium">{totalOrdered} Total</span>
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">
                                        <span className="text-green-600">✅ Ingresadas ({totalReceived})</span>
                                        <span className="text-yellow-600">⏳ Faltantes ({totalPending})</span>
                                    </div>
                                    <div className="w-full bg-yellow-100 rounded-full h-3 overflow-hidden flex">
                                        <div className="bg-green-500 h-full transition-all" style={{ width: `${percentageReceived}%` }}></div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-50">
                                    <div className="bg-gray-50 p-3 rounded-xl text-center border border-gray-100">
                                        <div className="text-xl font-black text-gray-800">{totalOrdered}</div>
                                        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Pedidas</div>
                                    </div>
                                    <div className="bg-green-50 p-3 rounded-xl text-center border border-green-100">
                                        <div className="text-xl font-black text-green-700">{totalReceived}</div>
                                        <div className="text-[9px] font-bold text-green-600 uppercase tracking-widest mt-1">Recibidas</div>
                                    </div>
                                    <div className="bg-yellow-50 p-3 rounded-xl text-center border border-yellow-100">
                                        <div className="text-xl font-black text-yellow-700">{totalPending}</div>
                                        <div className="text-[9px] font-bold text-yellow-600 uppercase tracking-widest mt-1">Pendientes</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                            <h2 className="text-lg font-black text-gray-800 mb-5 flex justify-between">
                                <span>💰 Balance Financiero</span>
                                <span className="text-gray-400 text-sm font-medium">\${totalValue.toLocaleString('es-AR')} Total</span>
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">
                                        <span className="text-blue-600">Pagable (\${receivedValue.toLocaleString('es-AR')})</span>
                                        <span className="text-yellow-600">Retenido (\${pendingValue.toLocaleString('es-AR')})</span>
                                    </div>
                                    <div className="w-full bg-yellow-100 rounded-full h-3 overflow-hidden flex">
                                        <div className="bg-blue-500 h-full transition-all" style={{ width: `${percentageValueReceived}%` }}></div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 pt-4 border-t border-gray-50">
                                    <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 flex justify-between items-center">
                                        <div>
                                            <div className="text-[9px] font-bold text-blue-600 uppercase tracking-widest">Valor Recibido</div>
                                            <div className="text-lg font-black text-blue-800">\${receivedValue.toLocaleString('es-AR')}</div>
                                        </div>
                                        <div className="text-blue-400 font-black">{percentageValueReceived}%</div>
                                    </div>
                                    <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-100 flex justify-between items-center">
                                        <div>
                                            <div className="text-[9px] font-bold text-yellow-600 uppercase tracking-widest">Valor Pendiente</div>
                                            <div className="text-lg font-black text-yellow-800">\${pendingValue.toLocaleString('es-AR')}</div>
                                        </div>
                                        <div className="text-yellow-500 font-black">{percentageValuePending}%</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            <div className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-md border-t border-gray-200 p-4 md:p-6 z-40 shadow-lg print:hidden">
                <div className="max-w-5xl mx-auto flex justify-end">
                    <button onClick={onClose} className="px-8 py-3.5 bg-gray-900 text-white font-black rounded-xl hover:bg-gray-800 transition-all">
                        Finalizar y Volver a Pedidos
                    </button>
                </div>
            </div>
        </div>
    );
};