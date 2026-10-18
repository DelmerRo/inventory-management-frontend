import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { usePurchaseOrderStore } from '../store/purchaseOrderStore';
import { useProductStore } from '../store/productStore';
import { DeliveryHeader } from '../components/delivery/DeliveryHeader';
import { ItemFilterSort } from '../components/delivery/ItemFilterSort';
import type { SortCriterion, SortDirection } from '../components/delivery/ItemFilterSort';
import { PendingItemCard } from '../components/delivery/PendingItemCard';
import type { CatalogProductOption } from '../components/delivery/PendingItemCard';
import { ReconciliationResult } from '../components/delivery/ReconciliationResult';

import type {
    ReceivedItem,
    PendingReceivedItem,
    OrderReconciliation,
    DeliveryReceiptRequest,
} from '../types/purchaseOrder';

type ViewTabFilter = 'all' | 'filled' | 'pending';

const DeliveryReceipt: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const { selectedOrder, fetchOrderById, processDelivery, reconciliation, isLoading } = usePurchaseOrderStore();
    const { products, fetchProducts } = useProductStore();

    const isContinue = new URLSearchParams(location.search).get('continue') === 'true';
    const isReportMode = new URLSearchParams(location.search).get('action') === 'report';

    const [formData, setFormData] = useState({
        deliveryDate: new Date().toISOString().slice(0, 16),
        notes: ''
    });

    const [pendingItems, setPendingItems] = useState<PendingReceivedItem[]>([]);
    const [extraItems, setExtraItems] = useState<PendingReceivedItem[]>([]);
    const [lastAddedIndex, setLastAddedIndex] = useState<number | null>(null);

    const [showReconciliation, setShowReconciliation] = useState(false);
    const [lastReconciliation, setLastReconciliation] = useState<OrderReconciliation | null>(null);
    const [autoReconciled, setAutoReconciled] = useState(false);

    // Búsqueda, Ordenamiento y Filtro por Pestañas
    const [itemSearchQuery, setItemSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<SortCriterion>('sku');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const [tabFilter, setTabFilter] = useState<ViewTabFilter>('all');

    const extrasSectionRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        window.scrollTo(0, 0);
        if (id) fetchOrderById(parseInt(id));
    }, [id, fetchOrderById]);

    useEffect(() => {
        if (products.length === 0) {
            fetchProducts();
        }
    }, [products.length, fetchProducts]);

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

    // Catálogo unificado de productos para el autocompletado
    const catalogProductsOptions = useMemo(() => {
        const map = new Map<string, CatalogProductOption>();

        if (selectedOrder?.items) {
            selectedOrder.items.forEach(item => {
                const skuKey = item.sku ? item.sku.toUpperCase().trim() : '';
                if (skuKey) {
                    map.set(skuKey, {
                        supplierSku: item.sku,
                        productName: item.productName || '',
                        unitPrice: item.unitPrice || 0,
                    });
                }
            });
        }

        if (products && products.length > 0) {
            products.forEach(p => {
                const suppSkuKey = p.primarySupplierSku ? p.primarySupplierSku.toUpperCase().trim() : '';
                const internalSkuKey = p.sku ? p.sku.toUpperCase().trim() : '';

                if (suppSkuKey) {
                    map.set(suppSkuKey, {
                        supplierSku: p.primarySupplierSku!,
                        productName: p.name || '',
                        unitPrice: p.costPrice || 0,
                    });
                }

                if (internalSkuKey && !map.has(internalSkuKey)) {
                    map.set(internalSkuKey, {
                        supplierSku: p.sku,
                        productName: p.name || '',
                        unitPrice: p.costPrice || 0,
                    });
                }
            });
        }

        return Array.from(map.values());
    }, [selectedOrder, products]);

    // Handlers
    const updateAdditionalQuantity = useCallback((targetItem: PendingReceivedItem, quantity: number) => {
        const updateList = (prev: PendingReceivedItem[]) =>
            prev.map(item => (item === targetItem ? { ...item, additionalQuantity: Math.max(0, quantity) } : item));

        setPendingItems(updateList);
        setExtraItems(updateList);
    }, []);

    const updateUnitPrice = useCallback((targetItem: PendingReceivedItem, price: number) => {
        const updateList = (prev: PendingReceivedItem[]) =>
            prev.map(item => (item === targetItem ? { ...item, unitPrice: price } : item));

        setPendingItems(updateList);
        setExtraItems(updateList);
    }, []);

    // ⚡ ACCIONES MASIVAS (RÁPIDAS)
    const fillAllPending = useCallback(() => {
        setPendingItems(prev => prev.map(item => ({
            ...item,
            additionalQuantity: item.pendingQuantity
        })));
    }, []);

    const resetAllQuantities = useCallback(() => {
        setPendingItems(prev => prev.map(item => ({
            ...item,
            additionalQuantity: 0
        })));
        setExtraItems(prev => prev.map(item => ({
            ...item,
            additionalQuantity: 0
        })));
    }, []);

    // ➕ Agregar Producto Extra (se coloca al principio de los extras)
    const addExtraItem = useCallback(() => {
        const newExtra: PendingReceivedItem = {
            supplierSku: '',
            productName: '',
            additionalQuantity: 1,
            unitPrice: 0,
            orderedQuantity: 0,
            alreadyReceived: 0,
            pendingQuantity: 0
        };

        setExtraItems(prev => [newExtra, ...prev]);
        setLastAddedIndex(0);

        setTimeout(() => {
            extrasSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 80);
    }, []);

    const removeExtraItem = useCallback((targetItem: PendingReceivedItem) => {
        setExtraItems(prev => prev.filter(item => item !== targetItem));
    }, []);

    const updateExtraItemSku = useCallback((targetItem: PendingReceivedItem, value: string) => {
        const cleanSku = value.toUpperCase().trim();

        setExtraItems(prev => prev.map(item => {
            if (item !== targetItem) return item;

            const match = catalogProductsOptions.find(
                p => p.supplierSku.toUpperCase().trim() === cleanSku
            );

            return {
                ...item,
                supplierSku: cleanSku,
                productName: match ? match.productName : item.productName,
                unitPrice: match ? match.unitPrice : item.unitPrice,
            };
        }));
    }, [catalogProductsOptions]);

    const updateExtraItemName = useCallback((targetItem: PendingReceivedItem, name: string) => {
        setExtraItems(prev => prev.map(item =>
            item === targetItem ? { ...item, productName: name } : item
        ));
    }, []);

    // 📊 Métricas en Tiempo Real
    const activeReceiptStats = useMemo(() => {
        const allItems = [...pendingItems, ...extraItems];
        const activeItems = allItems.filter(i => i.additionalQuantity > 0);

        const totalUnits = activeItems.reduce((sum, i) => sum + i.additionalQuantity, 0);
        const totalValue = activeItems.reduce((sum, i) => sum + (i.additionalQuantity * (i.unitPrice || 0)), 0);
        const extraCount = extraItems.filter(i => i.additionalQuantity > 0).length;

        return {
            totalUnits,
            totalValue,
            activeCount: activeItems.length,
            extraCount
        };
    }, [pendingItems, extraItems]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const allItems = [...pendingItems, ...extraItems];
        const itemsToSend = allItems.filter(item => item.additionalQuantity > 0);

        if (itemsToSend.length === 0) {
            alert('Debe ingresar al menos una cantidad a recibir.');
            return;
        }

        const invalidItems = itemsToSend.filter(item => !item.supplierSku || item.supplierSku.trim() === '');
        if (invalidItems.length > 0) {
            alert('Todos los productos a recibir deben contar con un SKU de proveedor válido.');
            return;
        }

        const itemsWithoutPrice = itemsToSend.filter(item => (!item.unitPrice || item.unitPrice <= 0));
        if (itemsWithoutPrice.length > 0) {
            alert('Todos los productos a recibir deben tener un precio unitario mayor a cero.');
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

    // Filtrado por pestaña + Búsqueda y Ordenamiento
    const processedPendingItems = useMemo(() => {
        const query = itemSearchQuery.toLowerCase().trim();
        let result = pendingItems;

        // Filtro de pestañas
        if (tabFilter === 'filled') {
            result = result.filter(i => i.additionalQuantity > 0);
        } else if (tabFilter === 'pending') {
            result = result.filter(i => i.additionalQuantity === 0);
        }

        // Búsqueda por texto
        if (query) {
            result = result.filter(i =>
                i.supplierSku.toLowerCase().includes(query) ||
                i.productName.toLowerCase().includes(query)
            );
        }

        // Ordenamiento
        return [...result].sort((a, b) => {
            let comparison = 0;
            if (sortBy === 'sku') comparison = a.supplierSku.localeCompare(b.supplierSku);
            else if (sortBy === 'name') comparison = (a.productName || '').localeCompare(b.productName || '');
            else if (sortBy === 'pending') comparison = a.pendingQuantity - b.pendingQuantity;
            else if (sortBy === 'price') comparison = (a.unitPrice || 0) - (b.unitPrice || 0);

            return sortDirection === 'asc' ? comparison : -comparison;
        });
    }, [pendingItems, tabFilter, itemSearchQuery, sortBy, sortDirection]);

    const getTitle = () => isContinue ? "📦 Continuar Recepción de Mercadería" : "📦 Recibir Mercadería";
    const getSubtitle = () => isContinue
        ? "Complete los faltantes de entregas previas para esta orden de compra."
        : "Ingrese la cantidad física ingresada por cada producto de la orden.";

    if (isLoading && !selectedOrder) {
        return <div className="text-center py-16 animate-pulse text-gray-500 font-bold text-lg">Cargando pedido...</div>;
    }

    if (!selectedOrder) {
        return <div className="text-center py-16 text-gray-500 font-bold text-lg">Pedido no encontrado</div>;
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
        <div className="max-w-5xl mx-auto p-4 md:p-8 pb-40 md:pb-36 relative">
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-1">{getTitle()}</h1>
            <p className="text-gray-500 mb-6 font-medium text-sm md:text-base">{getSubtitle()}</p>

            <DeliveryHeader
                selectedOrder={selectedOrder}
                completionPercentage={completionPercentage}
                totalValue={selectedOrder.totalAmount}
            />

            {/* BARRA RESUMEN EN TIEMPO REAL */}
            <div className="bg-gradient-to-r from-gray-900 via-indigo-950 to-gray-900 text-white rounded-3xl p-5 md:p-6 mb-6 shadow-xl border border-gray-800">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300 bg-indigo-900/60 px-2.5 py-1 rounded-md border border-indigo-700/50">
                            Resumen de la Entrega en Curso
                        </span>
                        <h3 className="text-xl font-black text-white mt-2 flex items-center gap-2">
                            <span>🚚</span> {activeReceiptStats.totalUnits} Unidades a Ingresar
                        </h3>
                    </div>

                    <div className="grid grid-cols-3 gap-3 md:gap-6 bg-white/10 p-3 rounded-2xl backdrop-blur-md border border-white/10 text-center">
                        <div>
                            <div className="text-lg md:text-xl font-black text-emerald-400">{activeReceiptStats.activeCount}</div>
                            <div className="text-[9px] font-bold uppercase tracking-wider text-gray-300">Líneas SKU</div>
                        </div>
                        <div>
                            <div className="text-lg md:text-xl font-black text-indigo-300">{activeReceiptStats.extraCount}</div>
                            <div className="text-[9px] font-bold uppercase tracking-wider text-gray-300">Extras</div>
                        </div>
                        <div>
                            <div className="text-lg md:text-xl font-black text-yellow-400">\${activeReceiptStats.totalValue.toLocaleString('es-AR')}</div>
                            <div className="text-[9px] font-bold uppercase tracking-wider text-gray-300">Monto Total</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* BANNER DE TIP DE NAVEGACIÓN ÁGIL POR TECLADO */}
            <div className="bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-2xl p-3.5 mb-6 text-xs font-bold flex items-center gap-2.5 shadow-xs">
                <span className="text-base">💡</span>
                <span>
                    <strong>Carga ultrarrápida:</strong> Al ingresar el SKU en un ítem extra, el foco salta automáticamente a la cantidad. Presiona <kbd className="bg-white px-1.5 py-0.5 rounded border border-indigo-300 font-mono text-[10px] shadow-2xs">Enter</kbd> en la cantidad para agregar el siguiente extra al instante.
                </span>
            </div>

            <form id="receipt-form" onSubmit={handleSubmit} className="space-y-6">
                {/* DATOS GENERALES */}
                <div className="bg-white rounded-3xl shadow-sm p-6 border border-gray-100">
                    <h2 className="text-lg font-black text-gray-800 mb-5 flex items-center gap-2">
                        <span className="text-2xl">📝</span> Datos del Comprobante
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-gray-700 text-xs font-black mb-2 uppercase tracking-wide">
                                Fecha y Hora de Entrega <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="datetime-local"
                                value={formData.deliveryDate}
                                onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold outline-none transition-all text-gray-800"
                                required
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-gray-700 text-xs font-black mb-2 uppercase tracking-wide">
                                Observaciones / Notas de la Entrega
                            </label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder={isContinue ? "Ej: Entrega complementaria de faltantes..." : "Ej: Remito parcial N° 1234, caja dañada en transporte, etc."}
                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-sm text-gray-800"
                                rows={2}
                            />
                        </div>
                    </div>
                </div>

                {/* SECCIÓN SUPERIOR PARA EXTRAS (UBICADA ARRIBA) */}
                <div ref={extrasSectionRef} className="bg-white rounded-3xl shadow-sm p-6 border border-gray-100">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-3">
                        <div>
                            <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                                <span>➕</span> Productos Extras Fuera de Orden
                            </h2>
                            <p className="text-xs text-gray-500 font-medium mt-0.5">
                                Agregue ítems recibidos que no figuraban originalmente en la Orden de Compra.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={addExtraItem}
                            className="flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-md transition-all active:scale-98 cursor-pointer"
                        >
                            <span className="text-base leading-none">➕</span>
                            <span>Agregar Producto Extra</span>
                        </button>
                    </div>

                    {extraItems.length > 0 ? (
                        <div className="space-y-3 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/80">
                            {extraItems.map((item, index) => (
                                <PendingItemCard
                                    key={`extra-${index}`}
                                    item={item}
                                    catalogProducts={catalogProductsOptions}
                                    isExtraItem={true}
                                    autoFocusSku={lastAddedIndex === index}
                                    onUpdateQuantity={updateAdditionalQuantity}
                                    onUpdateUnitPrice={updateUnitPrice}
                                    onUpdateExtraSku={updateExtraItemSku}
                                    onUpdateExtraName={updateExtraItemName}
                                    onRemoveExtra={removeExtraItem}
                                    onAddAnotherExtra={addExtraItem}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-5 px-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-xs font-bold text-gray-400">
                            No hay productos extras cargados. Haga clic en <strong className="text-indigo-600">"Agregar Producto Extra"</strong> si recibió mercadería no listada.
                        </div>
                    )}
                </div>

                {/* PRODUCTOS SOLICITADOS EN LA ORDEN */}
                <div className="bg-white rounded-3xl shadow-sm p-6 border border-gray-100">
                    <div className="flex flex-col md:flex-row justify-between md:items-center mb-5 gap-4 border-b border-gray-100 pb-4">
                        <div>
                            <h2 className="text-lg font-black text-gray-900">
                                {isContinue ? '📦 Productos Pendientes de Entrega' : '📦 Productos Solicitados en la Orden'}
                            </h2>
                            <p className="text-xs text-gray-500 font-medium">
                                Ingrese la cantidad física real que está recibiendo para cada producto solicitado.
                            </p>
                        </div>

                        {/* ACCIONES MASIVAS */}
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={fillAllPending}
                                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                title="Marcar todas las cantidades pendientes como recibidas"
                            >
                                <span>✨</span>
                                <span>Recibir Todo</span>
                            </button>
                            <button
                                type="button"
                                onClick={resetAllQuantities}
                                className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl border border-gray-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                title="Resetear todas las cantidades a recibir a 0"
                            >
                                <span>🔄</span>
                                <span>Resetear (0)</span>
                            </button>
                        </div>
                    </div>

                    {/* BARRA DE PESTAÑAS (FILTRO DE ESTADO) */}
                    {pendingItems.length > 0 && (
                        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-2xl mb-4 w-fit text-xs font-bold">
                            <button
                                type="button"
                                onClick={() => setTabFilter('all')}
                                className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                                    tabFilter === 'all'
                                        ? 'bg-white text-gray-900 shadow-xs font-extrabold'
                                        : 'text-gray-500 hover:text-gray-900'
                                }`}
                            >
                                Todos ({pendingItems.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setTabFilter('filled')}
                                className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                                    tabFilter === 'filled'
                                        ? 'bg-white text-emerald-700 shadow-xs font-extrabold'
                                        : 'text-gray-500 hover:text-gray-900'
                                }`}
                            >
                                Cargados ({pendingItems.filter(i => i.additionalQuantity > 0).length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setTabFilter('pending')}
                                className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                                    tabFilter === 'pending'
                                        ? 'bg-white text-amber-700 shadow-xs font-extrabold'
                                        : 'text-gray-500 hover:text-gray-900'
                                }`}
                            >
                                Sin Ingresar ({pendingItems.filter(i => i.additionalQuantity === 0).length})
                            </button>
                        </div>
                    )}

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
                            {pendingItems.length === 0
                                ? '✅ ¡No hay productos pendientes por recibir en esta orden!'
                                : '🔍 No se encontraron productos coincidentes en este filtro.'}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {processedPendingItems.map((item, index) => (
                                <PendingItemCard
                                    key={item.supplierSku ? `${item.supplierSku}-${index}` : `item-${index}`}
                                    item={item}
                                    catalogProducts={catalogProductsOptions}
                                    isExtraItem={false}
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

            {/* BARRA INFERIOR FIJA */}
            <div className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-md border-t border-gray-200 p-4 md:p-5 z-40 shadow-2xl print:hidden">
                <div className="max-w-5xl mx-auto flex flex-col sm:flex-row gap-3 justify-between items-center">
                    <div className="hidden md:flex items-center gap-3 text-xs font-bold text-gray-600">
                        <span>Total un. a confirmar: <strong className="text-indigo-600 text-sm">{activeReceiptStats.totalUnits}</strong></span>
                        <span>•</span>
                        <span>Monto total: <strong className="text-emerald-600 text-sm">\${activeReceiptStats.totalValue.toLocaleString('es-AR')}</strong></span>
                    </div>

                    <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full sm:w-auto justify-end">
                        <button
                            type="button"
                            onClick={() => navigate('/purchase-orders')}
                            className="hidden sm:block px-5 py-3.5 bg-gray-100 text-gray-700 font-extrabold rounded-xl hover:bg-gray-200 transition-colors border border-gray-200 text-xs cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleReconcile}
                            className="flex-1 sm:flex-none px-5 py-3.5 bg-blue-50 text-blue-700 font-black rounded-xl hover:bg-blue-100 transition-colors border border-blue-200 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                            <span>📊</span>
                            <span>Ver Estado Actual</span>
                        </button>
                        <button
                            form="receipt-form"
                            type="submit"
                            disabled={isLoading || activeReceiptStats.totalUnits === 0}
                            className="flex-1 sm:flex-none px-8 py-3.5 bg-emerald-600 text-white font-black rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:bg-gray-300 transition-all shadow-lg active:scale-98 text-sm flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <span>{isLoading ? 'Procesando Remito...' : 'Confirmar Recepción de Mercadería'}</span>
                            <span>➔</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeliveryReceipt;