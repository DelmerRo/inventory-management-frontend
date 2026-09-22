// pages/ProductDetailPage.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProductStore } from '../store/productStore';
import { inventoryApi } from '../api/inventory';
import type { InventoryMovement } from '../api/inventory';

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // Mantenemos 'error' y le daremos uso visual más abajo
  const { selectedProduct, fetchProductById, isLoading, error, updateStock } = useProductStore();
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  
  const [activeTab, setActiveTab] = useState<'details' | 'history' | 'suppliers'>('details');
  const [copiedSku, setCopiedSku] = useState(false);
  const [copiedSupplierSku, setCopiedSupplierSku] = useState(false);
  
  const [sharedClient, setSharedClient] = useState(false);
  const [sharedSupplier, setSharedSupplier] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'ENTRADA' | 'SALIDA' | 'AJUSTE'>('ALL');

  const [showStockModal, setShowStockModal] = useState(false);
  const [stockAction, setStockAction] = useState<'add' | 'remove'>('add');
  const [stockQuantity, setStockQuantity] = useState(1);
  const [stockReason, setStockReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCustomReason, setShowCustomReason] = useState(false);

  const handleBack = () => navigate('/products');

  const addStockOptions = [
    { value: 'compra_proveedor', label: '🏭 Compra a proveedor mayorista', defaultReason: 'Compra a proveedor mayorista' },
    { value: 'compra_web', label: '🌐 Compra por sitio web', defaultReason: 'Compra realizada por sitio web/e-commerce' },
    { value: 'devolucion_cliente', label: '🔄 Devolución de cliente', defaultReason: 'Devolución de cliente' },
    { value: 'ajuste_inventario', label: '📊 Ajuste de inventario (positivo)', defaultReason: 'Ajuste de inventario - Incremento' },
    { value: 'reposicion', label: '🔄 Reposición por garantía', defaultReason: 'Reposición de producto por garantía' },
    { value: 'produccion', label: '🏭 Producción propia (artesanal)', defaultReason: 'Producción propia - Artesanías' },
    { value: 'transferencia_entrada', label: '🚚 Transferencia desde otro depósito', defaultReason: 'Transferencia desde otro depósito' },
    { value: 'recepcion_almacen', label: '📦 Recepción en almacén', defaultReason: 'Recepción de mercadería en almacén' },
    { value: 'inventario_inicial', label: '📋 Inventario inicial', defaultReason: 'Inventario inicial del sistema' },
    { value: 'inventario_fisico', label: '📊 Ajuste por inventario físico', defaultReason: 'Ajuste positivo por recuento físico' },
    { value: 'donacion', label: '🎁 Donación recibida', defaultReason: 'Donación recibida' },
    { value: 'consignacion', label: '📦 Retorno de consignación', defaultReason: 'Producto devuelto de consignación' },
    { value: 'feria_evento', label: '🎪 Retorno de feria/evento', defaultReason: 'Productos no vendidos retornados de feria' },
    { value: 'custom', label: '✏️ Otro motivo (especificar)', defaultReason: '' }
  ];

  const removeStockOptions = [
    { value: 'venta_web', label: '🌐 Venta por sitio web', defaultReason: 'Venta realizada por sitio web' },
    { value: 'venta_mercadolibre', label: '🛒 Venta por MercadoLibre', defaultReason: 'Venta realizada por MercadoLibre' },
    { value: 'venta_instagram', label: '📸 Venta por Instagram', defaultReason: 'Venta realizada por Instagram' },
    { value: 'venta_facebook', label: '📘 Venta por Facebook', defaultReason: 'Venta realizada por Facebook Marketplace' },
    { value: 'venta_whatsapp', label: '💬 Venta por WhatsApp', defaultReason: 'Venta realizada por WhatsApp' },
    { value: 'venta_personal', label: '🤝 Venta personal (showroom/feria)', defaultReason: 'Venta personal en showroom o feria' },
    { value: 'venta_mayorista', label: '📦 Venta mayorista', defaultReason: 'Venta al por mayor' },
    { value: 'devolucion_cliente', label: '↩️ Devolución de cliente', defaultReason: 'Devolución/Reembolso a cliente' },
    { value: 'devolucion_proveedor', label: '🔄 Devolución a proveedor', defaultReason: 'Devolución a proveedor por defectos' },
    { value: 'ajuste_inventario', label: '📊 Ajuste de inventario (negativo)', defaultReason: 'Ajuste de inventario - Decremento' },
    { value: 'producto_danado', label: '⚠️ Producto dañado (rotura/mancha)', defaultReason: 'Producto dañado - Descarte' },
    { value: 'producto_robo', label: '🚨 Robo o pérdida', defaultReason: 'Robo o pérdida de inventario' },
    { value: 'producto_defectuoso', label: '🔧 Producto defectuoso de fábrica', defaultReason: 'Producto defectuoso - Devolución a proveedor' },
    { value: 'merma_operativa', label: '📉 Merma operativa (manipulación)', defaultReason: 'Merma por manipulación o proceso' },
    { value: 'producto_exhibicion', label: '🖼️ Producto de exhibición', defaultReason: 'Producto pasado a exhibición/muestra' },
    { value: 'transferencia_salida', label: '🚚 Transferencia a otro depósito', defaultReason: 'Transferencia a otro depósito' },
    { value: 'consignacion_salida', label: '📦 Envío a consignación', defaultReason: 'Producto enviado a consignación' },
    { value: 'feria_evento', label: '🎪 Envío a feria/evento', defaultReason: 'Producto enviado a feria o evento' },
    { value: 'muestra_gratis', label: '🎁 Muestra gratis', defaultReason: 'Muestra gratis - Sin costo' },
    { value: 'promocion', label: '🎯 Promoción / Cortesía', defaultReason: 'Producto entregado en promoción' },
    { value: 'regalo_compra', label: '🎁 Regalo por compra', defaultReason: 'Producto como regalo por compra' },
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
    }
  }, [id]);

  const loadProductHistory = async (productId: number) => {
    try {
      const history = await inventoryApi.getProductHistory(productId);
      setMovements(history);
    } catch (err) {
      console.error('Error loading history:', err);
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
      await updateStock(selectedProduct.id, stockQuantity, stockAction === 'add', finalReason, 'admin');
      await fetchProductById(selectedProduct.id);
      await loadProductHistory(selectedProduct.id);
      setShowStockModal(false);
      setStockQuantity(1);
      setStockReason('');
      setCustomReason('');
      setShowCustomReason(false);
    } catch (err: any) {
      alert(err.message || 'Error al modificar stock');
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

  const copyToClipboard = async (text: string, setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    try {
      await navigator.clipboard.writeText(text);
      setter(true);
      setTimeout(() => setter(false), 2000);
    } catch (err) {
      console.error('Error al copiar:', err);
    }
  };

  const handleShareToClient = () => {
    if (!selectedProduct) return;
    const p = selectedProduct;
    const stockStatus = p.currentStock > 0 ? `✅ ¡Stock disponible para entrega inmediata!` : `⏳ Consultar tiempos de ingreso`;
    const cleanDesc = p.description ? p.description.replace(/\n\s*\n/g, '\n').trim() : 'Sin descripción detallada.';
    const dimensions = [p.length, p.width, p.height].filter(v => v > 0).join(' x ');
    
    const textToShare = `*Utama Home & Deco* 🌿\n\n✨ *${p.name}*\n\n📝 *Detalles del producto:*\n${cleanDesc}\n\n📏 *Medidas:* ${dimensions ? `${dimensions}${p.measureUnit}` : 'Consultar'} | ⚖️ ${p.weight > 0 ? `${p.weight} kg` : 'Consultar'}\n\n💰 *Precio:* $${p.salePrice.toLocaleString('es-AR')}\n🔍 Ref: ${p.sku}\n\n${stockStatus}\n\n¿Te reservo uno? 👇`;
    
    copyToClipboard(textToShare, setSharedClient);
  };

  const handleShareToSupplier = () => {
    if (!selectedProduct) return;
    const p = selectedProduct;
    const supName = p.primarySupplierName || 'proveedor';
    const supRef = p.primarySupplierSku && p.primarySupplierSku !== '---' 
      ? `(Tu código: ${p.primarySupplierSku})` 
      : `(Nuestra Ref: ${p.sku})`;

    const textToShare = `¡Hola ${supName}! 👋\n\nTe escribo de Utama para consultarte disponibilidad y precio actualizado para reponer el siguiente artículo:\n\n📦 *${p.name}*\n🔖 ${supRef}\n\n¿Me confirmas si tienen stock? Quedo a la espera, ¡gracias!`;
    
    copyToClipboard(textToShare, setSharedSupplier);
  };

  const handlePrintLabel = () => {
    if (!selectedProduct) return;
    setIsPrinting(true);
    const p = selectedProduct;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("El navegador bloqueó la ventana emergente. Permite los pop-ups e intenta de nuevo.");
      setIsPrinting(false);
      return;
    }

    const categoryPath = p.subcategory 
      ? `${p.subcategory.categoryName} / ${p.subcategory.name}` 
      : 'Sin Categoría';

    const supSkuHtml = p.primarySupplierSku && p.primarySupplierSku !== '---'
      ? `<div class="sup-sku">PROV: ${p.primarySupplierSku}</div>`
      : '';

    const qrUrl = `https://inventory-management-frontend-utama.vercel.app/products/${p.sku}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Etiqueta ${p.sku}</title>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
        <style>
          @page { margin: 0; size: 50mm 25mm; }
          body { 
            width: 50mm; height: 25mm; margin: 0; padding: 1.5mm; box-sizing: border-box; 
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            display: flex; flex-direction: row; align-items: center; justify-content: space-between;
            overflow: hidden; background: white; color: black;
          }
          .qr-container { width: 16mm; height: 16mm; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
          .info-container { flex: 1; display: flex; flex-direction: column; justify-content: center; padding-left: 2mm; overflow: hidden; text-align: left; }
          .category { font-size: 5px; font-weight: 800; text-transform: uppercase; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; border-bottom: 0.5px solid #000; padding-bottom: 1px;}
          .name { font-size: 7.5px; font-weight: 900; line-height: 1.1; margin-bottom: 3px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
          .sku-container { margin-bottom: 2px; }
          .sku { font-size: 11.5px; font-weight: 900; font-family: Consolas, monaco, monospace; border: 1.5px solid black; padding: 1px 4px; border-radius: 3px; letter-spacing: 0.5px; display: inline-block;}
          .sup-sku { font-size: 5.5px; font-weight: bold; color: #333; margin-top: 1px;}
        </style>
      </head>
      <body>
        <div class="qr-container" id="qrcode"></div>
        <div class="info-container">
          <div class="category">${categoryPath}</div>
          <div class="name">${p.name}</div>
          <div class="sku-container"><div class="sku">${p.sku}</div></div>
          ${supSkuHtml}
        </div>
        <script>
          new QRCode(document.getElementById("qrcode"), {
            text: "${qrUrl}",
            width: 60,
            height: 60,
            colorDark : "#000000",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.L
          });
          setTimeout(function() { window.print(); window.onafterprint = function(){ window.close(); } }, 800);
        </script>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => setIsPrinting(false), 1500);
  };

  const renderFormattedText = (text: string) => {
    if (!text) return <p className="text-gray-400 italic">Sin descripción detallada.</p>;
    const lines = text.split('\n');
    return (
      <ul className="space-y-1 text-gray-700">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return <li key={idx} className="h-2 list-none"></li>;
          if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
            return <li key={idx} className="ml-4 list-disc marker:text-indigo-400 pl-1">{trimmed.substring(1).trim()}</li>;
          }
          return <li key={idx} className="list-none">{trimmed}</li>;
        })}
      </ul>
    );
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const formatCurrency = (value: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(value);

  const getMarginHealth = (margin: number) => {
    if (margin >= 40) return { label: 'Excelente', color: 'text-emerald-400', bg: 'bg-emerald-400/20' };
    if (margin >= 20) return { label: 'Bueno', color: 'text-blue-400', bg: 'bg-blue-400/20' };
    return { label: 'Bajo', color: 'text-amber-400', bg: 'bg-amber-400/20' };
  };

  const getDaysInSystem = (dateString: string) => {
    const days = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / (1000 * 3600 * 24));
    return days;
  };

  // ✅ 1. Manejo del Error Visual
  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gray-50 gap-4">
        <div className="p-4 bg-red-50 text-red-600 rounded-xl font-bold border border-red-100 flex items-center gap-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Error al cargar: {error}
        </div>
        <button onClick={handleBack} className="px-6 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-medium transition-colors">
          ← Volver al listado
        </button>
      </div>
    );
  }

  if (isLoading || !selectedProduct) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const p = selectedProduct;
  const marginAmt = p.salePrice - (p.costPrice || 0);
  const marginHealth = getMarginHealth(p.marginPercentage || 0);
  const daysInSystem = getDaysInSystem(p.createdAt);

  const filteredMovements = movements.filter(m => historyFilter === 'ALL' || m.movementType === historyFilter);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto bg-gray-50/50 min-h-screen">
      
      {/* 🚀 Header Hero */}
      <div className="flex flex-col lg:flex-row gap-6 mb-8 items-start lg:items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={handleBack} className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-indigo-600 transition-colors shadow-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded">{p.subcategory?.categoryName}</span>
              <span className="text-gray-300">/</span>
              <span className="text-xs font-medium text-gray-500">{p.subcategory?.name}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight tracking-tight">{p.name}</h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <button onClick={handlePrintLabel} disabled={isPrinting} className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors shadow-sm font-semibold">
            🖨️ {isPrinting ? 'Generando...' : 'Etiqueta QR'}
          </button>
          <button onClick={handleShareToSupplier} className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-indigo-100 text-indigo-600 rounded-xl hover:bg-indigo-50 transition-colors shadow-sm font-semibold">
            {sharedSupplier ? '✅ Copiado!' : '🏭 Reponer'}
          </button>
          <button onClick={handleShareToClient} className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 border border-transparent text-white rounded-xl hover:bg-emerald-600 transition-colors shadow-sm shadow-emerald-200 font-semibold">
            {sharedClient ? '✅ Ficha copiada!' : '💬 Compartir Cliente'}
          </button>
          <button onClick={() => navigate(`/products/${p.id}/edit`)} className="p-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 hover:text-blue-600 transition-colors shadow-sm" title="Editar">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        
        {/* COLUMNA IZQUIERDA */}
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row">
            <div className="w-full md:w-1/3 bg-gray-50 flex items-center justify-center p-6 border-b md:border-b-0 md:border-r border-gray-100 min-h-[250px]">
              {p.imageUrl ? (
                <img src={p.imageUrl} alt={p.name} className="w-full max-w-[200px] object-contain drop-shadow-md rounded-lg" />
              ) : (
                <div className="text-gray-300 flex flex-col items-center">
                  <svg className="w-16 h-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <span className="text-sm font-medium">Sin imagen</span>
                </div>
              )}
            </div>
            
            <div className="p-6 md:p-8 flex-1 flex flex-col justify-center space-y-5">
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 block">Identificación Principal</span>
                <div className="flex items-center gap-2">
                  <code className="text-xl font-mono font-bold text-gray-800">{p.sku}</code>
                  <button onClick={() => copyToClipboard(p.sku, setCopiedSku)} className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-lg transition-colors">
                    {copiedSku ? <span className="text-green-600 text-sm font-bold">✓</span> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>}
                  </button>
                </div>
              </div>

              {p.primarySupplierSku && p.primarySupplierSku !== '---' && (
                <div>
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1 block">Ref. Proveedor ({p.primarySupplierName})</span>
                  <div className="flex items-center gap-2">
                    <code className="text-lg font-mono font-semibold text-indigo-700">{p.primarySupplierSku}</code>
                    <button onClick={() => copyToClipboard(p.primarySupplierSku!, setCopiedSupplierSku)} className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-500 rounded-lg transition-colors">
                      {copiedSupplierSku ? <span className="text-green-600 text-sm font-bold">✓</span> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>}
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-gray-100 flex items-center gap-2 text-sm text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Registrado hace <span className="font-bold text-gray-700">{daysInSystem} días</span> 
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 md:p-8 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
                Descripción del Producto
              </h3>
            </div>
            <div className="p-6 md:p-8 bg-gray-50/30">
              <div className="prose prose-indigo max-w-none prose-p:leading-relaxed prose-li:leading-relaxed">
                {renderFormattedText(p.description)}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
              Dimensiones y Peso
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Largo</span>
                <span className="text-xl font-bold text-gray-800">{p.length} <span className="text-sm font-medium text-gray-500">{p.measureUnit}</span></span>
              </div>
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Ancho</span>
                <span className="text-xl font-bold text-gray-800">{p.width} <span className="text-sm font-medium text-gray-500">{p.measureUnit}</span></span>
              </div>
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Alto</span>
                <span className="text-xl font-bold text-gray-800">{p.height} <span className="text-sm font-medium text-gray-500">{p.measureUnit}</span></span>
              </div>
              <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                <span className="text-xs font-bold text-orange-400 uppercase tracking-widest block mb-1">Peso Neto</span>
                <span className="text-xl font-bold text-orange-700">{p.weight} <span className="text-sm font-medium">kg</span></span>
              </div>
            </div>
          </div>

        </div>

        {/* COLUMNA DERECHA */}
        <div className="space-y-6 md:space-y-8">
          
          <div className="bg-gray-900 rounded-3xl p-6 shadow-xl text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-32 bg-indigo-500 rounded-full blur-3xl opacity-20 -mr-16 -mt-16"></div>
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-gray-400 font-bold uppercase tracking-widest text-xs">Precio de Venta</h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${marginHealth.bg} ${marginHealth.color} border border-white/10`} title="Salud de rentabilidad">
                  {marginHealth.label}
                </span>
              </div>
              <div className="text-4xl md:text-5xl font-black mb-6">{formatCurrency(p.salePrice)}</div>
              
              <div className="grid grid-cols-2 gap-4 border-t border-gray-700 pt-6">
                <div>
                  <span className="text-gray-400 font-medium text-xs uppercase tracking-wider block mb-1">Costo</span>
                  <span className="text-xl font-semibold text-gray-200">{formatCurrency(p.costPrice)}</span>
                </div>
                <div>
                  <span className="text-emerald-400 font-medium text-xs uppercase tracking-wider block mb-1">Margen</span>
                  <span className="text-xl font-bold text-emerald-400 flex items-center gap-1">
                    {p.marginPercentage?.toFixed(1)}%
                  </span>
                  <span className="text-xs text-emerald-400/70 block mt-0.5">Ganancia: {formatCurrency(marginAmt)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-full h-1.5 ${p.currentStock === 0 ? 'bg-red-500' : p.currentStock < 10 ? 'bg-yellow-400' : 'bg-green-500'}`}></div>
            
            <div className="flex justify-between items-center mb-6 mt-2">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Inventario Físico</h3>
              <div className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${p.currentStock === 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                {p.currentStock === 0 ? 'Agotado' : 'Disponible'}
              </div>
            </div>

            <div className="text-5xl font-black text-gray-900 mb-2">{p.currentStock} <span className="text-lg font-medium text-gray-400 tracking-normal uppercase">unidades</span></div>
            
            <div className="flex gap-3 mt-8">
              <button onClick={() => openStockModal('add')} className="flex-1 bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-xl font-semibold transition-colors shadow-sm flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg> Entrada
              </button>
              <button onClick={() => openStockModal('remove')} className="flex-1 bg-white border-2 border-gray-200 hover:border-gray-300 text-gray-700 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg> Salida
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* 🚀 Tabs de Información Extendida */}
      <div className="mt-12 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-100 px-6 pt-4 flex gap-6">
          <button 
            onClick={() => setActiveTab('history')} 
            className={`pb-4 font-bold transition-colors relative ${activeTab === 'history' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Historial de Movimientos
            {activeTab === 'history' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-t-md"></div>}
          </button>
          <button 
            onClick={() => setActiveTab('suppliers')} 
            className={`pb-4 font-bold transition-colors relative ${activeTab === 'suppliers' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Proveedores Asociados ({p.suppliers?.length || 0})
            {activeTab === 'suppliers' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-t-md"></div>}
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'history' && (
            <div>
              <div className="flex gap-2 mb-4">
                {(['ALL', 'ENTRADA', 'SALIDA', 'AJUSTE'] as const).map(filter => (
                  <button 
                    key={filter}
                    onClick={() => setHistoryFilter(filter)}
                    className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${
                      historyFilter === filter 
                        ? 'bg-indigo-100 text-indigo-700' 
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {filter === 'ALL' ? 'Todos' : filter}
                  </button>
                ))}
              </div>

              <div className="overflow-x-auto border border-gray-100 rounded-xl">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Fecha</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Operación</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Cant</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Motivo</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Usuario</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 bg-white">
                    {filteredMovements.map((mov) => (
                      <tr key={mov.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-4 text-sm text-gray-500 font-mono">{formatDate(mov.movementDate)}</td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                            mov.movementType === 'ENTRADA' ? 'bg-green-50 text-green-700' : 
                            mov.movementType === 'SALIDA' ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'
                          }`}>
                            {mov.movementType}
                          </span>
                        </td>
                        <td className={`px-4 py-4 text-sm font-bold text-right ${mov.movementType === 'ENTRADA' ? 'text-green-600' : 'text-red-600'}`}>
                          {mov.movementType === 'ENTRADA' ? '+' : '-'}{mov.quantity}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600 max-w-[200px] truncate" title={mov.reason}>{mov.reason}</td>
                        <td className="px-4 py-4 text-sm text-gray-400">{mov.registeredBy}</td>
                      </tr>
                    ))}
                    {filteredMovements.length === 0 && (
                      <tr><td colSpan={5} className="py-12 text-center text-gray-400">No hay movimientos para este filtro.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'suppliers' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {p.suppliers?.map(sup => (
                <div key={sup.id} className={`p-5 rounded-2xl border ${sup.isPrimary ? 'border-indigo-200 bg-indigo-50/30' : 'border-gray-100 bg-white shadow-sm'}`}>
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-bold text-gray-900">{sup.supplierName}</h4>
                    {sup.isPrimary && <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">Principal</span>}
                  </div>
                  <div className="mb-1">
                    <span className="text-xs text-gray-400 block mb-0.5">SKU Proveedor</span>
                    <code className="text-sm font-mono text-gray-800">{sup.supplierSku || 'N/A'}</code>
                  </div>
                  {sup.notes && <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">{sup.notes}</p>}
                </div>
              ))}
              {(!p.suppliers || p.suppliers.length === 0) && (
                <div className="col-span-full py-12 text-center text-gray-400">No hay proveedores vinculados.</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 🚀 Modal de Stock */}
      {showStockModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className={`p-6 text-white flex justify-between items-center ${stockAction === 'add' ? 'bg-gray-900' : 'bg-rose-600'}`}>
              <h2 className="text-xl font-bold flex items-center gap-2">
                {stockAction === 'add' ? <><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg> Entrada de Mercadería</> : <><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg> Salida de Mercadería</>}
              </h2>
              <button onClick={() => setShowStockModal(false)} className="text-white/70 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-6 md:p-8 space-y-6">
              <div className="bg-gray-50 rounded-2xl p-4 flex justify-between items-center border border-gray-100">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Producto</p>
                  <p className="text-gray-900 font-bold line-clamp-1">{p.name}</p>
                </div>
                <div className="text-right pl-4 border-l border-gray-200">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Stock Actual</p>
                  <p className="font-black text-xl text-gray-900">{p.currentStock}</p>
                </div>
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Cantidad a {stockAction === 'add' ? 'ingresar' : 'retirar'}</label>
                <input type="number" min="1" value={stockQuantity} onChange={(e) => setStockQuantity(parseInt(e.target.value) || 0)} className="w-full px-5 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-lg" autoFocus />
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Motivo del movimiento *</label>
                <select value={showCustomReason ? 'custom' : stockReason} onChange={(e) => handleReasonChange(e.target.value)} className="w-full px-5 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                  <option value="">Seleccione un motivo oficial...</option>
                  {currentOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>

              {showCustomReason && (
                <div className="animate-fadeIn">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Especificar motivo *</label>
                  <input type="text" value={customReason} onChange={(e) => handleCustomReasonChange(e.target.value)} placeholder="Ej: Muestra para influencer..." className="w-full px-5 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              )}
              
              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowStockModal(false)} className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors">Cancelar</button>
                <button onClick={handleStockAction} disabled={isSubmitting || stockQuantity <= 0 || (!stockReason && !customReason) || (showCustomReason && !customReason.trim())} className={`flex-1 px-4 py-3 rounded-xl text-white font-bold transition-colors ${stockAction === 'add' ? 'bg-gray-900 hover:bg-gray-800' : 'bg-rose-600 hover:bg-rose-700'} disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2`}>
                  {isSubmitting ? <span className="animate-pulse">Procesando...</span> : stockAction === 'add' ? 'Confirmar Entrada' : 'Confirmar Salida'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetailPage;