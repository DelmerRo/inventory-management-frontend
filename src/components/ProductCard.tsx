// components/ProductCard.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ProductSummary } from '../types/product';
import { useProductStore } from '../store/productStore';

interface ProductCardProps {
  product: ProductSummary;
  onCopySku?: (sku: string, productId: number, e: React.MouseEvent) => void;
  copiedSkuId?: number | null;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onCopySku, copiedSkuId }) => {
  const navigate = useNavigate();
  const { toggleProductStatus, hardDeleteProduct } = useProductStore();
  const [imageError, setImageError] = useState(false);
  
  const [copiedSupSku, setCopiedSupSku] = useState(false);
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [sharedClient, setSharedClient] = useState(false);
  const [sharedSupplier, setSharedSupplier] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const handleEdit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/products/${product.id}/edit`);
  };

  const handleStatusToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const action = product.active ? 'desactivar' : 'reactivar';
    if (confirm(`¿${action === 'desactivar' ? 'Desactivar' : 'Reactivar'} producto "${product.name}"?`)) {
      await toggleProductStatus(product.id);
    }
  };

  const handleHardDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmMessage = `⚠️ ¡ATENCIÓN ACCIÓN IRREVERSIBLE!\n\n¿Estás absolutamente seguro de que deseas ELIMINAR FÍSICAMENTE el producto "${product.name}"?\n\n- Se borrarán las imágenes de la nube.\n- Se desvinculará de historiales y compras.\n- Esta acción NO se puede deshacer.`;
    
    if (window.confirm(confirmMessage)) {
      try {
        await hardDeleteProduct(product.id);
      } catch (err) {
        alert("Ocurrió un error al intentar eliminar el producto.");
      }
    }
  };

  const handleViewDetail = () => {
    navigate(`/products/${product.id}`);
  };

  const handleCopySupplierSku = async (e: React.MouseEvent, sku: string) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(sku);
      setCopiedSupSku(true);
      setTimeout(() => setCopiedSupSku(false), 2000);
    } catch (err) {
      console.error('Error al copiar SKU del proveedor:', err);
    }
  };

  const handleCopyTitle = async (e: React.MouseEvent, title: string) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(title);
      setCopiedTitle(true);
      setTimeout(() => setCopiedTitle(false), 2000);
    } catch (err) {
      console.error('Error al copiar título:', err);
    }
  };

  const handleShareClient = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const stockStatus = product.currentStock > 0 ? `✅ Disponible` : `⏳ Agotado`;
    const textToShare = `✨ *${product.name}*\n💰 $${product.salePrice.toLocaleString('es-AR')}\n🔍 Ref: ${product.sku}\n${stockStatus}`;
    
    try {
      await navigator.clipboard.writeText(textToShare);
      setSharedClient(true);
      setTimeout(() => setSharedClient(false), 2000);
    } catch (err) {
      console.error('Error al generar texto para cliente:', err);
    }
  };

  const handleShareSupplier = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const supName = product.primarySupplierName || 'proveedor';
    const supRef = product.primarySupplierSku && product.primarySupplierSku !== '---' 
      ? `(Tu Ref: ${product.primarySupplierSku})` 
      : `(Nuestra Ref: ${product.sku})`;

    const textToShare = `¡Hola ${supName}!\n¿Tienen stock y precio actualizado de:\n📦 *${product.name}*\n🔖 ${supRef}?`;
    
    try {
      await navigator.clipboard.writeText(textToShare);
      setSharedSupplier(true);
      setTimeout(() => setSharedSupplier(false), 2000);
    } catch (err) {
      console.error('Error al generar texto para proveedor:', err);
    }
  };

  const handlePrintLabel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPrinting(true);
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("El navegador bloqueó la ventana emergente. Permite los pop-ups e intenta de nuevo.");
      setIsPrinting(false);
      return;
    }

    const supSkuHtml = product.primarySupplierSku && product.primarySupplierSku !== '---'
      ? `<div class="sup-sku">PROV: ${product.primarySupplierSku}</div>`
      : '';

    const baseUrl = window.location.origin;
    const qrUrl = `${baseUrl}/products/${product.id}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Etiqueta ${product.sku}</title>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
        <style>
          @page { margin: 0; size: 50mm 25mm; }
          body { 
            width: 50mm; height: 25mm; margin: 0; 
            padding: 0.5mm 1mm; 
            box-sizing: border-box; 
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            display: flex; flex-direction: row; align-items: center; justify-content: space-between;
            overflow: hidden; background: white; color: black;
          }
          .qr-container { width: 19mm; height: 19mm; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-left: 0.5mm;}
          .info-container { flex: 1; display: flex; flex-direction: column; justify-content: center; padding-left: 2mm; overflow: hidden; text-align: center; }
          
          .category { font-size: 7px; font-weight: 900; color: #111; text-transform: uppercase; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; letter-spacing: 0.2px; border-bottom: 1.5px solid #000; padding-bottom: 1px;}
          .name { font-size: 9px; font-weight: 900; line-height: 1.1; margin-bottom: 3px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; width: 100%;}
          .sku-container { margin-bottom: 2px; width: 100%; display: flex; justify-content: center; }
          
          .sku { 
            font-size: 12px; 
            font-weight: 900; 
            font-family: Consolas, monaco, monospace; 
            border: 1.5px solid black; 
            padding: 1px 4px; 
            border-radius: 3px; 
            letter-spacing: 0.5px; 
            display: inline-block;
            white-space: nowrap; 
            max-width: 95%; 
            overflow: hidden;
          }
          .sup-sku { font-size: 8px; font-weight: bold; color: #111; letter-spacing: 0.3px; margin-top: 1px;}
        </style>
      </head>
      <body>
        <div class="qr-container" id="qrcode"></div>
        <div class="info-container">
          <div class="category">${product.subcategoryName || 'SIN CATEGORÍA'}</div>
          <div class="name">${product.name}</div>
          <div class="sku-container"><div class="sku">${product.sku}</div></div>
          ${supSkuHtml}
        </div>
        <script>
          new QRCode(document.getElementById("qrcode"), {
            text: "${qrUrl}",
            width: 72, 
            height: 72,
            colorDark : "#000000",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.M 
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

  const isCopied = copiedSkuId === product.id;
  const marginPercentage = product.costPrice && product.salePrice > 0 
    ? ((product.salePrice - product.costPrice) / product.salePrice * 100).toFixed(0)
    : 0;

  return (
    <div
      onClick={handleViewDetail}
      className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer border border-gray-100 hover:border-indigo-200 group overflow-hidden flex flex-col md:flex-row"
    >
      <div className="relative w-full md:w-48 bg-gray-50/50 flex items-center justify-center p-4 border-b md:border-b-0 md:border-r border-gray-100">
        <div className="w-32 h-32 md:w-36 md:h-36 relative aspect-square">
          {product.imageUrl && !imageError ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-contain drop-shadow-sm transition-transform duration-500 group-hover:scale-110"
              onError={() => setImageError(true)}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gray-100 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
          )}
        </div>
        
        <div className="absolute top-3 left-3">
          <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border ${
            product.active 
              ? 'bg-green-500/10 text-green-700 border-green-200' 
              : 'bg-red-500/10 text-red-700 border-red-200'
          }`}>
            {product.active ? 'Activo' : 'Inactivo'}
          </div>
        </div>
      </div>

      <div className="flex-1 p-5 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              {product.subcategoryName}
            </span>
            <span className="text-[10px] text-gray-400 font-medium">
              📅 Alta: {new Date(product.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </span>
          </div>

          <div className="flex items-start gap-2 group/title">
            <h3 
              onClick={(e) => handleCopyTitle(e, product.name)}
              className="font-bold text-gray-800 text-lg hover:text-indigo-600 transition-colors line-clamp-2 leading-tight"
              title="Clic para copiar título"
            >
              {product.name}
            </h3>
            <button
              onClick={(e) => handleCopyTitle(e, product.name)}
              className={`mt-0.5 p-1 rounded-md transition-all ${
                copiedTitle ? 'text-green-500 bg-green-50 scale-110' : 'text-gray-300 opacity-0 group-hover/title:opacity-100 hover:bg-gray-100 hover:text-indigo-500'
              }`}
            >
              {copiedTitle ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
              )}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-md">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">SKU</span>
              <code className="text-xs font-mono text-gray-700">{product.sku}</code>
              {onCopySku && (
                <button
                  onClick={(e) => onCopySku(product.sku, product.id, e)}
                  className={`p-0.5 rounded transition-colors ${isCopied ? 'text-green-500' : 'text-gray-400 hover:text-gray-700'}`}
                >
                  {isCopied ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>}
                </button>
              )}
            </div>

            {product.primarySupplierSku && product.primarySupplierSku !== '---' && (
              <div className="flex items-center gap-1.5 bg-indigo-50/50 border border-indigo-100 px-2.5 py-1 rounded-md" title={product.primarySupplierName || 'Proveedor'}>
                <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">PROV</span>
                <code className="text-xs font-mono text-indigo-700">{product.primarySupplierSku}</code>
                <button
                  onClick={(e) => handleCopySupplierSku(e, product.primarySupplierSku!)}
                  className={`p-0.5 rounded transition-colors ${copiedSupSku ? 'text-green-500' : 'text-indigo-400 hover:text-indigo-700'}`}
                >
                  {copiedSupSku ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-col xl:flex-row xl:items-end justify-between gap-4">
          <div className="flex items-center gap-4 divide-x divide-gray-200">
            <div className="pr-4">
              <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wider block mb-0.5">Precio Venta</span>
              <div className="font-bold text-gray-900 text-lg leading-none">
                ${product.salePrice?.toLocaleString('es-AR') || '0'}
              </div>
            </div>
            
            {/* 🔥 NUEVO: Muestra el precio de costo base de forma limpia */}
            <div className="px-4">
              <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wider block mb-0.5">Costo Base</span>
              <div className="font-semibold text-gray-600 text-base leading-none mt-1">
                ${product.costPrice?.toLocaleString('es-AR') || '0'}
              </div>
            </div>

            <div className="px-4">
              <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wider block mb-0.5">Stock</span>
              <div className={`font-bold text-lg leading-none flex items-center gap-1.5 ${product.currentStock === 0 ? 'text-red-600' : product.currentStock < 10 ? 'text-yellow-600' : 'text-green-600'}`}>
                {product.currentStock}
                {product.currentStock === 0 ? <span className="w-2 h-2 rounded-full bg-red-500" /> : product.currentStock < 10 ? <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" /> : null}
              </div>
            </div>

            {Number(marginPercentage) > 0 && (
              <div className="pl-4 hidden sm:block">
                <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wider block mb-0.5">Margen</span>
                <div className="font-semibold text-gray-600 text-sm leading-none mt-1">
                  {marginPercentage}%
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-2 xl:mt-0">
            <button
              onClick={handlePrintLabel}
              disabled={isPrinting}
              className="p-2 text-gray-500 bg-gray-50 hover:bg-gray-100 hover:text-gray-800 rounded-lg transition-colors border border-gray-200"
              title="Imprimir QR (50x25mm)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
            </button>

            <button
              onClick={handleShareSupplier}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                sharedSupplier 
                  ? 'bg-indigo-500 text-white border-indigo-500' 
                  : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'
              }`}
              title="Consultar a proveedor por WhatsApp"
            >
              {sharedSupplier ? '✅' : '🏭 Reponer'}
            </button>

            <button
              onClick={handleShareClient}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                sharedClient 
                  ? 'bg-green-500 text-white' 
                  : 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-100'
              }`}
              title="Copiar info para cliente"
            >
              {sharedClient ? '✅' : '💬 Cliente'}
            </button>

            <div className="w-px h-5 bg-gray-200 mx-1"></div>

            <button
              onClick={handleEdit}
              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title="Editar producto"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            </button>
            <button
              onClick={handleStatusToggle}
              className={`p-2 rounded-lg transition-colors ${
                product.active 
                  ? 'text-gray-400 hover:text-yellow-600 hover:bg-yellow-50' 
                  : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
              }`}
              title={product.active ? 'Desactivar producto (Soft Delete)' : 'Reactivar producto'}
            >
              {product.active 
                ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.543 7-1.275 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              }
            </button>
            <button
              onClick={handleHardDelete}
              className="p-2 text-gray-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              title="Eliminar Físicamente (Hard Delete)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;