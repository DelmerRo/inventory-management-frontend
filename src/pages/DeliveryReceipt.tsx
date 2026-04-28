// pages/DeliveryReceipt.tsx
import React, { useEffect, useState } from 'react';
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
    // ✅ Eliminar 'reconcileOrder' de la desestructuración si no se usa
    const { selectedOrder, fetchOrderById, processDelivery, reconciliation, isLoading } = usePurchaseOrderStore();

    const isContinue = new URLSearchParams(location.search).get('continue') === 'true';

    const [formData, setFormData] = useState({
        deliveryDate: new Date().toISOString().slice(0, 16),
        notes: ''
    });

    const [pendingItems, setPendingItems] = useState<PendingReceivedItem[]>([]);
    const [showReconciliation, setShowReconciliation] = useState(false);
    const [lastReconciliation, setLastReconciliation] = useState<OrderReconciliation | null>(null);

    useEffect(() => {
        if (id) {
            fetchOrderById(parseInt(id));
        }
    }, [id, fetchOrderById]);

    // Inicializar SOLO los productos pendientes (los que faltan)
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

    // Cargar notas anteriores si es continuación
    useEffect(() => {
        if (selectedOrder) {
            const existingNotes = selectedOrder.notes || '';
            setFormData(prev => ({
                ...prev,
                notes: existingNotes
            }));
            if (existingNotes) {
                console.log('Notas cargadas del pedido:', existingNotes);
            }
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

        // ✅ CORREGIDO: Llamar solo una vez, no dos veces
        const reconciliationResult = await processDelivery(receipt);
        if (reconciliationResult) {
            setLastReconciliation(reconciliationResult);
            await fetchOrderById(parseInt(id!));
            setShowReconciliation(true);
        }
    };

    // ✅ Mover handleReconcile dentro del componente
    const handleReconcile = async () => {
        if (id) {
            const { reconcileOrder } = usePurchaseOrderStore.getState();
            await reconcileOrder(parseInt(id));
            setShowReconciliation(true);
        }
    };

    const getTitle = () => isContinue ? "📦 Continuar Recepción de Mercadería" : "📦 Recibir Mercadería";
    const getSubtitle = () => isContinue
        ? "Complete la cantidad faltante para cada producto."
        : "Complete el remito con los productos recibidos.";

    if (isLoading && !selectedOrder) {
        return <div className="text-center py-8 text-gray-500">Cargando pedido...</div>;
    }

    if (!selectedOrder) {
        return <div className="text-center py-8 text-gray-500">Pedido no encontrado</div>;
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

    // Calcular estadísticas
    const totalOrdered = selectedOrder.items.reduce((sum, i) => sum + i.quantity, 0);
    const totalReceived = selectedOrder.items.reduce((sum, i) => sum + (i.quantityReceived || 0), 0);
    const totalPending = totalOrdered - totalReceived;
    const completionPercentage = totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0;
    const totalValue = selectedOrder.totalAmount;
    const receivedValue = selectedOrder.items.reduce((sum, i) => sum + ((i.quantityReceived || 0) * i.unitPrice), 0);
    const pendingValue = totalValue - receivedValue;

    return (
        <div className="max-w-5xl mx-auto">
            <h1 className="text-2xl font-bold mb-2 text-gray-900">{getTitle()}</h1>
            <p className="text-gray-500 mb-6">{getSubtitle()}</p>

            {/* Información del pedido */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg mb-6 border border-blue-200">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div><p className="text-xs text-gray-500">N° Pedido</p><p className="font-bold text-gray-900">{selectedOrder.orderNumber}</p></div>
                    <div><p className="text-xs text-gray-500">Proveedor</p><p className="font-bold text-gray-900">{selectedOrder.supplierName}</p></div>
                    <div><p className="text-xs text-gray-500">Fecha del Pedido</p><p className="font-bold text-gray-900">{new Date(selectedOrder.orderDate).toLocaleDateString()}</p></div>
                    <div><p className="text-xs text-gray-500">Total Pedido</p><p className="font-bold text-green-600">${totalValue.toLocaleString()}</p></div>
                </div>
            </div>

            {/* Dashboard de estado actual */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">📊 Estado Actual del Pedido</h3>

                <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Progreso de recepción</span>
                        <span>{completionPercentage}% completado</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div className="bg-green-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${completionPercentage}%` }}></div>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{totalOrdered}</div>
                        <div className="text-xs text-gray-500">📦 Unidades Pedidas</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{totalReceived}</div>
                        <div className="text-xs text-gray-500">✅ Unidades Recibidas</div>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-600">{totalPending}</div>
                        <div className="text-xs text-gray-500">⏳ Unidades Pendientes</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">{completionPercentage}%</div>
                        <div className="text-xs text-gray-500">📈 % Completado</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-gray-100">
                    <div className="text-center p-2">
                        <p className="text-xs text-gray-500">💰 Valor Total del Pedido</p>
                        <p className="text-lg font-bold text-gray-900">${totalValue.toLocaleString()}</p>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded-lg">
                        <p className="text-xs text-green-600">✅ Valor ya Recibido</p>
                        <p className="text-lg font-bold text-green-600">${receivedValue.toLocaleString()}</p>
                    </div>
                    <div className="text-center p-2 bg-yellow-50 rounded-lg">
                        <p className="text-xs text-yellow-600">⏳ Valor Pendiente</p>
                        <p className="text-lg font-bold text-yellow-600">${pendingValue.toLocaleString()}</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
                <div className="border-b pb-4 mb-4">
                    <h2 className="text-lg font-semibold mb-4 text-gray-800">📋 Datos de la Recepción</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">
                                Fecha de Entrega <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="datetime-local"
                                value={formData.deliveryDate}
                                onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-gray-700 text-sm font-bold mb-2">
                                Notas {isContinue ? '(agregar nueva nota)' : '(opcional)'}
                            </label>
                            {isContinue && selectedOrder?.notes && (
                                <div className="mb-2 p-2 bg-gray-50 rounded text-sm text-gray-600">
                                    <span className="font-medium">📝 Nota anterior:</span> {selectedOrder.notes}
                                </div>
                            )}
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder={isContinue ? "Ej: Segunda entrega, completando faltantes" : "Ej: Faltó un producto, llegó en mal estado, etc."}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                rows={3}
                            />
                            <p className="text-xs text-gray-400 mt-1">
                                {isContinue ? '💡 Las notas se agregarán al historial del pedido.' : '💡 Las notas se guardarán en el pedido.'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="pb-4 mb-4">
                    <h2 className="text-lg font-semibold mb-4 text-gray-800">
                        {isContinue ? '📦 Productos Pendientes por Recibir' : '📦 Productos a Recibir'}
                    </h2>

                    {pendingItems.length === 0 ? (
                        <div className="text-center py-8 text-green-600 bg-green-50 rounded-lg">
                            ✅ ¡No hay productos pendientes! Este pedido ya está completado.
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                                            <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Pedido</th>
                                            <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ya Recibido</th>
                                            <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Pendiente</th>
                                            <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Recibir Ahora</th>
                                            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Precio Unit.</th>
                                            <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {pendingItems.map((item, index) => {
                                            const isOriginal = item.orderedQuantity > 0;
                                            const maxToReceive = item.pendingQuantity;
                                            const willBeComplete = item.additionalQuantity === item.pendingQuantity;

                                            return (
                                                <tr key={index} className={item.additionalQuantity > 0 ? 'bg-green-50' : ''}>
                                                    <td className="px-3 py-2 text-sm font-mono">
                                                        {isOriginal ? item.supplierSku : (
                                                            <input type="text" value={item.supplierSku} onChange={(e) => updateExtraItemSku(index, e.target.value)} placeholder="SKU" className="w-28 px-2 py-1 border rounded text-sm" required />
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2 text-sm">
                                                        {item.productName || 'Producto nuevo'}
                                                        {item.additionalQuantity > 0 && (
                                                            <span className="ml-2 text-xs text-green-600">
                                                                {willBeComplete ? '✅ Completará el pedido' : `📦 +${item.additionalQuantity} en esta entrega`}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2 text-sm text-center">{item.orderedQuantity || '-'}</td>
                                                    <td className="px-3 py-2 text-sm text-center text-green-600">{item.alreadyReceived}</td>
                                                    <td className="px-3 py-2 text-sm text-center text-yellow-600 font-bold">{item.pendingQuantity}</td>
                                                    <td className="px-3 py-2 text-sm text-center">
                                                        <input
                                                            type="number"
                                                            value={item.additionalQuantity}
                                                            onChange={(e) => updateAdditionalQuantity(item.supplierSku, parseInt(e.target.value) || 0)}
                                                            className="w-20 px-2 py-1 border rounded text-center"
                                                            min="0"
                                                            max={maxToReceive}
                                                            placeholder="0"
                                                        />
                                                        {maxToReceive > 0 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => updateAdditionalQuantity(item.supplierSku, maxToReceive)}
                                                                className="ml-1 text-xs text-blue-500 hover:text-blue-700"
                                                                title="Completar todo lo pendiente"
                                                            >
                                                                Completar
                                                            </button>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2 text-sm text-right">
                                                        <input
                                                            type="number"
                                                            value={item.unitPrice || ''}
                                                            onChange={(e) => updateUnitPrice(item.supplierSku, parseFloat(e.target.value) || 0)}
                                                            className="w-28 px-2 py-1 border rounded text-right"
                                                            step="0.01"
                                                            min="0"
                                                            placeholder="Precio"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2 text-center">
                                                        {!isOriginal && (
                                                            <button type="button" onClick={() => removeExtraItem(index)} className="text-red-500 hover:text-red-700 text-sm" title="Eliminar producto extra">🗑️</button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <button type="button" onClick={addExtraItem} className="mt-4 text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1">
                                ➕ Agregar producto extra (no estaba en el pedido)
                            </button>
                        </>
                    )}

                    <p className="text-xs text-gray-400 mt-2">
                        💡 <strong>Sugerencia:</strong> Ingrese SOLO la cantidad que está recibiendo en ESTA entrega.
                        El sistema sumará automáticamente a lo que ya recibió anteriormente.
                        Use el botón <strong>"Completar"</strong> para recibir todo lo pendiente de una vez.
                    </p>
                </div>

                <div className="flex gap-3 mt-6">
                    <button type="submit" disabled={isLoading || pendingItems.length === 0} className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition disabled:opacity-50">
                        {isLoading ? 'Procesando...' : '✅ Procesar Recepción'}
                    </button>
                    <button type="button" onClick={handleReconcile} className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition">📊 Ver Estado Actual</button>
                    <button type="button" onClick={() => navigate('/purchase-orders')} className="bg-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-400 transition">Cancelar</button>
                </div>
            </form>
        </div>
    );
};

// Componente de resultados (sin cambios)
const ReconciliationResult: React.FC<{
    reconciliation: OrderReconciliation;
    selectedOrder: PurchaseOrderResponse | null;
    onClose: () => void
}> = ({ reconciliation, selectedOrder, onClose }) => {

    // Usar selectedOrder para datos reales si está disponible
    const totalOrdered = selectedOrder?.items.reduce((sum, i) => sum + i.quantity, 0) || reconciliation.summary.totalOrderedItems;
    const totalReceived = selectedOrder?.items.reduce((sum, i) => sum + (i.quantityReceived || 0), 0) || reconciliation.summary.totalReceivedItems;
    const totalPending = totalOrdered - totalReceived;
    const percentageReceived = totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0;
    const percentagePending = totalOrdered > 0 ? Math.round((totalPending / totalOrdered) * 100) : 0;

    const totalValue = selectedOrder?.totalAmount || reconciliation.summary.totalOrderValue;
    const receivedValue = selectedOrder?.items.reduce((sum, i) => sum + ((i.quantityReceived || 0) * i.unitPrice), 0) || reconciliation.summary.totalReceivedValue;
    const pendingValue = totalValue - receivedValue;
    const percentageValueReceived = totalValue > 0 ? Math.round((receivedValue / totalValue) * 100) : 0;
    const percentageValuePending = totalValue > 0 ? Math.round((pendingValue / totalValue) * 100) : 0;

    // Items reales del pedido
    const realMatchedItems = selectedOrder?.items.filter(item => item.quantityReceived === item.quantity) || [];
    const realPartialItems = selectedOrder?.items.filter(item => item.quantityReceived > 0 && item.quantityReceived < item.quantity) || [];
    const realMissingItems = selectedOrder?.items.filter(item => item.quantityReceived === 0) || [];

    const totalItems = selectedOrder?.items.length || 0;
    const completedItems = realMatchedItems.length;
    const partialItemsCount = realPartialItems.length;
    const missingItemsCount = realMissingItems.length;
    const itemsCompletionPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    const isFullyReceived = realMatchedItems.length === (selectedOrder?.items.length || 0) && totalPending === 0;
    const hasDiscrepancies = reconciliation.summary.hasDiscrepancies;

    // Calcular productos más problemáticos (los que más faltan)
    const mostProblematicItems = [...realPartialItems, ...realMissingItems]
        .sort((a, b) => {
            const aMissing = (a.quantity - (a.quantityReceived || 0));
            const bMissing = (b.quantity - (b.quantityReceived || 0));
            return bMissing - aMissing;
        })
        .slice(0, 3);

    return (
        <div className="max-w-5xl mx-auto">
            <h1 className="text-2xl font-bold mb-6 text-gray-900">📊 Resultado de la Recepción</h1>

            {/* Tarjeta de éxito */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">✅</span>
                    <div>
                        <h2 className="text-lg font-bold text-green-800">¡Recepción procesada exitosamente!</h2>
                        <p className="text-green-600">Los productos han sido registrados en el inventario.</p>
                    </div>
                </div>
            </div>

            {/* Resumen ejecutivo - Estado General */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4 text-gray-800">📊 Resumen Ejecutivo</h2>

                <div className={`rounded-lg p-4 mb-4 ${isFullyReceived ? 'bg-green-50 border border-green-200' : totalPending > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <h3 className="text-xl font-bold mb-1">
                                {isFullyReceived ? '✅ ¡PEDIDO COMPLETO!' : totalPending > 0 ? '⚠️ PEDIDO PARCIAL' : '❌ PEDIDO PENDIENTE'}
                            </h3>
                            <p className="text-gray-600">
                                {isFullyReceived ? 'Todos los productos han sido recibidos correctamente.' :
                                    totalPending > 0 ? `Faltan ${totalPending} unidades por recibir.` :
                                        'Aún no se ha recibido mercadería.'}
                            </p>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-blue-600">{percentageReceived}%</div>
                            <div className="text-xs text-gray-500">Completado</div>
                        </div>
                    </div>
                </div>

                {hasDiscrepancies && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                        <div className="flex items-center gap-2">
                            <span className="text-orange-500">⚠️</span>
                            <p className="text-sm text-orange-700">Se detectaron discrepancias en esta recepción. Revise los detalles a continuación.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Dashboard de métricas - Unidades */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4 text-gray-800">📦 Métricas por Unidades</h2>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{totalOrdered}</div>
                        <div className="text-xs text-gray-500">📦 Unidades Pedidas</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{totalReceived}</div>
                        <div className="text-xs text-gray-500">✅ Unidades Recibidas</div>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-600">{totalPending}</div>
                        <div className="text-xs text-gray-500">⏳ Unidades Pendientes</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">{percentageReceived}%</div>
                        <div className="text-xs text-gray-500">📈 % Completado</div>
                    </div>
                </div>

                {/* Barra de progreso de unidades */}
                <div className="mb-2">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Progreso de recepción</span>
                        <span>{percentageReceived}% completado ({percentagePending}% pendiente)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                        <div className="bg-green-600 h-3 rounded-full transition-all duration-500" style={{ width: `${percentageReceived}%` }}></div>
                    </div>
                </div>
            </div>

            {/* Dashboard de métricas - Valor Monetario */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4 text-gray-800">💰 Métricas por Valor</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <p className="text-xs text-gray-500">💰 Valor Total del Pedido</p>
                        <p className="text-2xl font-bold text-blue-600">${totalValue.toLocaleString()}</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                        <p className="text-xs text-green-600">✅ Valor Recibido</p>
                        <p className="text-2xl font-bold text-green-600">${receivedValue.toLocaleString()}</p>
                        <p className="text-xs text-green-500">{percentageValueReceived}% del total</p>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                        <p className="text-xs text-yellow-600">⏳ Valor Pendiente</p>
                        <p className="text-2xl font-bold text-yellow-600">${pendingValue.toLocaleString()}</p>
                        <p className="text-xs text-yellow-500">{percentageValuePending}% del total</p>
                    </div>
                </div>

                {/* Barra de progreso de valor */}
                <div className="mb-2">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Progreso de valor</span>
                        <span>{percentageValueReceived}% recibido ({percentageValuePending}% pendiente)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                        <div className="bg-green-600 h-3 rounded-full transition-all duration-500" style={{ width: `${percentageValueReceived}%` }}></div>
                    </div>
                </div>
            </div>

            {/* Dashboard de métricas - Items del Pedido */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4 text-gray-800">📋 Métricas por Producto</h2>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{totalItems}</div>
                        <div className="text-xs text-gray-500">Total Productos</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{completedItems}</div>
                        <div className="text-xs text-gray-500">✅ Completos</div>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-600">{partialItemsCount}</div>
                        <div className="text-xs text-gray-500">⚠️ Parciales</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">{missingItemsCount}</div>
                        <div className="text-xs text-gray-500">❌ No Recibidos</div>
                    </div>
                </div>

                {/* Barra de progreso de items */}
                <div className="mb-2">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Productos completados</span>
                        <span>{itemsCompletionPercentage}% ({completedItems} de {totalItems} productos)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                        <div className="bg-green-600 h-3 rounded-full transition-all duration-500" style={{ width: `${itemsCompletionPercentage}%` }}></div>
                    </div>
                </div>
            </div>

            {/* Productos problemáticos (Top 3) */}
            {mostProblematicItems.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h2 className="text-lg font-semibold mb-4 text-red-600">⚠️ Productos con Mayor Pendiente</h2>
                    <p className="text-sm text-gray-500 mb-3">Estos son los productos que más unidades faltan por recibir:</p>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Producto</th>
                                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Pedido</th>
                                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Recibido</th>
                                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 text-red-600">Pendiente</th>
                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Valor Pendiente</th>
                                </tr>
                            </thead>
                            <tbody>
                                {mostProblematicItems.map((item, idx) => {
                                    const missing = item.quantity - (item.quantityReceived || 0);
                                    const missingValue = missing * item.unitPrice;
                                    return (
                                        <tr key={idx} className="bg-red-50">
                                            <td className="px-3 py-2 text-sm">{item.productName}</td>
                                            <td className="px-3 py-2 text-sm text-center">{item.quantity}</td>
                                            <td className="px-3 py-2 text-sm text-center text-yellow-600">{item.quantityReceived || 0}</td>
                                            <td className="px-3 py-2 text-sm text-center text-red-600 font-bold">{missing}</td>
                                            <td className="px-3 py-2 text-sm text-right text-red-600 font-bold">${missingValue.toLocaleString()}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Resumen de esta recepción */}
            {(reconciliation.matchedItems.length > 0 || reconciliation.partialItems.length > 0 || reconciliation.missingItems.length > 0 || reconciliation.extraItems.length > 0) && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h2 className="text-lg font-semibold mb-4 text-blue-600">📋 Resumen de esta Recepción</h2>

                    {reconciliation.matchedItems.length > 0 && (
                        <div className="mb-4">
                            <h3 className="font-medium text-green-600 mb-2">✅ Productos recibidos en esta entrega ({reconciliation.matchedItems.length} productos):</h3>
                            <ul className="list-disc list-inside text-sm text-gray-600">
                                {reconciliation.matchedItems.map((item, idx) => (
                                    <li key={idx}>{item.productName} - {item.receivedQuantity} unidades (${item.subtotal.toLocaleString()})</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {reconciliation.partialItems.length > 0 && (
                        <div className="mb-4">
                            <h3 className="font-medium text-yellow-600 mb-2">⚠️ Productos con recepción parcial ({reconciliation.partialItems.length} productos):</h3>
                            <ul className="list-disc list-inside text-sm text-gray-600">
                                {reconciliation.partialItems.map((item, idx) => (
                                    <li key={idx}>{item.productName} - Recibido: {item.receivedQuantity}, Faltan: {item.pendingQuantity} unidades</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {reconciliation.missingItems.length > 0 && (
                        <div className="mb-4">
                            <h3 className="font-medium text-red-600 mb-2">❌ Productos no recibidos ({reconciliation.missingItems.length} productos):</h3>
                            <ul className="list-disc list-inside text-sm text-gray-600">
                                {reconciliation.missingItems.map((item, idx) => (
                                    <li key={idx}>{item.productName} - {item.missingQuantity} unidades faltantes (${((item.unitPrice || 0) * item.missingQuantity).toLocaleString()})</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {reconciliation.extraItems.length > 0 && (
                        <div className="mb-4">
                            <h3 className="font-medium text-purple-600 mb-2">➕ Productos extra recibidos ({reconciliation.extraItems.length} productos):</h3>
                            <ul className="list-disc list-inside text-sm text-gray-600">
                                {reconciliation.extraItems.map((item, idx) => (
                                    <li key={idx}>{item.productName} - {item.receivedQuantity} unidades (no estaba en el pedido)</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {reconciliation.summary.recommendation && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-700">{reconciliation.summary.recommendation}</p>
                        </div>
                    )}
                </div>
            )}

            {/* Productos completamente recibidos */}
            {realMatchedItems.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h2 className="text-lg font-semibold mb-4 text-green-600">✅ Productos Completamente Recibidos ({realMatchedItems.length} productos)</h2>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Producto</th>
                                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Pedido</th>
                                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Recibido</th>
                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Precio</th>
                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {realMatchedItems.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="px-3 py-2 text-sm">{item.productName}</td>
                                        <td className="px-3 py-2 text-sm text-center">{item.quantity}</td>
                                        <td className="px-3 py-2 text-sm text-center text-green-600 font-medium">{item.quantityReceived}</td>
                                        <td className="px-3 py-2 text-sm text-right">${item.unitPrice.toFixed(2)}</td>
                                        <td className="px-3 py-2 text-sm text-right font-medium">${(item.quantityReceived * item.unitPrice).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="mt-4 text-right text-sm text-gray-600">Total: ${
                            realMatchedItems.reduce((total, item) => total + item.quantityReceived * item.unitPrice, 0).toLocaleString()
                        }</div>
                    </div>
                </div>
            )}

            {/* Productos con recepción parcial */}
            {realPartialItems.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h2 className="text-lg font-semibold mb-4 text-yellow-600">⚠️ Productos con Recepción Parcial ({realPartialItems.length} productos)</h2>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Producto</th>
                                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Pedido</th>
                                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Recibido</th>
                                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 text-red-600">Pendiente</th>
                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Valor Pendiente</th>
                                </tr>
                            </thead>
                            <tbody>
                                {realPartialItems.map((item, idx) => {
                                    const pending = item.quantity - item.quantityReceived;
                                    const pendingValue = pending * item.unitPrice;
                                    return (
                                        <tr key={idx}>
                                            <td className="px-3 py-2 text-sm">{item.productName}</td>
                                            <td className="px-3 py-2 text-sm text-center">{item.quantity}</td>
                                            <td className="px-3 py-2 text-sm text-center text-yellow-600">{item.quantityReceived}</td>
                                            <td className="px-3 py-2 text-sm text-center text-red-600 font-bold">{pending}</td>
                                            <td className="px-3 py-2 text-sm text-right text-red-600 font-bold">${pendingValue.toLocaleString()}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Productos no recibidos */}
            {realMissingItems.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h2 className="text-lg font-semibold mb-4 text-red-600">❌ Productos No Recibidos ({realMissingItems.length} productos)</h2>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Producto</th>
                                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Pedido</th>
                                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 text-red-600">Pendiente</th>
                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Precio</th>
                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Valor Pendiente</th>
                                </tr>
                            </thead>
                            <tbody>
                                {realMissingItems.map((item, idx) => {
                                    const pendingValue = item.quantity * item.unitPrice;
                                    return (
                                        <tr key={idx}>
                                            <td className="px-3 py-2 text-sm">{item.productName}</td>
                                            <td className="px-3 py-2 text-sm text-center">{item.quantity}</td>
                                            <td className="px-3 py-2 text-sm text-center text-red-600 font-bold">{item.quantity}</td>
                                            <td className="px-3 py-2 text-sm text-right">${item.unitPrice.toFixed(2)}</td>
                                            <td className="px-3 py-2 text-sm text-right text-red-600 font-bold">${pendingValue.toLocaleString()}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Productos extra */}
            {reconciliation.extraItems.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h2 className="text-lg font-semibold mb-4 text-purple-600">➕ Productos Extra (No solicitados) - {reconciliation.extraItems.length} productos</h2>
                    <p className="text-sm text-gray-500 mb-3">Estos productos no estaban en el pedido original pero fueron recibidos. Se han agregado al inventario.</p>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">SKU</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Producto</th>
                                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Cantidad</th>
                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Precio</th>
                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reconciliation.extraItems.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="px-3 py-2 text-sm font-mono">{item.sku}</td>
                                        <td className="px-3 py-2 text-sm">{item.productName}</td>
                                        <td className="px-3 py-2 text-sm text-center text-purple-600 font-bold">{item.receivedQuantity}</td>
                                        <td className="px-3 py-2 text-sm text-right">${(item.unitPrice || 0).toFixed(2)}</td>
                                        <td className="px-3 py-2 text-sm text-right font-bold text-purple-600">${((item.unitPrice || 0) * item.receivedQuantity).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Botón de acción */}
            <div className="flex gap-3 mt-6">
                <button onClick={onClose} className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition">
                    Volver a Pedidos
                </button>
            </div>
        </div>
    );
};

export default DeliveryReceipt;