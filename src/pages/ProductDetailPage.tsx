// pages/ProductDetailPage.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProductStore } from '../store/productStore';
import { inventoryApi } from '../api/inventory';
import type { InventoryMovement } from '../api/inventory';

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedProduct, fetchProductById, isLoading, error, updateStock } = useProductStore();
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'history' | 'suppliers'>('details');
  const [copied, setCopied] = useState(false);
  
  // Estado para el modal de stock
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockAction, setStockAction] = useState<'add' | 'remove'>('add');
  const [stockQuantity, setStockQuantity] = useState(1);
  const [stockReason, setStockReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCustomReason, setShowCustomReason] = useState(false);

 // Opciones para agregar stock
const addStockOptions = [
  // Compras
  { value: 'compra_proveedor', label: '🏭 Compra a proveedor mayorista', defaultReason: 'Compra a proveedor mayorista' },
  { value: 'compra_web', label: '🌐 Compra por sitio web', defaultReason: 'Compra realizada por sitio web/e-commerce' },
  
  // Devoluciones y ajustes
  { value: 'devolucion_cliente', label: '🔄 Devolución de cliente', defaultReason: 'Devolución de cliente' },
  { value: 'ajuste_inventario', label: '📊 Ajuste de inventario (positivo)', defaultReason: 'Ajuste de inventario - Incremento' },
  { value: 'reposicion', label: '🔄 Reposición por garantía', defaultReason: 'Reposición de producto por garantía' },
  
  // Producción y logística
  { value: 'produccion', label: '🏭 Producción propia (artesanal)', defaultReason: 'Producción propia - Artesanías' },
  { value: 'transferencia_entrada', label: '🚚 Transferencia desde otro depósito', defaultReason: 'Transferencia desde otro depósito' },
  { value: 'recepcion_almacen', label: '📦 Recepción en almacén', defaultReason: 'Recepción de mercadería en almacén' },
  
  // Inventario
  { value: 'inventario_inicial', label: '📋 Inventario inicial', defaultReason: 'Inventario inicial del sistema' },
  { value: 'inventario_fisico', label: '📊 Ajuste por inventario físico', defaultReason: 'Ajuste positivo por recuento físico' },
  
  // Otros ingresos
  { value: 'donacion', label: '🎁 Donación recibida', defaultReason: 'Donación recibida' },
  { value: 'consignacion', label: '📦 Retorno de consignación', defaultReason: 'Producto devuelto de consignación' },
  { value: 'feria_evento', label: '🎪 Retorno de feria/evento', defaultReason: 'Productos no vendidos retornados de feria' },
  { value: 'custom', label: '✏️ Otro motivo (especificar)', defaultReason: '' }
];

// Opciones para remover stock
const removeStockOptions = [
  // Ventas por canal
  { value: 'venta_web', label: '🌐 Venta por sitio web', defaultReason: 'Venta realizada por sitio web' },
  { value: 'venta_mercadolibre', label: '🛒 Venta por MercadoLibre', defaultReason: 'Venta realizada por MercadoLibre' },
  { value: 'venta_instagram', label: '📸 Venta por Instagram', defaultReason: 'Venta realizada por Instagram' },
  { value: 'venta_facebook', label: '📘 Venta por Facebook', defaultReason: 'Venta realizada por Facebook Marketplace' },
  { value: 'venta_whatsapp', label: '💬 Venta por WhatsApp', defaultReason: 'Venta realizada por WhatsApp' },
  { value: 'venta_personal', label: '🤝 Venta personal (showroom/feria)', defaultReason: 'Venta personal en showroom o feria' },
  { value: 'venta_mayorista', label: '� wholesale Venta mayorista', defaultReason: 'Venta al por mayor' },
  
  // Devoluciones
  { value: 'devolucion_cliente', label: '↩️ Devolución de cliente', defaultReason: 'Devolución/Reembolso a cliente' },
  { value: 'devolucion_proveedor', label: '🔄 Devolución a proveedor', defaultReason: 'Devolución a proveedor por defectos' },
  
  // Ajustes
  { value: 'ajuste_inventario', label: '📊 Ajuste de inventario (negativo)', defaultReason: 'Ajuste de inventario - Decremento' },
  
  // Mermas y descartes (importante en decoración)
  { value: 'producto_danado', label: '⚠️ Producto dañado (rotura/mancha)', defaultReason: 'Producto dañado - Descarte' },
  { value: 'producto_robo', label: '🚨 Robo o pérdida', defaultReason: 'Robo o pérdida de inventario' },
  { value: 'producto_defectuoso', label: '🔧 Producto defectuoso de fábrica', defaultReason: 'Producto defectuoso - Devolución a proveedor' },
  { value: 'merma_operativa', label: '📉 Merma operativa (manipulación)', defaultReason: 'Merma por manipulación o proceso' },
  { value: 'producto_exhibicion', label: '🖼️ Producto de exhibición', defaultReason: 'Producto pasado a exhibición/muestra' },
  
  // Transferencias
  { value: 'transferencia_salida', label: '🚚 Transferencia a otro depósito', defaultReason: 'Transferencia a otro depósito' },
  { value: 'consignacion_salida', label: '📦 Envío a consignación', defaultReason: 'Producto enviado a consignación' },
  { value: 'feria_evento', label: '🎪 Envío a feria/evento', defaultReason: 'Producto enviado a feria o evento' },
  
  // Promociones y muestras
  { value: 'muestra_gratis', label: '🎁 Muestra gratis', defaultReason: 'Muestra gratis - Sin costo' },
  { value: 'promocion', label: '🎯 Promoción / Cortesía', defaultReason: 'Producto entregado en promoción' },
  { value: 'regalo_compra', label: '🎁 Regalo por compra', defaultReason: 'Producto como regalo por compra' },
  
  // Otros
  { value: 'donacion_salida', label: '🤝 Donación', defaultReason: 'Producto donado' },
  { value: 'custom', label: '✏️ Otro motivo (especificar)', defaultReason: '' }
];

  const currentOptions = stockAction === 'add' ? addStockOptions : removeStockOptions;

  const handleReasonChange = (value: string) => {
    setStockReason(value);
    const option = currentOptions.find(opt => opt.value === value);
    if (option && option.value !== 'custom') {
      setCustomReason('');
      setShowCustomReason(false);
    } else if (value === 'custom') {
      setShowCustomReason(true);
      setStockReason('');
    } else {
      setShowCustomReason(false);
    }
  };

  const handleCustomReasonChange = (value: string) => {
    setCustomReason(value);
    setStockReason(value);
  };

  useEffect(() => {
    if (id) {
      fetchProductById(parseInt(id));
      loadProductHistory(parseInt(id));
      loadProductStatistics(parseInt(id));
    }
  }, [id]);

  const loadProductHistory = async (productId: number) => {
    setLoadingHistory(true);
    try {
      const history = await inventoryApi.getProductHistory(productId);
      setMovements(history);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadProductStatistics = async (productId: number) => {
    try {
      const stats = await inventoryApi.getProductStatistics(productId);
      setStatistics(stats);
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const handleStockAction = async () => {
    if (!selectedProduct) return;
    
    if (stockQuantity <= 0) {
      alert('La cantidad debe ser mayor a 0');
      return;
    }
    
    let finalReason = stockReason;
    if (showCustomReason) {
      if (!customReason.trim()) {
        alert('Debe ingresar un motivo personalizado');
        return;
      }
      finalReason = customReason;
    } else if (!stockReason) {
      alert('Debe seleccionar un motivo');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await updateStock(
        selectedProduct.id,
        stockQuantity,
        stockAction === 'add',
        finalReason,
        'admin'
      );
      
      await fetchProductById(selectedProduct.id);
      await loadProductHistory(selectedProduct.id);
      await loadProductStatistics(selectedProduct.id);
      
      setShowStockModal(false);
      setStockQuantity(1);
      setStockReason('');
      setCustomReason('');
      setShowCustomReason(false);
      
      alert(stockAction === 'add' ? 'Stock agregado exitosamente' : 'Stock removido exitosamente');
    } catch (error: any) {
      alert(error.message || 'Error al modificar stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openStockModal = (action: 'add' | 'remove') => {
    setStockAction(action);
    setStockQuantity(1);
    setStockReason('');
    setCustomReason('');
    setShowCustomReason(false);
    setShowStockModal(true);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error al copiar:', err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2
    }).format(value);
  };

  const getMovementTypeColor = (type: string) => {
    switch (type) {
      case 'ENTRADA':
        return 'text-green-600 bg-green-100';
      case 'SALIDA':
        return 'text-red-600 bg-red-100';
      case 'AJUSTE':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getMovementTypeIcon = (type: string) => {
    switch (type) {
      case 'ENTRADA':
        return '📥';
      case 'SALIDA':
        return '📤';
      case 'AJUSTE':
        return '⚙️';
      default:
        return '📋';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Cargando producto...</div>
      </div>
    );
  }

  if (error || !selectedProduct) {
    return (
      <div className="p-4">
        <div className="bg-red-100 text-red-700 p-4 rounded-md mb-4">
          {error || 'Producto no encontrado'}
        </div>
        <button
          onClick={() => navigate('/products')}
          className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
        >
          ← Volver a productos
        </button>
      </div>
    );
  }

  const product = selectedProduct;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header mejorado */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 mb-6 shadow-sm">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-6">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-24 h-24 object-cover rounded-xl shadow-lg border-2 border-white"
              />
            ) : (
              <div className="w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl flex items-center justify-center text-4xl shadow-lg">
                📷
              </div>
            )}
            <div>
              <button
                onClick={() => navigate('/products')}
                className="text-gray-500 hover:text-gray-700 mb-2 flex items-center gap-1 text-sm"
              >
                ← Volver a productos
              </button>
              <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-gray-500 text-sm">SKU:</span>
                <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-gray-700">
                  {product.sku}
                </code>
                <button
                  onClick={() => copyToClipboard(product.sku)}
                  className={`p-1 rounded transition-all duration-200 ${
                    copied 
                      ? 'bg-green-100 text-green-600' 
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                  title="Copiar SKU"
                >
                  {copied ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                  )}
                </button>
                {copied && (
                  <span className="text-xs text-green-600 animate-pulse">¡Copiado!</span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate(`/products/${product.id}/edit`)}
            className="bg-yellow-500 text-white px-5 py-2.5 rounded-lg hover:bg-yellow-600 transition shadow-md flex items-center gap-2 font-medium"
          >
            ✏️ Editar producto
          </button>
        </div>
      </div>

      {/* Tabs mejorados */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-2">
          {[
            { id: 'details', label: '📋 Detalles del producto' },
            { id: 'suppliers', label: '🏭 Proveedores', count: product.suppliers?.length },
            { id: 'history', label: '📊 Historial de inventario', count: movements.length }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-5 py-2.5 font-medium transition-all rounded-t-lg ${
                activeTab === tab.id
                  ? 'text-blue-600 bg-white border-b-2 border-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab: Detalles del producto */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {product.imageUrl && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gray-50 px-6 py-3 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800">🖼️ Imagen del producto</h2>
                </div>
                <div className="p-6 flex justify-center bg-gray-50/30">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="max-w-full max-h-80 object-contain rounded-lg shadow-md"
                  />
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 px-6 py-3 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800">ℹ️ Información general</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-gray-500 text-sm block mb-1">Nombre</label>
                      <p className="font-medium text-gray-900">{product.name}</p>
                    </div>
                    <div>
                      <label className="text-gray-500 text-sm block mb-1">Estado</label>
                      {product.active ? (
                        <span className="inline-flex items-center gap-1.5 text-green-700 bg-green-50 px-3 py-1 rounded-full text-sm font-medium">
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-red-700 bg-red-50 px-3 py-1 rounded-full text-sm font-medium">
                          <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                          Inactivo
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-gray-500 text-sm block mb-1">Subcategoría</label>
                      <p className="text-gray-900">
                        {product.subcategory?.name}
                        <span className="text-gray-400 text-sm ml-1">
                          ({product.subcategory?.categoryName})
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-gray-500 text-sm block mb-1">Descripción</label>
                    <div className="bg-gray-50 rounded-lg p-4 text-gray-700 prose prose-sm max-w-none">
                      {product.description || 'Sin descripción'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 px-6 py-3 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800">💰 Precios y dimensiones</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                  <div className="bg-blue-50 rounded-xl p-4 text-center">
                    <label className="text-gray-500 text-xs uppercase tracking-wide block mb-1">Costo</label>
                    <p className="font-bold text-gray-800 text-lg">{formatCurrency(product.costPrice || 0)}</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-4 text-center">
                    <label className="text-gray-500 text-xs uppercase tracking-wide block mb-1">Venta</label>
                    <p className="font-bold text-green-600 text-lg">{formatCurrency(product.salePrice || 0)}</p>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-4 text-center">
                    <label className="text-gray-500 text-xs uppercase tracking-wide block mb-1">Margen</label>
                    <p className="font-bold text-purple-600 text-lg">
                      {product.marginPercentage?.toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-orange-50 rounded-xl p-4 text-center">
                    <label className="text-gray-500 text-xs uppercase tracking-wide block mb-1">Volumen</label>
                    <p className="font-bold text-orange-600 text-lg">{product.volume?.toFixed(0)} cm³</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <label className="text-gray-500 text-xs uppercase tracking-wide block mb-1">Peso</label>
                    <p className="font-bold text-gray-700">{product.weight || 0} kg</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 col-span-2">
                    <label className="text-gray-500 text-xs uppercase tracking-wide block mb-3 text-center">Dimensiones</label>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-white rounded-lg p-2 shadow-sm">
                        <div className="text-lg mb-1">📏</div>
                        <div className="text-xs text-gray-500 uppercase">Largo</div>
                        <div className="font-bold text-gray-800">{product.length} <span className="text-xs font-normal text-gray-500">{product.measureUnit}</span></div>
                      </div>
                      <div className="bg-white rounded-lg p-2 shadow-sm">
                        <div className="text-lg mb-1">📐</div>
                        <div className="text-xs text-gray-500 uppercase">Ancho</div>
                        <div className="font-bold text-gray-800">{product.width} <span className="text-xs font-normal text-gray-500">{product.measureUnit}</span></div>
                      </div>
                      <div className="bg-white rounded-lg p-2 shadow-sm">
                        <div className="text-lg mb-1">📏</div>
                        <div className="text-xs text-gray-500 uppercase">Alto</div>
                        <div className="font-bold text-gray-800">{product.height} <span className="text-xs font-normal text-gray-500">{product.measureUnit}</span></div>
                      </div>
                    </div>
                    <div className="text-center text-xs text-gray-400 mt-2">
                      Volumen: {product.volume?.toFixed(2)} {product.measureUnit}³
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg text-white overflow-hidden">
              <div className="p-6 text-center">
                <div className="text-6xl font-bold mb-2">
                  {product.currentStock}
                </div>
                <div className="text-blue-100 mb-4">unidades en stock</div>
                
                {product.hasStock ? (
                  <div className="inline-flex items-center gap-1 bg-green-400/20 px-3 py-1 rounded-full text-sm mb-4">
                    <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></span>
                    Stock disponible
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1 bg-red-400/20 px-3 py-1 rounded-full text-sm mb-4">
                    <span className="w-2 h-2 bg-red-300 rounded-full"></span>
                    Sin stock
                  </div>
                )}
                {product.lowStock && product.currentStock > 0 && (
                  <div className="inline-flex items-center gap-1 bg-yellow-400/20 px-3 py-1 rounded-full text-sm mb-4 ml-2">
                    ⚠️ Stock bajo
                  </div>
                )}
                
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => openStockModal('add')}
                    className="flex-1 bg-white text-blue-600 px-4 py-2.5 rounded-xl hover:bg-blue-50 transition font-semibold"
                  >
                    + Agregar stock
                  </button>
                  <button
                    onClick={() => openStockModal('remove')}
                    className="flex-1 bg-white/20 text-white px-4 py-2.5 rounded-xl hover:bg-white/30 transition font-semibold"
                  >
                    - Remover stock
                  </button>
                </div>
              </div>
            </div>

            {statistics && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gray-50 px-6 py-3 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-800">📈 Estadísticas</h3>
                </div>
                <div className="p-5 space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-500">Total entradas:</span>
                    <span className="font-bold text-green-600 text-lg">{statistics.totalEntries || 0}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-500">Total salidas:</span>
                    <span className="font-bold text-red-600 text-lg">{statistics.totalExits || 0}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-500">Movimiento neto:</span>
                    <span className="font-bold text-blue-600 text-lg">{statistics.netMovement || 0}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-gray-500">Total movimientos:</span>
                    <span className="font-bold text-gray-800 text-lg">{statistics.movementCount || 0}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 px-6 py-3 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800">📅 Fechas importantes</h3>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Creado:</span>
                  <span className="text-gray-700 text-sm font-mono">{formatDate(product.createdAt)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Actualizado:</span>
                  <span className="text-gray-700 text-sm font-mono">{formatDate(product.updatedAt)}</span>
                </div>
                {product.lastPurchaseAt && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-sm">Última compra:</span>
                    <span className="text-gray-700 text-sm font-mono">{formatDate(product.lastPurchaseAt)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Proveedores */}
      {activeTab === 'suppliers' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proveedor</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU Proveedor</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Principal</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notas</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {product.suppliers?.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{supplier.supplierName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                        {supplier.supplierSku || '—'}
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {supplier.isPrimary ? (
                        <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs font-medium">
                          ✓ Principal
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {supplier.notes || '—'}
                    </td>
                  </tr>
                ))}
                {(!product.suppliers || product.suppliers.length === 0) && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                      <div className="text-4xl mb-2">🏭</div>
                      <p>No hay proveedores asociados</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Historial de inventario */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {loadingHistory ? (
            <div className="text-center py-12 text-gray-500">Cargando historial...</div>
          ) : movements.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-gray-500">
              <div className="text-5xl mb-3">📊</div>
              <p>No hay movimientos de inventario registrados para este producto</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                      <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                      <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Costo unitario</th>
                      <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Motivo</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {movements.map((movement) => (
                      <tr key={movement.id} className="hover:bg-gray-50 transition">
                        <td className="px-5 py-3 text-sm text-gray-500 whitespace-nowrap font-mono">
                          {formatDate(movement.movementDate)}
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getMovementTypeColor(movement.movementType)}`}>
                            {getMovementTypeIcon(movement.movementType)} {movement.movementType}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-sm text-right font-bold whitespace-nowrap">
                          <span className={movement.movementType === 'ENTRADA' ? 'text-green-600' : 'text-red-600'}>
                            {movement.movementType === 'ENTRADA' ? '+' : '-'}{movement.quantity}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-sm text-right text-gray-600 whitespace-nowrap">
                          {movement.unitCost ? formatCurrency(movement.unitCost) : '—'}
                        </td>
                        <td className="px-5 py-3 text-sm text-right font-medium whitespace-nowrap">
                          {movement.totalValue ? formatCurrency(movement.totalValue) : '—'}
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-500 max-w-xs truncate">
                          {movement.reason || '—'}
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-500 whitespace-nowrap">
                          {movement.registeredBy}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal para gestión de stock con SelectBox mejorado */}
      {showStockModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-scaleIn">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold text-gray-900">
                {stockAction === 'add' ? '➕ Agregar stock' : '➖ Remover stock'}
              </h2>
              <button
                onClick={() => setShowStockModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl w-8 h-8 rounded-full hover:bg-gray-100 transition"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-5">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-gray-500 text-sm">Producto</p>
                <p className="text-gray-900 font-semibold">{product.name}</p>
                <p className="text-gray-400 text-sm mt-1">Stock actual: <span className="font-bold text-blue-600">{product.currentStock}</span> unidades</p>
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-semibold mb-2">
                  Cantidad
                </label>
                <input
                  type="number"
                  min="1"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-semibold mb-2">
                  Motivo *
                </label>
                <select
                  value={showCustomReason ? 'custom' : stockReason}
                  onChange={(e) => handleReasonChange(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white"
                >
                  <option value="">Seleccione un motivo...</option>
                  {currentOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {showCustomReason && (
                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-2">
                    Especificar motivo *
                  </label>
                  <input
                    type="text"
                    value={customReason}
                    onChange={(e) => handleCustomReasonChange(e.target.value)}
                    placeholder="Ej: Reajuste por inventario físico, Cortesía, etc."
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
              )}
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowStockModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleStockAction}
                  disabled={isSubmitting || stockQuantity <= 0 || (!stockReason && !customReason) || (showCustomReason && !customReason.trim())}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-white transition font-semibold ${
                    stockAction === 'add'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isSubmitting ? 'Procesando...' : stockAction === 'add' ? 'Agregar' : 'Remover'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default ProductDetailPage;