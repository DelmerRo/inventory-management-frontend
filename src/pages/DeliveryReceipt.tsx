import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { usePurchaseOrderStore } from '../store/purchaseOrderStore';
import { DeliveryHeader } from '../components/delivery/DeliveryHeader';
import { ItemFilterSort } from '../components/delivery/ItemFilterSort';
import type { SortCriterion, SortDirection } from '../components/delivery/ItemFilterSort';
import { PendingItemCard } from '../components/delivery/PendingItemCard';
import { ReconciliationResult } from '../components/delivery/ReconciliationResult';

import type {
    ReceivedItem,
    PendingReceivedItem,
    OrderReconciliation,
    DeliveryReceiptRequest,
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

    // Búsqueda y Ordenamiento
    const [itemSearchQuery, setItemSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<SortCriterion>('sku');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

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

    // 🌟 PERMITIR SOBRANTES (Identificación segura por objeto)
    const updateAdditionalQuantity = (targetItem: PendingReceivedItem, quantity: number) => {
        setPendingItems(prev => prev.map(item =>
            item === targetItem ? { ...item, additionalQuantity: Math.max(0, quantity) } : item
        ));
    };

    const updateUnitPrice = (targetItem: PendingReceivedItem, price: number) => {
        setPendingItems(prev => prev.map(item =>
            item === targetItem ? { ...item, unitPrice: price } : item
        ));
    };

    // 🌟 AGREGAR PRODUCTO EXTRA
    const addExtraItem = () => {
        setPendingItems(prev => [
            ...prev,
            {
                supplierSku: '',
                productName: '',
                additionalQuantity: 1,
                unitPrice: 0,
                orderedQuantity: 0,
                alreadyReceived: 0,
                pendingQuantity: 0
            }
        ]);
    };

    const removeExtraItem = (targetItem: PendingReceivedItem) => {
        setPendingItems(prev => prev.filter(item => item !== targetItem));
    };

    // 🌟 AUTOCOMPLETADO INTELIGENTE POR SKU SI EXISTE
    const updateExtraItemSku = (targetItem: PendingReceivedItem, value: string) => {
        const cleanSku = value.toUpperCase().trim();

        setPendingItems(prev => prev.map(item => {
            if (item !== targetItem) return item;

            const existingMatch = selectedOrder?.items.find(
                o => o.sku.toUpperCase() === cleanSku
            );

            return {
                ...item,
                supplierSku: cleanSku,
                productName: existingMatch ? (existingMatch.productName || '') : item.productName,
                unitPrice: existingMatch ? existingMatch.unitPrice : item.unitPrice,
            };
        }));
    };

    const updateExtraItemName = (targetItem: PendingReceivedItem, name: string) => {
        setPendingItems(prev => prev.map(item =>
            item === targetItem ? { ...item, productName: name } : item
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
            alert('Todos los productos deben tener un SKU válido');
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

    // 🔍 Filtrado y Ordenamiento Dinámico
    const processedPendingItems = useMemo(() => {
        const query = itemSearchQuery.toLowerCase().trim();
        let result = pendingItems;

        if (query) {
            result = result.filter(i =>
                i.supplierSku.toLowerCase().includes(query) ||
                i.productName.toLowerCase().includes(query)
            );
        }

        return [...result].sort((a, b) => {
            let comparison = 0;
            if (sortBy === 'sku') comparison = a.supplierSku.localeCompare(b.supplierSku);
            else if (sortBy === 'name') comparison = (a.productName || '').localeCompare(b.productName || '');
            else if (sortBy === 'pending') comparison = a.pendingQuantity - b.pendingQuantity;
            else if (sortBy === 'price') comparison = (a.unitPrice || 0) - (b.unitPrice || 0);

            return sortDirection === 'asc' ? comparison : -comparison;
        });
    }, [pendingItems, itemSearchQuery, sortBy, sortDirection]);

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
    const completionPercentage = totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0;

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-8 pb-40 md:pb-32 relative">
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-2">{getTitle()}</h1>
            <p className="text-gray-500 mb-6 font-medium">{getSubtitle()}</p>

            <DeliveryHeader
                selectedOrder={selectedOrder}
                completionPercentage={completionPercentage}
                totalValue={selectedOrder.totalAmount}
            />

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
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder={isContinue ? "Ej: Segunda entrega, completando faltantes" : "Ej: Faltó un producto, llegó en mal estado, etc."}
                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                                rows={3}
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-3xl shadow-sm p-6 border border-gray-100">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-5 gap-3">
                        <h2 className="text-lg font-black text-gray-800">
                            {isContinue ? '📦 Pendientes por Recibir' : '📦 Productos a Recibir'}
                        </h2>
                        <button
                            type="button"
                            onClick={addExtraItem}
                            className="text-xs font-bold bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl hover:bg-indigo-100 border border-indigo-100 transition-colors"
                        >
                            ➕ Producto Extra
                        </button>
                    </div>

                    {pendingItems.length > 0 && (
                        <ItemFilterSort
                            searchQuery={itemSearchQuery}
                            onSearchChange={setItemSearchQuery}
                            sortBy={sortBy}
                            onSortByChange={setSortBy}
                            sortDirection={sortDirection}
                            onToggleDirection={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                        />
                    )}

                    {processedPendingItems.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-2xl border border-gray-100 font-bold">
                            {pendingItems.length === 0 ? '✅ ¡No hay productos pendientes!' : '🔍 No se encontraron productos.'}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {processedPendingItems.map((item, index) => (
                                <PendingItemCard
                                    key={item.supplierSku ? `${item.supplierSku}-${index}` : `extra-${index}`}
                                    item={item}
                                    onUpdateQuantity={updateAdditionalQuantity}
                                    onUpdateUnitPrice={updateUnitPrice}
                                    onUpdateExtraSku={updateExtraItemSku}
                                    onUpdateExtraName={updateExtraItemName}
                                    onRemoveExtra={removeExtraItem}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </form>

            {/* Barra Fija de Botones */}
            <div className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-md border-t border-gray-200 p-4 md:p-6 z-40 shadow-lg print:hidden">
                <div className="max-w-5xl mx-auto flex flex-col sm:flex-row gap-3 justify-end">
                    <button
                        type="button"
                        onClick={() => navigate('/purchase-orders')}
                        className="hidden sm:block px-6 py-3.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors border border-gray-200"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleReconcile}
                        className="flex-1 sm:flex-none px-6 py-3.5 bg-blue-50 text-blue-700 font-bold rounded-xl hover:bg-blue-100 transition-colors border border-blue-200"
                    >
                        📊 Estado Actual
                    </button>
                    <button
                        form="receipt-form"
                        type="submit"
                        disabled={isLoading || pendingItems.filter(i => i.additionalQuantity > 0).length === 0}
                        className="flex-1 sm:flex-none px-8 py-3.5 bg-green-600 text-white font-black rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:bg-gray-300 transition-all shadow-lg"
                    >
                        {isLoading ? 'Procesando...' : 'Confirmar Recepción'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeliveryReceipt;