// pages/PurchaseOrderForm.tsx
import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePurchaseOrderStore } from '../store/purchaseOrderStore';
import { supplierApi } from '../api/suppliers';
import { productApi } from '../api/products';
import QuickProductModal from '../components/QuickProductModal';
import type { SupplierSummary } from '../api/suppliers';
import type { PurchaseOrderRequest, PurchaseOrderItemRequest } from '../types/purchaseOrder';

type SortField = 'supplierSku' | 'productName' | 'quantity' | 'unitPrice';

const PurchaseOrderForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id && id !== 'new';
  const { selectedOrder, fetchOrderById, createOrder, updateOrder, isLoading } = usePurchaseOrderStore();

  const [suppliers, setSuppliers] = useState<SupplierSummary[]>([]);
  const [isValidatingSku, setIsValidatingSku] = useState(false);
  const [showQuickProductModal, setShowQuickProductModal] = useState(false);
  const [pendingSupplierSku, setPendingSupplierSku] = useState('');
  const [pendingNewItem, setPendingNewItem] = useState<PurchaseOrderItemRequest | null>(null);

  // 🔥 MODO METRALLETA: Para pistolas de código de barras
  const [fastScanMode, setFastScanMode] = useState(false);
  const [newNote, setNewNote] = useState('');

  // 🔥 ESTADOS: Ordenamiento y Filtro UX
  const [sortConfig, setSortConfig] = useState<{ field: SortField; direction: 'asc' | 'desc' } | null>(null);
  const [itemSearchQuery, setItemSearchQuery] = useState('');

  // Referencias para manejo de focos automáticos
  const skuInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<PurchaseOrderRequest>({
    supplierId: 1,
    orderDate: new Date().toISOString().slice(0, 16),
    expectedDeliveryDate: '',
    notes: '',
    items: []
  });

  const [newItem, setNewItem] = useState<PurchaseOrderItemRequest>({
    supplierSku: '',
    productName: '',
    quantity: 1,
    unitPrice: 0
  });

  // Envuelto en useCallback para evitar warnings en el arreglo de dependencias del useEffect
  const loadSuppliers = useCallback(async () => {
    try {
      const sups = await supplierApi.getAllSummary();
      setSuppliers(sups || []);
      if (sups && sups.length > 0 && !isEditMode) {
        setFormData(prev => ({ ...prev, supplierId: sups[0].id }));
      }
    } catch (error) { 
      console.error('Error loading suppliers:', error); 
    }
  }, [isEditMode]);

  useEffect(() => {
    loadSuppliers();
    if (isEditMode && id) {
      fetchOrderById(parseInt(id));
    }
  }, [isEditMode, id, fetchOrderById, loadSuppliers]);

  useEffect(() => {
    if (isEditMode && selectedOrder) {
      setFormData({
        supplierId: selectedOrder.supplierId,
        orderDate: selectedOrder.orderDate.slice(0, 16),
        expectedDeliveryDate: selectedOrder.expectedDeliveryDate?.slice(0, 16) || '',
        notes: selectedOrder.notes || '',
        items: selectedOrder.items.map(item => ({
          supplierSku: item.sku,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice
        }))
      });
    }
  }, [selectedOrder, isEditMode]);

  const handleValidateSku = async () => {
    const skuToSearch = newItem.supplierSku.trim().toUpperCase();
    if (!skuToSearch) return;

    const existingItemIndex = formData.items.findIndex(item => item.supplierSku === skuToSearch);
    if (existingItemIndex !== -1) {
      if (fastScanMode) {
        adjustItemQuantity(skuToSearch, 1);
        resetScanInput();
      } else {
        window.alert(`⚠️ El producto ya está en la lista. Ajusta la cantidad abajo.`);
        resetScanInput();
      }
      return;
    }

    setIsValidatingSku(true);
    try {
      const result = await productApi.getBySupplierSku(skuToSearch);
      const existingProduct = Array.isArray(result) ? result[0] : result;

      if (existingProduct && existingProduct.name) {
        const costPrice = existingProduct.costPrice || 0;

        if (fastScanMode) {
          setFormData(prev => ({
            ...prev,
            items: [...prev.items, { supplierSku: skuToSearch, productName: existingProduct.name, quantity: 1, unitPrice: costPrice }]
          }));
          resetScanInput();
        } else {
          setNewItem(prev => ({
            ...prev,
            productName: existingProduct.name,
            unitPrice: costPrice
          }));
          setTimeout(() => quantityInputRef.current?.focus(), 50);
        }
      }
    } catch (err: unknown) {
      const error = err as any; // Cast seguro para acceder a error.response
      if (error.response?.status === 404) {
        setPendingSupplierSku(skuToSearch);
        setPendingNewItem({ ...newItem, supplierSku: skuToSearch });
        setShowQuickProductModal(true);
      } else {
        window.alert('Error al verificar el producto en la base de datos.');
      }
    } finally {
      setIsValidatingSku(false);
    }
  };

  const resetScanInput = () => {
    setNewItem({ supplierSku: '', productName: '', quantity: 1, unitPrice: 0 });
    setTimeout(() => skuInputRef.current?.focus(), 50);
  };

  const handleSkuKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleValidateSku();
    }
  };

  const handleManualInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addOrUpdateItem();
    }
  };

  const handleProductCreated = (product: { supplierSku: string; name: string; productId: number }) => {
    if (pendingNewItem) {
      if (fastScanMode) {
        setFormData(prev => ({
          ...prev,
          items: [...prev.items, { supplierSku: product.supplierSku, productName: product.name, quantity: 1, unitPrice: 0 }]
        }));
        resetScanInput();
      } else {
        setNewItem({ ...pendingNewItem, productName: product.name, unitPrice: 0 });
        setTimeout(() => quantityInputRef.current?.focus(), 100);
      }
      setPendingNewItem(null);
    }
  };

  const addOrUpdateItem = () => {
    if (!newItem.supplierSku) { window.alert('El SKU del proveedor es obligatorio'); return; }
    if (newItem.quantity <= 0) { window.alert('La cantidad debe ser mayor a 0'); return; }
    if (newItem.unitPrice < 0) { window.alert('El precio unitario no puede ser negativo'); return; }

    setFormData(prev => {
      const exists = prev.items.some(item => item.supplierSku === newItem.supplierSku);
      if (exists) {
        // ✅ CORREGIDO: Evita mutar el array existente
        return {
          ...prev,
          items: prev.items.map(item => 
            item.supplierSku === newItem.supplierSku 
              ? { ...item, quantity: item.quantity + newItem.quantity } 
              : item
          )
        };
      }
      return { ...prev, items: [...prev.items, { ...newItem }] };
    });

    resetScanInput();
  };

  const adjustItemQuantity = (sku: string, delta: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.supplierSku === sku) {
          const newQty = item.quantity + delta;
          // ✅ CORREGIDO: Solo actualiza si es mayor a 0, inmutable
          return { ...item, quantity: newQty > 0 ? newQty : item.quantity };
        }
        return item;
      })
    }));
  };

  const updateItemQuantity = (sku: string, newQuantity: number) => {
    if (newQuantity <= 0) return;
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => item.supplierSku === sku ? { ...item, quantity: newQuantity } : item)
    }));
  };

  const removeItem = (sku: string) => {
    const item = formData.items.find(i => i.supplierSku === sku);
    if (item && window.confirm(`¿Eliminar "${item.productName}" del pedido?`)) {
      setFormData(prev => ({ ...prev, items: prev.items.filter(i => i.supplierSku !== sku) }));
    }
  };

  const handleSort = (field: SortField) => {
    setSortConfig(current => {
      if (current?.field === field) {
        return current.direction === 'asc' ? { field, direction: 'desc' } : null;
      }
      return { field, direction: 'asc' };
    });
  };

  // 🔥 COMPUTACIÓN OPTIMIZADA: Filtro y Ordenamiento 100% Type-Safe
  const filteredAndSortedItems = useMemo(() => {
    let result = [...formData.items];

    if (itemSearchQuery.trim()) {
      const query = itemSearchQuery.toLowerCase();
      result = result.filter(item => 
        (item.supplierSku || '').toLowerCase().includes(query) || 
        (item.productName || '').toLowerCase().includes(query)
      );
    }

    if (sortConfig) {
      const { field, direction } = sortConfig;
      result.sort((a, b) => {
        // Uso de any localizado para evadir el error estricto de índices dinámicos en TS
        const valA = (a as any)[field] ?? '';
        const valB = (b as any)[field] ?? '';
        
        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [formData.items, sortConfig, itemSearchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.items.length === 0) {
      window.alert('Debe agregar al menos un producto al pedido');
      return;
    }

    let finalNotes = formData.notes;
    if (newNote.trim() !== '') {
      if (isEditMode) {
        const dateStr = new Date().toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        finalNotes = formData.notes ? `${formData.notes}\n[${dateStr}] ${newNote.trim()}` : `[${dateStr}] ${newNote.trim()}`;
      } else {
        finalNotes = newNote.trim();
      }
    }

    const payloadToSubmit = { ...formData, notes: finalNotes };

    try {
      const success = isEditMode && id ? await updateOrder(parseInt(id), payloadToSubmit) : await createOrder(payloadToSubmit);
      if (success) navigate('/purchase-orders');
    } catch (error) {
      console.error('Error saving order:', error);
    }
  };

  const totalAmount = formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const totalQuantity = formData.items.reduce((sum, item) => sum + item.quantity, 0);

  if (isLoading && isEditMode) {
    return <div className="text-center py-12 animate-pulse text-gray-500 font-bold">Cargando pedido...</div>;
  }

  const isNameLocked = formData.items.some(item => item.supplierSku === newItem.supplierSku) ||
    (newItem.productName !== '' && newItem.productName === pendingNewItem?.productName);

  const isPriceLocked = formData.items.some(item => item.supplierSku === newItem.supplierSku);

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 pb-48 md:pb-32 bg-gray-50 min-h-screen">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate('/purchase-orders')} className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </button>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">
          {isEditMode ? 'Editar Pedido' : 'Nuevo Pedido'}
        </h1>
      </div>

      <form id="po-form" onSubmit={handleSubmit} className="space-y-6">

        {/* BLOQUE 1: Información básica */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
          <h2 className="text-lg font-black text-gray-800 mb-5 flex items-center gap-2">
            <span className="text-2xl">📋</span> Datos del Proveedor
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-gray-700 text-xs font-bold mb-2 uppercase tracking-wide">Proveedor *</label>
              <select
                value={formData.supplierId}
                onChange={(e) => setFormData({ ...formData, supplierId: parseInt(e.target.value) })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium outline-none transition-all"
                required
              >
                {suppliers.map(sup => <option key={sup.id} value={sup.id}>{sup.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-gray-700 text-xs font-bold mb-2 uppercase tracking-wide">Fecha Emisión *</label>
              <input
                type="datetime-local"
                value={formData.orderDate}
                onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 text-xs font-bold mb-2 uppercase tracking-wide">Fecha Esperada (Opcional)</label>
              <input
                type="datetime-local"
                value={formData.expectedDeliveryDate}
                onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium outline-none transition-all"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-gray-700 text-xs font-bold mb-2 uppercase tracking-wide">Notas Internas</label>

              {isEditMode && formData.notes && (
                <div className="mb-3 p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono text-gray-600 max-h-40 overflow-y-auto whitespace-pre-wrap">
                  <span className="font-bold text-gray-800 block mb-2 border-b border-gray-200 pb-1 font-sans">📜 Historial de Notas:</span>
                  {formData.notes}
                </div>
              )}

              <textarea
                value={newNote}
                onChange={(e) => setNewItem(prev => { setNewNote(e.target.value); return prev; })}
                placeholder={isEditMode ? "Escribe una nueva nota para agregar al historial..." : "Ej: Avisar al transporte 1 hora antes..."}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium outline-none transition-all"
                rows={isEditMode ? 2 : 3}
              />
              {isEditMode && <p className="text-xs text-gray-400 mt-1">💡 La nota se guardará con la fecha y hora actual automáticamente.</p>}
            </div>
          </div>
        </div>

        {/* BLOQUE 2: Carga rápida de items */}
        <div className="bg-indigo-50/50 rounded-3xl border border-indigo-100 p-6 md:p-8 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-5 gap-3">
            <h2 className="text-lg font-black text-indigo-900 flex items-center gap-2">
              <span className="text-2xl">🔫</span> Carga de Productos
            </h2>

            <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-xl border border-indigo-200 shadow-sm w-fit">
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={fastScanMode} onChange={() => {
                  setFastScanMode(!fastScanMode);
                  setTimeout(() => skuInputRef.current?.focus(), 100);
                }} />
                <div className={`block w-10 h-6 rounded-full transition-colors ${fastScanMode ? 'bg-indigo-600' : 'bg-gray-300'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${fastScanMode ? 'transform translate-x-4' : ''}`}></div>
              </div>
              <span className="text-xs font-bold uppercase text-indigo-900">Modo Rápido</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-3">
              <label className="block text-indigo-800 text-xs font-bold mb-1 ml-1 uppercase">SKU Proveedor</label>
              <div className="relative">
                <input
                  ref={skuInputRef}
                  type="text"
                  placeholder="Escanea o escribe..."
                  value={newItem.supplierSku}
                  onChange={(e) => setNewItem({ ...newItem, supplierSku: e.target.value.toUpperCase() })}
                  onKeyDown={handleSkuKeyDown}
                  onBlur={!fastScanMode ? handleValidateSku : undefined}
                  className={`w-full px-4 py-3 border rounded-xl font-bold uppercase outline-none focus:ring-2 focus:ring-indigo-500 ${isValidatingSku ? 'bg-indigo-100 border-indigo-300' : 'bg-white border-gray-200'}`}
                  disabled={isValidatingSku}
                />
                {isValidatingSku && <span className="absolute right-3 top-3 animate-spin">⏳</span>}
              </div>
            </div>

            {!fastScanMode && (
              <>
                <div className="md:col-span-4">
                  <label className="block text-gray-500 text-xs font-bold mb-1 ml-1 uppercase">Nombre del Producto</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Se autocompletará..."
                      value={newItem.productName}
                      onChange={(e) => setNewItem({ ...newItem, productName: e.target.value })}
                      className={`w-full px-4 py-3 border rounded-xl font-medium outline-none ${isNameLocked ? 'bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed' : 'bg-white border-gray-200 focus:ring-2 focus:ring-indigo-500'}`}
                      readOnly={isNameLocked}
                    />
                    {isNameLocked && <span className="absolute right-3 top-3 text-gray-400">🔒</span>}
                  </div>
                </div>

                <div className="md:col-span-3 flex gap-2">
                  <div className="w-1/3">
                    <label className="block text-gray-500 text-xs font-bold mb-1 ml-1 uppercase">Cant.</label>
                    <input
                      ref={quantityInputRef}
                      type="number"
                      value={newItem.quantity}
                      onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 0 })}
                      onKeyDown={handleManualInputKeyDown}
                      className="w-full px-2 py-3 bg-white border border-gray-200 rounded-xl font-black text-center outline-none focus:ring-2 focus:ring-indigo-500"
                      min="1"
                    />
                  </div>
                  <div className="w-2/3">
                    <label className="block text-gray-500 text-xs font-bold mb-1 ml-1 uppercase">Costo Un.</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                      <input
                        type="number"
                        value={newItem.unitPrice || ''}
                        onChange={(e) => setNewItem({ ...newItem, unitPrice: parseFloat(e.target.value) || 0 })}
                        onKeyDown={handleManualInputKeyDown}
                        className={`w-full pl-7 pr-3 py-3 border rounded-xl font-bold text-right outline-none ${isPriceLocked ? 'bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed' : 'bg-white border-gray-200 focus:ring-2 focus:ring-indigo-500'}`}
                        step="0.01"
                        min="0"
                        readOnly={isPriceLocked}
                      />
                      {isPriceLocked && <span className="absolute right-3 top-3 text-gray-400">🔒</span>}
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 mt-4 md:mt-0">
                  <button
                    type="button"
                    onClick={addOrUpdateItem}
                    disabled={isValidatingSku || !newItem.supplierSku}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-black py-3 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                    <span className="hidden lg:inline">Agregar</span>
                  </button>
                </div>
              </>
            )}

            {fastScanMode && (
              <div className="md:col-span-9 flex items-center h-full pb-1">
                <p className="text-sm text-indigo-700 font-bold bg-indigo-100 px-4 py-3 rounded-xl w-full border border-indigo-200">
                  ⚡ Modo Escáner activo: Escribe el SKU del proveedor y presiona "Enter" para agregar directamente a la lista inferior.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* BLOQUE 3: Lista de Productos Agregados */}
        {formData.items.length > 0 && (
          <div className="space-y-4">
            
            {/* Cabecera de la lista con controles */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 ml-2">
              <h2 className="text-lg font-black text-gray-800 flex items-center gap-2 whitespace-nowrap">
                <span>🛍️ Productos ({formData.items.length})</span>
              </h2>

              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto items-start sm:items-center">
                <div className="relative w-full sm:w-64">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                  <input 
                    type="text" 
                    placeholder="Buscar en el pedido..." 
                    value={itemSearchQuery}
                    onChange={(e) => setItemSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div className="flex flex-wrap gap-2 text-xs font-bold bg-white p-1 rounded-xl border border-gray-200">
                  <span className="text-gray-400 py-1.5 px-2 uppercase">Ordenar:</span>
                  {(['supplierSku', 'productName', 'quantity', 'unitPrice'] as SortField[]).map(field => (
                    <button
                      key={field}
                      type="button"
                      onClick={() => handleSort(field)}
                      className={`px-3 py-1.5 rounded-lg transition-colors ${
                        sortConfig?.field === field 
                          ? 'bg-indigo-100 text-indigo-700' 
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {field === 'supplierSku' ? 'SKU' : field === 'productName' ? 'Nombre' : field === 'quantity' ? 'Cant.' : 'Precio'}
                      {sortConfig?.field === field && (sortConfig.direction === 'asc' ? ' ↑' : ' ↓')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {filteredAndSortedItems.length === 0 ? (
              <div className="text-center py-10 text-gray-500 font-bold bg-white rounded-3xl border border-dashed border-gray-300">
                No se encontraron productos que coincidan con tu búsqueda.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
                {filteredAndSortedItems.map((item, index) => (
                  <div key={item.supplierSku} className="bg-white p-4 lg:p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col lg:flex-row lg:items-center gap-4 group hover:border-indigo-200 transition-colors relative overflow-hidden">
                    
                    <div className="absolute top-0 right-0 bg-gray-50 text-gray-400 text-[10px] font-black px-2 py-1 rounded-bl-lg border-l border-b border-gray-100">
                      #{index + 1}
                    </div>

                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-500"></div>

                    <div className="flex-1 pl-2 pr-6">
                      <div className="flex justify-between items-start lg:hidden mb-2">
                        <span className="text-[10px] bg-gray-100 text-gray-600 font-black uppercase px-2 py-1 rounded">{item.supplierSku}</span>
                        <button type="button" onClick={() => removeItem(item.supplierSku)} className="text-red-400 hover:text-red-600 p-1.5 bg-red-50 rounded-lg">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                      <span className="hidden lg:inline-block text-[10px] bg-gray-100 text-gray-600 font-black uppercase px-2 py-1 rounded mb-1">{item.supplierSku}</span>
                      <h4 className="font-bold text-gray-900 leading-tight">{item.productName}</h4>
                    </div>

                    <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-xl border border-gray-100 w-fit self-start lg:self-auto z-10">
                      <button type="button" onClick={() => adjustItemQuantity(item.supplierSku, -1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg border border-gray-200 text-gray-600 font-bold hover:bg-gray-100 shadow-sm">-</button>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItemQuantity(item.supplierSku, parseInt(e.target.value) || 0)}
                        className="w-12 bg-transparent font-black text-center text-xl outline-none text-indigo-700"
                        min="1"
                      />
                      <button type="button" onClick={() => adjustItemQuantity(item.supplierSku, 1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg border border-gray-200 text-gray-600 font-bold hover:bg-gray-100 shadow-sm">+</button>
                    </div>

                    <div className="flex justify-between lg:w-48 items-center border-t lg:border-t-0 pt-3 lg:pt-0 mt-1 lg:mt-0 border-gray-100">
                      <div className="text-left lg:text-right w-1/2">
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Costo Un.</p>
                        <p className="font-medium text-gray-600">${item.unitPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div className="text-right w-1/2">
                        <p className="text-[10px] text-indigo-400 font-bold uppercase">Subtotal</p>
                        <p className="font-black text-indigo-700 text-lg">\${(item.quantity * item.unitPrice).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>

                    <button type="button" onClick={() => removeItem(item.supplierSku)} className="hidden lg:flex w-10 h-10 items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors z-10">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>

                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </form>

      {/* BLOQUE 4: FOOTER FLOTANTE */}
      <div className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-md border-t border-gray-200 p-4 md:p-6 z-40 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">

          <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-start">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Inversión Estimada</p>
              <p className="text-3xl font-black text-green-600 leading-none">${totalAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
            </div>
            
            <div className="bg-gray-100 px-4 py-2 rounded-xl text-center hidden sm:flex gap-4 border border-gray-200">
              <div>
                <span className="block text-[10px] font-bold text-gray-400 uppercase">SKUs Distintos</span>
                <span className="font-black text-gray-700 text-lg leading-none">{formData.items.length}</span>
              </div>
              <div className="border-l border-gray-300 pl-4">
                <span className="block text-[10px] font-bold text-gray-400 uppercase">Total Unidades</span>
                <span className="font-black text-indigo-700 text-lg leading-none">{totalQuantity}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => navigate('/purchase-orders')}
              className="flex-1 sm:flex-none px-6 py-3.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors border border-gray-200"
            >
              Cancelar
            </button>
            <button
              form="po-form"
              type="submit"
              disabled={isLoading || formData.items.length === 0}
              className="flex-1 sm:flex-none px-8 py-3.5 bg-green-600 text-white font-black rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:bg-gray-300 transition-all shadow-lg shadow-green-200"
            >
              {isLoading ? 'Guardando...' : (isEditMode ? 'Actualizar Pedido' : 'Confirmar Pedido')}
            </button>
          </div>
        </div>
      </div>

      <QuickProductModal
        isOpen={showQuickProductModal}
        supplierSku={pendingSupplierSku}
        onClose={() => {
          setShowQuickProductModal(false);
          setPendingNewItem(null);
          setTimeout(() => skuInputRef.current?.focus(), 100);
        }}
        onProductCreated={handleProductCreated}
      />
    </div>
  );
};

export default PurchaseOrderForm;