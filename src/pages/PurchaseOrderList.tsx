// pages/PurchaseOrderList.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePurchaseOrderStore } from '../store/purchaseOrderStore';

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

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleDelete = async (e: React.MouseEvent, id: number, orderNumber: string) => {
    e.stopPropagation();
    if (confirm(`¿Estás seguro de eliminar físicamente el pedido ${orderNumber}?`)) {
      await deleteOrder(id);
    }
  };

  const handleCancel = async (e: React.MouseEvent, id: number, orderNumber: string) => {
    e.stopPropagation();
    if (confirm(`¿Deseas cancelar el pedido ${orderNumber}? Cambiará de estado pero mantendrá el historial.`)) {
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
      alert("Por favor ingresa un motivo para el cierre forzado.");
      return;
    }
    const success = await forceCloseOrder(orderToClose.id, closingReason);
    if (success) {
      setIsClosingModalOpen(false);
      setOrderToClose(null);
    }
  };

  // 🔥 CORE BUSINESS: Ruteo inteligente según el estado del documento
  const handleCardClick = (order: any) => {
    if (order.status === 'COMPLETADO' || order.status === 'CANCELADO') {
      // Un pedido cerrado es inmutable: mostramos el reporte de auditoría directamente
      navigate(`/purchase-orders/${order.id}/delivery?action=report`);
    } else {
      // Un pedido abierto va al formulario de edición por defecto
      navigate(`/purchase-orders/${order.id}`);
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
    <div className="max-w-7xl mx-auto p-4 md:p-8 pb-24">
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
            const totalItems = order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
            const receivedItems = order.items?.reduce((sum, item) => sum + (item.quantityReceived || 0), 0) || 0;
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
                          className="px-4 bg-gray-50 hover:bg-gray-200 text-gray-700 border border-gray-100 py-2.5 rounded-xl text-sm font-bold transition-colors"
                          title="Editar pedido"
                        >
                          ✏️ Editar
                        </button>
                      </>
                    )}

                    {/* Botón único si el pedido está completado/cancelado */}
                    {isCompleted && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleCardClick(order); }}
                        className="w-full bg-green-50 hover:bg-green-600 text-green-700 hover:text-white px-3 py-2.5 rounded-xl text-sm font-bold transition-colors text-center shadow-sm"
                      >
                        📊 Ver Reporte Final
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

      {/* MODAL DE CIERRE FORZADO */}
      {isClosingModalOpen && orderToClose && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fadeIn">
            <div className="p-6 bg-orange-50 border-b border-orange-100">
              <h2 className="text-xl font-black text-orange-800 flex items-center gap-2">🔒 Cerrar Forzadamente</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-600 text-sm mb-5 font-medium leading-relaxed">
                Vas a dar por completado el pedido <strong className="text-gray-900 bg-gray-100 px-1 rounded">{orderToClose.number}</strong>. 
                Los productos faltantes ya no se esperarán. Esta acción cierra el trámite administrativo y no puede deshacerse.
              </p>
              <label className="block text-sm font-black text-gray-700 mb-2 uppercase tracking-wide">Motivo del cierre *</label>
              <textarea 
                value={closingReason} 
                onChange={(e) => setClosingReason(e.target.value)} 
                placeholder="Ej: Proveedor confirma que no tiene más stock de los faltantes..." 
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
    </div>
  );
};

export default PurchaseOrderList;