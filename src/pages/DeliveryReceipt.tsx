// pages/DeliveryReceipt.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { usePurchaseOrderStore } from '../store/purchaseOrderStore';
import type {
    ReceivedItem,
    PendingReceivedItem,
    OrderReconciliation,
    DeliveryReceiptRequest,
    PurchaseOrderResponse
} from '../types/purchaseOrder';

const DeliveryReceipt: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    
    const { selectedOrder, fetchOrderById, processDelivery, reconciliation, isLoading } = usePurchaseOrderStore();

    const isContinue = new URLSearchParams(location.search).get('continue') === 'true';
    const isReportMode = new URLSearchParams(location.search).get('action') === 'report';

    const [formData, setFormData] = useState({
        deliveryDate: new Date().toISOString().slice(0, 16),
        notes: ''
    });

    const [pendingItems, setPendingItems] = useState<PendingReceivedItem[]>([]);
    const [showReconciliation, setShowReconciliation] = useState(false);
    const [lastReconciliation, setLastReconciliation] = useState<OrderReconciliation | null>(null);
    const [autoReconciled, setAutoReconciled] = useState(false);
    const [itemSearchQuery, setItemSearchQuery] = useState('');

    useEffect(() => {
        window.scrollTo(0, 0);
        if (id) fetchOrderById(parseInt(id));
    }, [id, fetchOrderById]);

    useEffect(() => {
        if (selectedOrder && !autoReconciled) {
            if (selectedOrder.status === 'COMPLETADO' || selectedOrder.status === 'CANCELADO' || isReportMode) {
                const { reconcileOrder } = usePurchaseOrderStore.getState();
                reconcileOrder(selectedOrder.id).then(() => {
                    setShowReconciliation(true);
                    setAutoReconciled(true);
                });
            }
        }
    }, [selectedOrder, autoReconciled, isReportMode]);

    useEffect(() => {
        if (selectedOrder && selectedOrder.items.length > 0) {
            const pending = selectedOrder.items
                .filter(item => (item.quantityReceived || 0) < item.quantity)
                .map(item => ({
                    supplierSku: item.sku,
                    productName: item.productName || '',
                    additionalQuantity: 0,
                    unitPrice: item.unitPrice,
                    orderedQuantity: item.quantity,
                    alreadyReceived: item.quantityReceived || 0,
                    pendingQuantity: item.quantity - (item.quantityReceived || 0)
                }));
            setPendingItems(pending);
        }
    }, [selectedOrder]);

    const updateAdditionalQuantity = (supplierSku: string, quantity: number) => {
        setPendingItems(prev => prev.map(item =>
            item.supplierSku === supplierSku
                ? { ...item, additionalQuantity: Math.min(Math.max(0, quantity), item.pendingQuantity) }
                : item
        ));
    };

    const updateUnitPrice = (supplierSku: string, price: number) => {
        setPendingItems(prev => prev.map(item =>
            item.supplierSku === supplierSku ? { ...item, unitPrice: price } : item
        ));
    };

    const addExtraItem = () => {
        setPendingItems(prev => [...prev, {
            supplierSku: '',
            productName: '',
            additionalQuantity: 1,
            unitPrice: 0,
            orderedQuantity: 0,
            alreadyReceived: 0,
            pendingQuantity: 999999
        }]);
    };

    const removeExtraItem = (index: number) => {
        setPendingItems(prev => prev.filter((_, i) => i !== index));
    };

    const updateExtraItemSku = (index: number, value: string) => {
        setPendingItems(prev => prev.map((item, i) =>
            i === index ? { ...item, supplierSku: value.toUpperCase().trim() } : item
        ));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const itemsToSend = pendingItems.filter(item => item.additionalQuantity > 0);

        if (itemsToSend.length === 0) {
            alert('No hay productos para recibir en esta entrega');
            return;
        }

        const invalidItems = itemsToSend.filter(item => !item.supplierSku || item.supplierSku.trim() === '');
        if (invalidItems.length > 0) {
            alert('Todos los productos deben tener un SKU de proveedor válido');
            return;
        }

        const itemsWithoutPrice = itemsToSend.filter(item => (!item.unitPrice || item.unitPrice <= 0));
        if (itemsWithoutPrice.length > 0) {
            alert('Los productos a recibir deben tener un precio unitario válido');
            return;
        }

        const cleanedItems: ReceivedItem[] = itemsToSend.map(item => ({
            supplierSku: item.supplierSku.trim().toUpperCase(),
            productName: item.productName || undefined,
            additionalQuantity: item.additionalQuantity,
            unitPrice: item.unitPrice || undefined
        }));

        const receipt: DeliveryReceiptRequest = {
            purchaseOrderId: parseInt(id!),
            deliveryDate: formData.deliveryDate,
            receivedItems: cleanedItems
        };

        if (formData.notes && formData.notes.trim() !== '') {
            receipt.notes = formData.notes;
        }

        const reconciliationResult = await processDelivery(receipt);
        if (reconciliationResult) {
            setLastReconciliation(reconciliationResult);
            await fetchOrderById(parseInt(id!));
            setShowReconciliation(true);
            window.scrollTo(0, 0);
        }
    };

    const handleReconcile = async () => {
        if (id) {
            const { reconcileOrder } = usePurchaseOrderStore.getState();
            await reconcileOrder(parseInt(id));
            setShowReconciliation(true);
            window.scrollTo(0, 0);
        }
    };

    const filteredPendingItems = useMemo(() => {
        const query = itemSearchQuery.toLowerCase().trim();
        if (!query) return pendingItems;
        return pendingItems.filter(i => 
            i.supplierSku.toLowerCase().includes(query) || 
            i.productName.toLowerCase().includes(query)
        );
    }, [pendingItems, itemSearchQuery]);

    const getTitle = () => isContinue ? "📦 Continuar Recepción de Mercadería" : "📦 Recibir Mercadería";
    const getSubtitle = () => isContinue
        ? "Complete la cantidad faltante para cada producto."
        : "Complete el remito con los productos recibidos.";

    if (isLoading && !selectedOrder) {
        return <div className="text-center py-12 animate-pulse text-gray-500 font-bold">Cargando pedido...</div>;
    }

    if (!selectedOrder) {
        return <div className="text-center py-12 text-gray-500 font-bold">Pedido no encontrado</div>;
    }

    if (showReconciliation && (lastReconciliation || reconciliation)) {
        return (
            <ReconciliationResult
                reconciliation={lastReconciliation || reconciliation!}
                selectedOrder={selectedOrder}
                onClose={() => navigate('/purchase-orders')}
            />
        );
    }

    const totalOrdered = selectedOrder.items.reduce((sum, i) => sum + i.quantity, 0);
    const totalReceived = selectedOrder.items.reduce((sum, i) => sum + (i.quantityReceived || 0), 0);
    const totalPending = totalOrdered - totalReceived;
    const completionPercentage = totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0;
    const totalValue = selectedOrder.totalAmount;
    const receivedValue = selectedOrder.items.reduce((sum, i) => sum + ((i.quantityReceived || 0) * i.unitPrice), 0);
    const pendingValue = totalValue - receivedValue;

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-8 pb-40 md:pb-32 relative">
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-2">{getTitle()}</h1>
            <p className="text-gray-500 mb-6 font-medium">{getSubtitle()}</p>

            <div className="bg-gray-900 text-white p-5 rounded-3xl mb-6 flex flex-col sm:flex-row justify-between sm:items-center shadow-lg gap-4">
                <div className="grid grid-cols-2 gap-4 flex-1">
                    <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">N° Pedido</p>
                        <p className="font-mono text-sm md:text-base font-bold">{selectedOrder.orderNumber}</p>
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Proveedor</p>
                        <p className="font-bold text-sm md:text-base line-clamp-1" title={selectedOrder.supplierName}>{selectedOrder.supplierName}</p>
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Fecha Emisión</p>
                        <p className="font-bold text-sm md:text-base">{new Date(selectedOrder.orderDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Total Pedido</p>
                        <p className="font-black text-emerald-400 text-sm md:text-base">${totalValue.toLocaleString('es-AR')}</p>
                    </div>
                </div>
                <div className="text-right border-t sm:border-t-0 sm:border-l border-gray-700 pt-4 sm:pt-0 sm:pl-6">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Progreso</p>
                    <p className="text-3xl font-black text-emerald-400">{completionPercentage}%</p>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm p-6 mb-6 border border-gray-100">
                <h3 className="text-lg font-black text-gray-800 mb-4">📊 Estado Actual del Pedido</h3>

                <div className="mb-6">
                    <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full transition-all duration-500" style={{ width: `${completionPercentage}%` }}></div>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                        <div className="text-2xl font-black text-gray-800">{totalOrdered}</div>
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Pedidas</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 border border-green-100 rounded-2xl">
                        <div className="text-2xl font-black text-green-700">{totalReceived}</div>
                        <div className="text-[10px] font-bold text-green-600 uppercase tracking-widest mt-1">Recibidas</div>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 border border-yellow-100 rounded-2xl">
                        <div className="text-2xl font-black text-yellow-700">{totalPending}</div>
                        <div className="text-[10px] font-bold text-yellow-600 uppercase tracking-widest mt-1">Pendientes</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                        <div className="text-2xl font-black text-blue-700">${receivedValue.toLocaleString('es-AR')}</div>
                        <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-1">Valor Recibido</div>
                    </div>
                </div>
            </div>

            <form id="receipt-form" onSubmit={handleSubmit} className="space-y-6">
                
                <div className="bg-white rounded-3xl shadow-sm p-6 border border-gray-100">
                    <h2 className="text-lg font-black text-gray-800 mb-5 flex items-center gap-2">
                        <span className="text-2xl">🚚</span> Datos de la Recepción
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-gray-700 text-xs font-bold mb-2 uppercase tracking-wide">
                                Fecha de Entrega <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="datetime-local"
                                value={formData.deliveryDate}
                                onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium outline-none transition-all"
                                required
                            />
                        </div>
                        
                        <div className="md:col-span-2">
                            <label className="block text-gray-700 text-xs font-bold mb-2 uppercase tracking-wide">
                                📝 Observaciones de esta Entrega
                            </label>
                            
                            {selectedOrder?.notes && (
                                <div className="mb-3 p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono text-gray-600 max-h-40 overflow-y-auto whitespace-pre-wrap">
                                    <span className="font-bold text-gray-800 block mb-2 border-b border-gray-200 pb-1 font-sans">📜 Historial de Notas del Pedido:</span>
                                    {selectedOrder.notes}
                                </div>
                            )}
                            
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder={isContinue ? "Ej: Segunda entrega, completando faltantes" : "Ej: Faltó un producto, llegó en mal estado, etc."}
                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                                rows={3}
                            />
                            <p className="text-xs text-gray-400 mt-1">
                                {isContinue ? '💡 Las notas se agregarán al historial del pedido.' : '💡 Las notas se guardarán en el pedido.'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-3xl shadow-sm p-6 border border-gray-100">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-5 gap-3">
                        <h2 className="text-lg font-black text-gray-800">
                            {isContinue ? '📦 Pendientes por Recibir' : '📦 Productos a Recibir'}
                        </h2>
                        <button type="button" onClick={addExtraItem} className="text-xs font-bold bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl hover:bg-indigo-100 border border-indigo-100 transition-colors">
                            ➕ Producto Extra
                        </button>
                    </div>

                    {pendingItems.length > 0 && (
                        <div className="mb-4">
                            <input
                                type="text"
                                placeholder="🔍 Filtrar productos pendientes por SKU o Nombre..."
                                value={itemSearchQuery}
                                onChange={(e) => setItemSearchQuery(e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    )}

                    {filteredPendingItems.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-2xl border border-gray-100 font-bold">
                            {pendingItems.length === 0 ? '✅ ¡No hay productos pendientes! Este pedido ya está completado.' : '🔍 No se encontraron productos con ese filtro.'}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {filteredPendingItems.map((item, index) => {
                                const isOriginal = item.orderedQuantity > 0;
                                const maxToReceive = item.pendingQuantity;
                                const isFilled = item.additionalQuantity > 0;
                                const willBeComplete = item.additionalQuantity === item.pendingQuantity;

                                return (
                                    <div key={index} className={`p-4 md:p-5 rounded-2xl border transition-all relative overflow-hidden group flex flex-col md:flex-row md:items-center gap-4 ${isFilled ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 hover:border-indigo-200 shadow-sm'}`}>
                                        
                                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isFilled ? 'bg-green-400' : isOriginal ? 'bg-gray-200' : 'bg-indigo-400'}`}></div>

                                        <div className="flex-1 pl-2">
                                            <div className="flex justify-between items-start mb-2">
                                                {isOriginal ? (
                                                    <span className="text-[10px] bg-white border border-gray-200 text-gray-600 font-black uppercase px-2 py-1 rounded shadow-sm font-mono">{item.supplierSku}</span>
                                                ) : (
                                                    <input type="text" value={item.supplierSku} onChange={(e) => updateExtraItemSku(index, e.target.value)} placeholder="NUEVO SKU" className="w-32 px-2 py-1 border border-indigo-200 bg-indigo-50 rounded font-mono text-xs uppercase focus:ring-2 focus:ring-indigo-500 outline-none" required />
                                                )}
                                                {!isOriginal && (
                                                    <button type="button" onClick={() => removeExtraItem(index)} className="md:hidden text-red-400 hover:text-red-600 p-1 bg-red-50 rounded-lg">
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                )}
                                            </div>
                                            
                                            <h4 className="font-bold text-gray-900 leading-tight mb-1">{item.productName || 'Producto Extra (No estaba en pedido)'}</h4>
                                            
                                            {isOriginal && (
                                                <div className="flex gap-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                                    <span>Pedido: {item.orderedQuantity}</span>
                                                    <span>|</span>
                                                    <span className="text-green-600">Recibido: {item.alreadyReceived}</span>
                                                    <span>|</span>
                                                    <span className="text-yellow-600">Falta: {maxToReceive}</span>
                                                </div>
                                            )}
                                            {isFilled && isOriginal && (
                                                <div className={`text-xs mt-2 font-bold ${willBeComplete ? 'text-green-600' : 'text-blue-600'}`}>
                                                    {willBeComplete ? '✅ Se completará la línea' : `📦 Recibiendo ${item.additionalQuantity} parcialmente`}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex gap-3 items-end w-full md:w-auto mt-2 md:mt-0 pt-3 md:pt-0 border-t border-gray-100 md:border-0">
                                            <div className="w-1/2 md:w-28">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Costo Un.</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                                                    <input
                                                        type="number"
                                                        value={item.unitPrice || ''}
                                                        onChange={(e) => updateUnitPrice(item.supplierSku, parseFloat(e.target.value) || 0)}
                                                        className="w-full pl-6 pr-2 py-2.5 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none text-right bg-white"
                                                        step="0.01" min="0" required
                                                    />
                                                </div>
                                            </div>

                                            <div className="w-1/2 md:w-32">
                                                <div className="flex justify-between items-center mb-1">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Cant. Recibida</label>
                                                    {isOriginal && maxToReceive > 0 && (
                                                        <button type="button" onClick={() => updateAdditionalQuantity(item.supplierSku, maxToReceive)} className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-1.5 rounded hover:bg-indigo-100 transition-colors">TODO</button>
                                                    )}
                                                </div>
                                                <input
                                                    type="number"
                                                    value={item.additionalQuantity}
                                                    onChange={(e) => updateAdditionalQuantity(item.supplierSku, parseInt(e.target.value) || 0)}
                                                    className={`w-full px-3 py-2.5 border rounded-xl text-center text-lg font-black outline-none transition-all focus:ring-2 focus:ring-indigo-500 ${isFilled ? 'bg-green-100 border-green-300 text-green-800' : 'bg-white border-gray-200'}`}
                                                    min="0" max={maxToReceive} placeholder="0"
                                                />
                                            </div>

                                            {!isOriginal && (
                                                <button type="button" onClick={() => removeExtraItem(index)} className="hidden md:flex p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </form>

            <div className="h-32 md:h-24 w-full print:hidden" aria-hidden="true"></div>

            <div className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-md border-t border-gray-200 p-4 md:p-6 z-40 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] print:hidden">
                <div className="max-w-5xl mx-auto flex flex-col sm:flex-row gap-3 justify-end">
                    <button type="button" onClick={() => navigate('/purchase-orders')} className="hidden sm:block px-6 py-3.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors border border-gray-200">
                        Cancelar
                    </button>
                    <button type="button" onClick={handleReconcile} className="flex-1 sm:flex-none px-6 py-3.5 bg-blue-50 text-blue-700 font-bold rounded-xl hover:bg-blue-100 transition-colors border border-blue-200">
                        📊 Estado Actual
                    </button>
                    <button form="receipt-form" type="submit" disabled={isLoading || pendingItems.filter(i => i.additionalQuantity > 0).length === 0} className="flex-1 sm:flex-none px-8 py-3.5 bg-green-600 text-white font-black rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:bg-gray-300 transition-all shadow-lg shadow-green-200">
                        {isLoading ? 'Procesando...' : 'Confirmar Recepción'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// COMPONENTE DE REPORTE (RECONCILIATION RESULT) - Producción Ready
// ============================================================================
const ReconciliationResult: React.FC<{
    reconciliation: OrderReconciliation;
    selectedOrder: PurchaseOrderResponse | null;
    onClose: () => void
}> = ({ reconciliation, selectedOrder, onClose }) => {

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

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-8 relative">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 print:hidden">
                <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-2xl w-full sm:w-auto">
                    <button 
                        onClick={() => setViewMode('audit')} 
                        className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${viewMode === 'audit' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        📊 Auditoría Interna
                    </button>
                    <button 
                        onClick={() => setViewMode('vendor')} 
                        className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${viewMode === 'vendor' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        📄 Resumen para Proveedor
                    </button>
                </div>

                <button onClick={handlePrint} className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-md w-full sm:w-auto justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                    <span>Imprimir Documento</span>
                </button>
            </div>

            {/* VISTA 1: RESUMEN PARA PROVEEDOR */}
            {(viewMode === 'vendor' || window.matchMedia('print').matches) && (
                <div className="bg-white rounded-3xl p-6 md:p-10 border border-gray-200 shadow-sm print:border-0 print:p-0">
                    <div className="text-center border-b border-gray-200 pb-6 mb-6">
                        <h1 className="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-wide">Nota de Reclamo / Faltantes</h1>
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
                        <div>
                            <span className="text-gray-400 font-bold block text-[10px] uppercase">Fecha de Emisión:</span>
                            <span className="text-gray-700">{selectedOrder?.orderDate ? new Date(selectedOrder.orderDate).toLocaleDateString() : '-'}</span>
                        </div>
                        <div>
                            <span className="text-gray-400 font-bold block text-[10px] uppercase">Estado Actual:</span>
                            <span className="font-bold text-indigo-600">{selectedOrder?.status}</span>
                        </div>
                    </div>

                    <h3 className="font-black text-gray-800 mb-3 text-sm uppercase tracking-wider">📦 Detalle de Ítems Faltantes o con Diferencias</h3>
                    
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
                                                <td className="p-3 text-right font-black text-red-600">${subTotalMissing.toLocaleString('es-AR')}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="bg-gray-50 border border-gray-200 p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4 mb-12">
                        <div>
                            <p className="text-xs text-gray-500 font-bold uppercase">Valor total no entregado:</p>
                            <p className="text-2xl font-black text-red-600">${pendingValue.toLocaleString('es-AR')}</p>
                        </div>
                        <div className="text-right text-xs text-gray-400">
                            <p>_____________________________________</p>
                            <p className="font-bold text-gray-600 mt-1">Firma / Aclaración Proveedor</p>
                        </div>
                    </div>
                </div>
            )}

            {/* VISTA 2: AUDITORÍA INTERNA COMPLETA */}
            {viewMode === 'audit' && (
                <>
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-6">
                        <h2 className="text-lg font-black text-gray-800 mb-4 border-b border-gray-50 pb-2">📋 Resumen Ejecutivo</h2>

                        <div className={`rounded-2xl p-5 mb-6 border ${isFullyReceived ? 'bg-green-50 border-green-200' : totalPending > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'}`}>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div>
                                    <h3 className={`text-xl font-black mb-1 ${isFullyReceived ? 'text-green-800' : totalPending > 0 ? 'text-yellow-800' : 'text-red-800'}`}>
                                        {isFullyReceived ? '✅ ¡PEDIDO COMPLETADO AL 100%!' : totalPending > 0 ? '⚠️ RECEPCIÓN PARCIAL INCOMPLETA' : '❌ PEDIDO PENDIENTE DE RECIBIR'}
                                    </h3>
                                    <p className="text-gray-600 text-sm font-medium">
                                        {isFullyReceived ? 'Todas las unidades y productos han sido ingresados correctamente al sistema.' :
                                            totalPending > 0 ? `Se detectaron faltantes. Aún restan ingresar ${totalPending} unidades para finalizar el pedido.` :
                                                'Aún no se ha registrado el ingreso físico de ninguna mercadería de este pedido.'}
                                    </p>
                                </div>
                                <div className="text-left sm:text-right bg-white/60 p-3 rounded-xl backdrop-blur-sm border border-white/40">
                                    <div className={`text-3xl font-black ${isFullyReceived ? 'text-green-600' : 'text-blue-600'}`}>{percentageReceived}%</div>
                                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Nivel de Avance</div>
                                </div>
                            </div>
                        </div>

                        {hasDiscrepancies && (
                            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4 flex gap-3 items-start">
                                <span className="text-xl">⚠️</span>
                                <div>
                                    <h4 className="font-bold text-orange-800 text-sm">Discrepancias Detectadas</h4>
                                    <p className="text-sm text-orange-700">{reconciliation.summary.recommendation || "Revise los listados inferiores para ver el detalle de faltantes o extras."}</p>
                                </div>
                            </div>
                        )}
                    </div>

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
                                <span className="text-gray-400 text-sm font-medium">${totalValue.toLocaleString('es-AR')} Total</span>
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">
                                        <span className="text-blue-600">Pagable (${receivedValue.toLocaleString('es-AR')})</span>
                                        <span className="text-yellow-600">Retenido (${pendingValue.toLocaleString('es-AR')})</span>
                                    </div>
                                    <div className="w-full bg-yellow-100 rounded-full h-3 overflow-hidden flex">
                                        <div className="bg-blue-500 h-full transition-all" style={{ width: `${percentageValueReceived}%` }}></div>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2 pt-4 border-t border-gray-50">
                                    <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 flex justify-between items-center">
                                        <div>
                                            <div className="text-[9px] font-bold text-blue-600 uppercase tracking-widest">Valor Recibido</div>
                                            <div className="text-lg font-black text-blue-800">${receivedValue.toLocaleString('es-AR')}</div>
                                        </div>
                                        <div className="text-blue-400 font-black">{percentageValueReceived}%</div>
                                    </div>
                                    <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-100 flex justify-between items-center">
                                        <div>
                                            <div className="text-[9px] font-bold text-yellow-600 uppercase tracking-widest">Valor Pendiente</div>
                                            <div className="text-lg font-black text-yellow-800">${pendingValue.toLocaleString('es-AR')}</div>
                                        </div>
                                        <div className="text-yellow-500 font-black">{percentageValuePending}%</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>

                    {realMatchedItems.length > 0 && (
                        <div className="mb-6 page-break-inside-avoid">
                            <h2 className="text-sm font-black text-green-700 uppercase tracking-widest mb-3 flex items-center gap-2 border-b border-green-200 pb-2">
                                <span>✅</span> Ingresos Completos ({realMatchedItems.length})
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {realMatchedItems.map((item, idx) => (
                                    <div key={idx} className="bg-white p-4 rounded-2xl border-l-4 border border-green-400 border-gray-100 shadow-sm flex flex-col justify-between break-inside-avoid">
                                        <div className="mb-2">
                                            <span className="text-[10px] font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{item.sku}</span>
                                            <h4 className="font-bold text-gray-900 text-sm leading-tight mt-1">{item.productName}</h4>
                                        </div>
                                        <div className="flex justify-between items-end border-t border-gray-50 pt-2 mt-auto">
                                            <div className="text-xs text-gray-500">
                                                Cant: <span className="font-bold text-gray-800">{item.quantityReceived}</span> x ${item.unitPrice.toLocaleString('es-AR')}
                                            </div>
                                            <div className="font-black text-green-700 text-sm">
                                                ${(item.quantityReceived * item.unitPrice).toLocaleString('es-AR')}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {realPartialItems.length > 0 && (
                        <div className="mb-6 page-break-inside-avoid">
                            <h2 className="text-sm font-black text-yellow-700 uppercase tracking-widest mb-3 flex items-center gap-2 border-b border-yellow-200 pb-2">
                                <span>⚠️</span> Ingresos Parciales ({realPartialItems.length})
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {realPartialItems.map((item, idx) => {
                                    const pending = item.quantity - item.quantityReceived;
                                    const pendingValue = pending * item.unitPrice;
                                    return (
                                        <div key={idx} className="bg-yellow-50 p-4 rounded-2xl border-l-4 border border-yellow-400 border-yellow-100 shadow-sm flex flex-col justify-between break-inside-avoid">
                                            <div className="mb-2">
                                                <span className="text-[10px] font-mono bg-white border border-yellow-200 px-1.5 py-0.5 rounded text-gray-600">{item.sku}</span>
                                                <h4 className="font-bold text-gray-900 text-sm leading-tight mt-1">{item.productName}</h4>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-xs border-t border-yellow-200 pt-2 mt-auto">
                                                <div>
                                                    <span className="text-gray-500 block text-[9px] uppercase">Recibido</span>
                                                    <span className="font-bold text-green-700">{item.quantityReceived} un.</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-gray-500 block text-[9px] uppercase">Faltante (${pendingValue.toLocaleString('es-AR')})</span>
                                                    <span className="font-black text-red-600">{pending} un.</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {realMissingItems.length > 0 && (
                        <div className="mb-6 page-break-inside-avoid">
                            <h2 className="text-sm font-black text-red-700 uppercase tracking-widest mb-3 flex items-center gap-2 border-b border-red-200 pb-2">
                                <span>❌</span> Faltantes Totales ({realMissingItems.length})
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {realMissingItems.map((item, idx) => {
                                    const pendingValue = item.quantity * item.unitPrice;
                                    return (
                                        <div key={idx} className="bg-red-50 p-4 rounded-2xl border-l-4 border border-red-500 border-red-100 shadow-sm flex flex-col justify-between opacity-80 break-inside-avoid">
                                            <div className="mb-2">
                                                <span className="text-[10px] font-mono bg-white border border-red-200 px-1.5 py-0.5 rounded text-gray-600">{item.sku}</span>
                                                <h4 className="font-bold text-gray-900 text-sm leading-tight mt-1 line-through decoration-red-300">{item.productName}</h4>
                                            </div>
                                            <div className="flex justify-between items-end border-t border-red-200 pt-2 mt-auto">
                                                <div className="text-xs text-red-800 font-bold">
                                                    0 de {item.quantity} recibidos
                                                </div>
                                                <div className="font-black text-red-700 text-sm">
                                                    - ${(pendingValue).toLocaleString('es-AR')}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {reconciliation.extraItems.length > 0 && (
                        <div className="mb-6 page-break-inside-avoid">
                            <h2 className="text-sm font-black text-purple-700 uppercase tracking-widest mb-3 flex items-center gap-2 border-b border-purple-200 pb-2">
                                <span>➕</span> Ingresos Extra no Solicitados ({reconciliation.extraItems.length})
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {reconciliation.extraItems.map((item, idx) => (
                                    <div key={idx} className="bg-purple-50 p-4 rounded-2xl border-l-4 border border-purple-500 border-purple-100 shadow-sm flex flex-col justify-between break-inside-avoid">
                                        <div className="mb-2">
                                            <span className="text-[10px] font-mono bg-white border border-purple-200 px-1.5 py-0.5 rounded text-gray-600">{item.sku}</span>
                                            <h4 className="font-bold text-gray-900 text-sm leading-tight mt-1">{item.productName}</h4>
                                        </div>
                                        <div className="flex justify-between items-end border-t border-purple-200 pt-2 mt-auto">
                                            <div className="text-xs text-purple-800">
                                                Ingreso libre: <span className="font-bold">{item.receivedQuantity}</span>
                                            </div>
                                            <div className="font-black text-purple-700 text-sm">
                                                + ${(item.receivedQuantity * (item.unitPrice || 0)).toLocaleString('es-AR')}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            <div className="h-32 md:h-24 w-full print:hidden" aria-hidden="true"></div>

            <div className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-md border-t border-gray-200 p-4 md:p-6 z-40 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] print:hidden">
                <div className="max-w-5xl mx-auto flex flex-col sm:flex-row gap-3 justify-end">
                    <button onClick={handlePrint} className="hidden sm:block px-6 py-3.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors border border-gray-200">
                        🖨️ Imprimir Documento
                    </button>
                    <button onClick={onClose} className="w-full sm:w-auto px-8 py-3.5 bg-gray-900 text-white font-black rounded-xl hover:bg-gray-800 transition-all shadow-lg">
                        Finalizar y Volver a Pedidos
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeliveryReceipt;