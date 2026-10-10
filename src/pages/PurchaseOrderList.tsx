// pages/PurchaseOrderList.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePurchaseOrderStore } from '../store/purchaseOrderStore';
import { supplierApi } from '../api/suppliers';

const statusColors: Record<string, string> = {
  PENDIENTE: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  PARCIAL: 'bg-blue-50 text-blue-700 border-blue-200',
  COMPLETADO: 'bg-green-50 text-green-700 border-green-200',
  CANCELADO: 'bg-red-50 text-red-700 border-red-200'
};

const PurchaseOrderList: React.FC = () => {
  const navigate = useNavigate();
  const { orders, isLoading, error, fetchOrders, deleteOrder, cancelOrder, forceCloseOrder } = usePurchaseOrderStore();
  
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
  const [orderToClose, setOrderToClose] = useState<{id: number, number: string} | null>(null);
  const [closingReason, setClosingReason] = useState('');

  // 🔥 ESTADO: Para el modal de la Nota de Pedido
  const [orderToPrint, setOrderToPrint] = useState<any | null>(null);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleDelete = async (e: React.MouseEvent, id: number, orderNumber: string) => {
    e.stopPropagation();
    if (window.confirm(`¿Estás seguro de eliminar físicamente el pedido ${orderNumber}?`)) {
      await deleteOrder(id);
    }
  };

  const handleCancel = async (e: React.MouseEvent, id: number, orderNumber: string) => {
    e.stopPropagation();
    if (window.confirm(`¿Deseas cancelar el pedido ${orderNumber}? Cambiará de estado pero mantendrá el historial.`)) {
      await cancelOrder(id);
    }
  };

  const openForceCloseModal = (e: React.MouseEvent, id: number, orderNumber: string) => {
    e.stopPropagation();
    setOrderToClose({ id, number: orderNumber });
    setClosingReason('');
    setIsClosingModalOpen(true);
  };

  const executeForceClose = async () => {
    if (!orderToClose) return;
    if (closingReason.trim() === '') {
      window.alert("Por favor ingresa un motivo para el cierre forzado.");
      return;
    }
    const success = await forceCloseOrder(orderToClose.id, closingReason);
    if (success) {
      setIsClosingModalOpen(false);
      setOrderToClose(null);
    }
  };

  const handleCardClick = (order: any) => {
    if (order.status === 'COMPLETADO' || order.status === 'CANCELADO') {
      navigate(`/purchase-orders/${order.id}/delivery?action=report`);
    } else {
      navigate(`/purchase-orders/${order.id}`);
    }
  };

  const handleOpenPrintModal = (e: React.MouseEvent, order: any) => {
    e.stopPropagation();
    setOrderToPrint(order);
  };

const shareViaWhatsApp = async () => {
    if (!orderToPrint) return;
    
    // 1. Armamos el texto inmediatamente (esto es súper rápido)
    let text = `*NUEVO PEDIDO - ${orderToPrint.orderNumber}*%0A`;
    text += `Fecha: ${new Date(orderToPrint.orderDate).toLocaleDateString('es-AR')}%0A`;
    text += `Proveedor: ${orderToPrint.supplierName}%0A%0A`;
    text += `*Detalle de mercadería:*%0A`;
    
    // 🔥 CORRECCIÓN APLICADA: Sin número de ítem. Orden: SKU -> Nombre -> Cantidad
    orderToPrint.items?.forEach((item: any) => {
      text += `▪️ [${item.sku}] ${item.productName} ➖ *${item.quantity} un.*%0A`;
    });
    
    text += `%0A_💡 Te enviaré el PDF formal a continuación._%0A¡Muchas gracias!`;

    // 2. ABRIMOS LA PESTAÑA PRIMERO (evita el bloqueo de pop-ups del navegador)
    const whatsappWindow = window.open('about:blank', '_blank');

    try {
      // 3. Vamos a buscar el teléfono real a la base de datos usando el ID del proveedor
      const supplier = await supplierApi.getById(orderToPrint.supplierId);
      const rawPhone = supplier?.phone || '';
      
      const phone = rawPhone.replace(/\D/g, ''); // Limpiamos espacios y símbolos

      if (!phone) {
        window.alert("⚠️ Este proveedor no tiene un número de teléfono guardado. Se abrirá WhatsApp para que elijas el contacto manualmente.");
      }

      // 4. Redirigimos la pestaña que abrimos hacia WhatsApp con o sin número
      if (whatsappWindow) {
        whatsappWindow.location.href = `https://wa.me/${phone}?text=${text}`;
      }
    } catch (error) {
      console.error("Error al obtener los datos del proveedor:", error);
      // Fallback de seguridad si falla la API
      if (whatsappWindow) {
        whatsappWindow.location.href = `https://wa.me/?text=${text}`;
      }
    }
  };

  const filteredOrders = useMemo(() => {
    const safeOrders = Array.isArray(orders) ? orders : [];
    return safeOrders.filter(order => {
      const matchesStatus = statusFilter === '' || order.status === statusFilter;
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = query === '' || 
        (order.supplierName && order.supplierName.toLowerCase().includes(query)) ||
        (order.orderNumber && order.orderNumber.toLowerCase().includes(query));

      return matchesStatus && matchesSearch;
    });
  }, [orders, statusFilter, searchQuery]);

  if (isLoading && (!orders || orders.length === 0)) {
    return (
      <div className="max-w-7xl mx-auto p-4 md:p-8 animate-pulse">
        <div className="flex justify-between items-center mb-8">
          <div className="h-10 bg-gray-200 rounded-xl w-1/3"></div>
          <div className="h-10 bg-gray-200 rounded-xl w-32"></div>
        </div>
        <div className="h-14 bg-gray-200 rounded-2xl w-full mb-8"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="bg-white rounded-3xl p-6 h-64 border border-gray-100 shadow-sm"></div>)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6 text-center">
        <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl inline-flex items-center gap-2 font-bold shadow-sm">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto p-4 md:p-8 pb-24 print:hidden">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">📦 Pedidos</h1>
            <p className="text-gray-500 mt-1 font-medium">Gestión de abastecimiento</p>
          </div>
          
          <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-3">
            <div className="relative w-full sm:w-72">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <input
                type="text"
                placeholder="Buscar proveedor o referencia..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all shadow-sm font-medium text-sm"
              />
            </div>

            <button 
              onClick={() => navigate('/purchase-orders/new')} 
              className="w-full sm:w-auto bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 rounded-xl transition-all shadow-md font-bold flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Nuevo Pedido
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 mb-8 overflow-x-auto custom-scrollbar">
          <div className="flex gap-2 min-w-max">
            {[
              { value: '', label: 'Todos los pedidos' }, 
              { value: 'PENDIENTE', label: 'Pendientes' }, 
              { value: 'PARCIAL', label: 'Parciales' }, 
              { value: 'COMPLETADO', label: 'Completados' },
              { value: 'CANCELADO', label: 'Cancelados' }
            ].map(opt => (
              <button 
                key={opt.value} 
                onClick={() => setStatusFilter(opt.value)} 
                className={`px-5 py-2 rounded-xl text-sm font-bold transition-all border ${
                  statusFilter === opt.value 
                    ? 'bg-gray-900 text-white border-gray-900 shadow-md' 
                    : 'bg-transparent text-gray-500 border-transparent hover:bg-gray-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200 shadow-sm">
            <div className="text-5xl mb-4">📭</div>
            <h3 className="text-xl font-black text-gray-800">No se encontraron pedidos</h3>
            <p className="text-gray-500 mt-2 font-medium">Prueba ajustando la búsqueda o los filtros.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredOrders.map((order) => {
              const dateStr = order.orderDate ? new Date(order.orderDate).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }) : 'S/F';
              const totalItems = order.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;
              const receivedItems = order.items?.reduce((sum: number, item: any) => sum + (item.quantityReceived || 0), 0) || 0;
              const progress = totalItems > 0 ? Math.round((receivedItems / totalItems) * 100) : 0;
              
              const isCompleted = order.status === 'COMPLETADO' || order.status === 'CANCELADO';

              return (
                <div 
                  key={order.id} 
                  onClick={() => handleCardClick(order)}
                  title={isCompleted ? "Ver reporte de auditoría" : "Abrir pedido"}
                  className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all cursor-pointer flex flex-col h-full relative overflow-hidden group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusColors[order.status]}`}>
                      {order.status}
                    </span>
                    <span className="text-gray-400 text-xs font-bold bg-gray-50 px-2 py-1 rounded-md">{dateStr}</span>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-black text-gray-900 leading-tight mb-1 line-clamp-1" title={order.supplierName}>
                      {order.supplierName}
                    </h3>
                    <code className="text-xs font-bold text-gray-400 mb-6 block bg-gray-50 w-max px-2 py-0.5 rounded">Ref: {order.orderNumber}</code>
                  </div>
                  
                  <div className="mt-auto">
                    <div className="flex justify-between items-end mb-2">
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">Total</p>
                        <p className="text-2xl font-black text-gray-800 leading-none">${order.totalAmount?.toLocaleString('es-AR') || '0'}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-black ${progress === 100 ? 'text-green-600' : 'text-blue-600'}`}>{progress}%</p>
                      </div>
                    </div>
                    
                    <div className="w-full bg-gray-100 rounded-full h-1.5 mb-5">
                      <div className={`h-1.5 rounded-full ${progress === 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }}></div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-50">
                      
                      {/* 🔥 Ocultamos el botón Nota si está COMPLETADO/CANCELADO */}
                      {!isCompleted && (
                        <button 
                          onClick={(e) => handleOpenPrintModal(e, order)}
                          className="px-4 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-100 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 shadow-sm"
                          title="Ver o Imprimir Nota de Pedido original"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                          Nota
                        </button>
                      )}

                      {/* Botones si el pedido está abierto */}
                      {(order.status === 'PENDIENTE' || order.status === 'PARCIAL') && (
                        <>
                          <button 
                            onClick={(e) => { e.stopPropagation(); navigate(`/purchase-orders/${order.id}/delivery${order.status === 'PARCIAL' ? '?continue=true' : ''}`); }}
                            className="flex-1 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white px-3 py-2.5 rounded-xl text-sm font-bold transition-colors text-center shadow-sm"
                          >
                            📦 {order.status === 'PARCIAL' ? 'Continuar' : 'Recibir'}
                          </button>
                          
                          {order.status === 'PARCIAL' && (
                            <button 
                              onClick={(e) => openForceCloseModal(e, order.id, order.orderNumber)}
                              className="flex-1 bg-orange-50 hover:bg-orange-500 text-orange-700 hover:text-white px-3 py-2.5 rounded-xl text-sm font-bold transition-colors text-center shadow-sm"
                              title="Cerrar pedido sin recibir lo que falta"
                            >
                              🔒 Cerrar
                            </button>
                          )}

                          <button 
                            onClick={(e) => { e.stopPropagation(); navigate(`/purchase-orders/${order.id}/edit`); }}
                            className="px-3 bg-gray-50 hover:bg-gray-200 text-gray-700 border border-gray-100 py-2.5 rounded-xl text-sm font-bold transition-colors"
                            title="Editar pedido"
                          >
                            ✏️
                          </button>
                        </>
                      )}

                      {/* Botón único si el pedido está completado/cancelado */}
                      {isCompleted && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleCardClick(order); }}
                          className="w-full bg-green-50 hover:bg-green-600 text-green-700 hover:text-white px-3 py-2.5 rounded-xl text-sm font-bold transition-colors text-center shadow-sm"
                        >
                          📊 Reporte Final
                        </button>
                      )}

                      {order.status === 'PENDIENTE' && (
                        <>
                          <button onClick={(e) => handleCancel(e, order.id, order.orderNumber)} className="px-3 border border-gray-200 text-gray-400 hover:bg-gray-100 hover:text-gray-700 rounded-xl transition-colors" title="Cancelar pedido">🚫</button>
                          <button onClick={(e) => handleDelete(e, order.id, order.orderNumber)} className="px-3 border border-red-100 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors" title="Eliminar pedido">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* MODAL DE CIERRE FORZADO (oculto en impresión) */}
        {isClosingModalOpen && orderToClose && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fadeIn">
              <div className="p-6 bg-orange-50 border-b border-orange-100">
                <h2 className="text-xl font-black text-orange-800 flex items-center gap-2">🔒 Cerrar Forzadamente</h2>
              </div>
              <div className="p-6">
                <p className="text-gray-600 text-sm mb-5 font-medium leading-relaxed">
                  Vas a dar por completado el pedido <strong className="text-gray-900 bg-gray-100 px-1 rounded">{orderToClose.number}</strong>. 
                  Los productos faltantes ya no se esperarán.
                </p>
                <label className="block text-sm font-black text-gray-700 mb-2 uppercase tracking-wide">Motivo del cierre *</label>
                <textarea 
                  value={closingReason} 
                  onChange={(e) => setClosingReason(e.target.value)} 
                  placeholder="Ej: Proveedor confirma que no tiene más stock..." 
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none mb-6 text-sm font-medium" 
                  rows={4} autoFocus 
                />
                <div className="flex gap-3">
                  <button onClick={() => setIsClosingModalOpen(false)} className="flex-1 bg-gray-100 text-gray-700 font-black py-3.5 rounded-xl hover:bg-gray-200 transition-colors">Cancelar</button>
                  <button onClick={executeForceClose} disabled={isLoading || !closingReason.trim()} className="flex-1 bg-orange-600 text-white font-black py-3.5 rounded-xl hover:bg-orange-700 disabled:opacity-50 transition-colors">
                    {isLoading ? 'Procesando...' : 'Confirmar Cierre'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL DE VISTA PREVIA DE NOTA DE PEDIDO */}
        {orderToPrint && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
              
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
                  📄 Vista Previa - Nota de Pedido
                </h2>
                <button onClick={() => setOrderToPrint(null)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-gray-100">
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 max-w-xl mx-auto">
                  <div className="border-b-2 border-gray-800 pb-4 mb-6 flex justify-between items-end">
                    <div>
                      <h1 className="text-2xl font-black uppercase text-gray-900 tracking-tight">Orden de Compra</h1>
                      <p className="text-gray-500 font-medium">Ref: <span className="text-gray-900 font-bold">{orderToPrint.orderNumber}</span></p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-400 uppercase">Fecha Emisión</p>
                      <p className="font-bold text-gray-800">{new Date(orderToPrint.orderDate).toLocaleDateString('es-AR')}</p>
                    </div>
                  </div>

                  <div className="mb-8">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Proveedor</p>
                    <p className="text-lg font-black text-gray-800">{orderToPrint.supplierName}</p>
                  </div>

                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b-2 border-gray-200 text-gray-500">
                        {/* 🔥 Columna de enumeración añadida */}
                        <th className="pb-3 font-bold uppercase text-xs w-8">#</th>
                        <th className="pb-3 font-bold uppercase text-xs w-1/4">SKU</th>
                        <th className="pb-3 font-bold uppercase text-xs">Producto</th>
                        <th className="pb-3 font-bold uppercase text-xs text-center w-20">Cant.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {orderToPrint.items?.map((item: any, i: number) => (
                        <tr key={i} className="text-gray-800">
                          <td className="py-3 font-bold text-gray-400">{i + 1}</td>
                          <td className="py-3 font-mono text-xs font-bold text-gray-500">{item.sku}</td>
                          <td className="py-3 font-medium">{item.productName}</td>
                          <td className="py-3 font-black text-center text-indigo-600 bg-indigo-50/50 rounded-lg">{item.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  <div className="mt-8 pt-4 border-t border-gray-100 flex justify-end">
                    {/* 🔥 Conteo de SKUs e Ítems Totales añadidos */}
                    <div className="flex gap-6 items-center">
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Ítems Distintos (SKUs)</span>
                        <span className="text-lg font-black text-gray-700">{orderToPrint.items?.length || 0}</span>
                      </div>
                      <div className="border-l border-gray-200 pl-6 text-right">
                        <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Total Unidades Solicitadas</span>
                        <span className="text-2xl font-black text-gray-900 bg-gray-100 px-3 py-1 rounded-lg">
                          {orderToPrint.items?.reduce((sum: number, i: any) => sum + i.quantity, 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 border-t border-gray-100 bg-white flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={() => window.print()}
                  className="flex-1 bg-gray-900 hover:bg-black text-white py-3.5 rounded-xl font-black transition-colors flex justify-center items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                  Imprimir PDF
                </button>
                <button 
                  onClick={shareViaWhatsApp}
                  className="flex-1 bg-[#25D366] hover:bg-[#1DA851] text-white py-3.5 rounded-xl font-black transition-colors flex justify-center items-center gap-2 shadow-lg shadow-green-200"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                  Enviar por WhatsApp
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* DOCUMENTO EXCLUSIVO PARA IMPRESIÓN */}
      {orderToPrint && (
        <div className="hidden print:block w-full bg-white text-black p-8 font-sans">
          <div className="border-b-4 border-gray-900 pb-4 mb-8 flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-black uppercase tracking-tighter">Nota de Pedido</h1>
              <p className="text-xl mt-1 text-gray-600">Ref: <span className="font-bold text-black">{orderToPrint.orderNumber}</span></p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold uppercase text-gray-500">Fecha de Emisión</p>
              <p className="text-xl font-bold">{new Date(orderToPrint.orderDate).toLocaleDateString('es-AR')}</p>
            </div>
          </div>

          <div className="mb-10 p-4 border-2 border-gray-200 rounded-lg bg-gray-50">
            <p className="text-sm font-bold uppercase text-gray-500 mb-1">Datos del Proveedor</p>
            <p className="text-2xl font-black">{orderToPrint.supplierName}</p>
          </div>

          <table className="w-full text-left mb-8 border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-900">
                {/* 🔥 Enumeración también en impresión */}
                <th className="py-3 px-2 font-bold uppercase text-sm w-12 text-gray-400">#</th>
                <th className="py-3 px-2 font-bold uppercase text-sm w-1/4">SKU Proveedor</th>
                <th className="py-3 px-2 font-bold uppercase text-sm">Descripción del Producto</th>
                <th className="py-3 px-2 font-bold uppercase text-sm text-center w-24">Cantidad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orderToPrint.items?.map((item: any, i: number) => (
                <tr key={i}>
                  <td className="py-4 px-2 font-bold text-gray-400">{i + 1}</td>
                  <td className="py-4 px-2 font-mono text-sm font-bold text-gray-600">{item.sku}</td>
                  <td className="py-4 px-2 font-medium text-lg">{item.productName}</td>
                  <td className="py-4 px-2 font-black text-xl text-center">{item.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t-2 border-gray-900 pt-4 flex justify-end">
            {/* 🔥 Conteo detallado en la hoja de impresión */}
            <div className="flex gap-8 items-center bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="text-right">
                <span className="text-xs font-bold uppercase text-gray-500 block mb-1">Ítems Distintos (SKUs)</span>
                <span className="text-2xl font-bold text-gray-700">
                  {orderToPrint.items?.length || 0}
                </span>
              </div>
              <div className="border-l-2 border-gray-300 pl-8 text-right">
                <span className="text-xs font-bold uppercase text-gray-500 block mb-1">Total Unidades Solicitadas</span>
                <span className="text-3xl font-black text-black">
                  {orderToPrint.items?.reduce((sum: number, i: any) => sum + i.quantity, 0)}
                </span>
              </div>
            </div>
          </div>
          
          <div className="mt-16 text-center text-sm font-bold text-gray-400">
            Documento generado automáticamente por el Sistema de Gestión
          </div>
        </div>
      )}
    </>
  );
};

export default PurchaseOrderList;