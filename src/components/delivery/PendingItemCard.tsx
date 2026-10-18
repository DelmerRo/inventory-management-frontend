import React, { useId, useEffect, useRef, useCallback } from 'react';
import type { PendingReceivedItem } from '../../types/purchaseOrder';

export interface CatalogProductOption {
    supplierSku: string;
    productName: string;
    unitPrice: number;
}

interface PendingItemCardProps {
    item: PendingReceivedItem;
    catalogProducts?: CatalogProductOption[];
    isExtraItem?: boolean;
    autoFocusSku?: boolean;
    onUpdateQuantity: (item: PendingReceivedItem, quantity: number) => void;
    onUpdateUnitPrice: (item: PendingReceivedItem, price: number) => void;
    onUpdateExtraSku: (item: PendingReceivedItem, sku: string) => void;
    onUpdateExtraName: (item: PendingReceivedItem, name: string) => void;
    onRemoveExtra: (item: PendingReceivedItem) => void;
    onAddAnotherExtra?: () => void;
}

export const PendingItemCard: React.FC<PendingItemCardProps> = ({
    item,
    catalogProducts = [],
    isExtraItem = false,
    autoFocusSku = false,
    onUpdateQuantity,
    onUpdateUnitPrice,
    onUpdateExtraSku,
    onUpdateExtraName,
    onRemoveExtra,
    onAddAnotherExtra,
}) => {
    const isOriginal = item.orderedQuantity > 0;
    const maxToReceive = item.pendingQuantity;
    const isFilled = item.additionalQuantity > 0;
    const isSurplus = isOriginal && item.additionalQuantity > item.pendingQuantity;
    const willBeComplete = isOriginal && item.additionalQuantity === item.pendingQuantity;

    const datalistId = useId();
    
    // Refs para manejo ágil del Foco
    const skuInputRef = useRef<HTMLInputElement>(null);
    const nameInputRef = useRef<HTMLInputElement>(null);
    const quantityInputRef = useRef<HTMLInputElement>(null);
    const prevSkuRef = useRef<string>(item.supplierSku);

    // Auto-foco inicial en el SKU al crear un ítem extra
    useEffect(() => {
        if (autoFocusSku && skuInputRef.current) {
            skuInputRef.current.focus();
        }
    }, [autoFocusSku]);

    // Verificar coincidencia exacta en el catálogo
    const matchedProduct = !isOriginal && item.supplierSku
        ? catalogProducts.find(p => p.supplierSku.toUpperCase().trim() === item.supplierSku.toUpperCase().trim())
        : null;

    // ⚡ SALTO AUTOMÁTICO DE FOCUS AL DETECTAR COINCIDENCIA DE SKU
    useEffect(() => {
        if (!isOriginal && item.supplierSku !== prevSkuRef.current) {
            prevSkuRef.current = item.supplierSku;

            if (matchedProduct && quantityInputRef.current) {
                // Pequeño timeout para permitir que React renderice el precio/nombre autocompletados
                setTimeout(() => {
                    quantityInputRef.current?.focus();
                    quantityInputRef.current?.select();
                }, 50);
            }
        }
    }, [item.supplierSku, matchedProduct, isOriginal]);

    // Manejo inteligente de la tecla ENTER en el SKU
    const handleSkuKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (matchedProduct || item.supplierSku.trim().length > 0) {
                quantityInputRef.current?.focus();
                quantityInputRef.current?.select();
            } else {
                nameInputRef.current?.focus();
            }
        }
    };

    // Manejo inteligente de ENTER en la Cantidad (crea el siguiente ítem extra)
    const handleQuantityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && isExtraItem && onAddAnotherExtra) {
            e.preventDefault();
            onAddAnotherExtra();
        }
    };

    // Auto-seleccionar texto al enfocarse en cualquier input numérico
    const handleFocusSelect = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
        e.target.select();
    }, []);

    return (
        <div
            className={`p-4 md:p-5 rounded-2xl border transition-all relative overflow-hidden group flex flex-col md:flex-row md:items-center gap-4 ${
                isSurplus
                    ? 'bg-amber-50/90 border-amber-300 shadow-sm'
                    : isFilled
                    ? isExtraItem
                        ? 'bg-indigo-50/70 border-indigo-200 shadow-sm'
                        : 'bg-emerald-50/70 border-emerald-200 shadow-sm'
                    : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'
            }`}
        >
            {/* Indicador lateral */}
            <div
                className={`absolute left-0 top-0 bottom-0 w-1.5 transition-colors ${
                    isSurplus
                        ? 'bg-amber-500'
                        : isFilled
                        ? isExtraItem
                            ? 'bg-indigo-600'
                            : 'bg-emerald-500'
                        : isOriginal
                        ? 'bg-gray-300'
                        : 'bg-indigo-400'
                }`}
            />

            <div className="flex-1 pl-2">
                <div className="flex flex-wrap justify-between items-center mb-2 gap-2">
                    {isOriginal ? (
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] bg-gray-100 border border-gray-200 text-gray-700 font-black uppercase px-2.5 py-1 rounded-md font-mono">
                                SKU Proveedor: {item.supplierSku}
                            </span>
                            <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full border border-blue-100">
                                En Pedido
                            </span>
                        </div>
                    ) : (
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative">
                                <input
                                    ref={skuInputRef}
                                    type="text"
                                    list={datalistId}
                                    value={item.supplierSku}
                                    onChange={(e) => onUpdateExtraSku(item, e.target.value)}
                                    onKeyDown={handleSkuKeyDown}
                                    onFocus={handleFocusSelect}
                                    placeholder="SKU PROVEEDOR..."
                                    className="w-52 px-3 py-1.5 border border-indigo-300 bg-white rounded-xl font-mono text-xs uppercase focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-indigo-950 shadow-xs"
                                    required
                                />
                                <datalist id={datalistId}>
                                    {catalogProducts.map((p, idx) => (
                                        <option key={`${p.supplierSku}-${idx}`} value={p.supplierSku}>
                                            {p.productName} (${p.unitPrice.toLocaleString('es-AR')})
                                        </option>
                                    ))}
                                </datalist>
                            </div>

                            <span className="text-[10px] bg-indigo-600 text-white font-black px-2.5 py-1 rounded-lg uppercase tracking-wide shadow-xs">
                                ➕ Producto Extra
                            </span>

                            {matchedProduct && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1 animate-fade-in">
                                    <span>⚡</span> Autocompletado desde Catálogo
                                </span>
                            )}
                        </div>
                    )}

                    {!isOriginal && (
                        <button
                            type="button"
                            onClick={() => onRemoveExtra(item)}
                            className="text-red-500 hover:text-red-700 p-1.5 bg-red-50 hover:bg-red-100 rounded-xl transition-all border border-red-100 flex items-center gap-1 text-xs font-bold cursor-pointer"
                            title="Quitar este producto extra"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span className="hidden sm:inline">Quitar</span>
                        </button>
                    )}
                </div>

                {isOriginal ? (
                    <h4 className="font-bold text-gray-900 leading-snug mb-1 text-base">{item.productName}</h4>
                ) : (
                    <input
                        ref={nameInputRef}
                        type="text"
                        value={item.productName}
                        onChange={(e) => onUpdateExtraName(item, e.target.value)}
                        onFocus={handleFocusSelect}
                        placeholder="Nombre o descripción del producto extra..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none mb-1 bg-white shadow-xs"
                        required
                    />
                )}

                {isOriginal && (
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-gray-500 mt-1">
                        <span>Pedidas: <strong className="text-gray-800">{item.orderedQuantity}</strong></span>
                        <span>•</span>
                        <span className="text-emerald-700">Recibidas previas: {item.alreadyReceived}</span>
                        <span>•</span>
                        <span className="text-amber-700">Pendientes: {maxToReceive}</span>
                    </div>
                )}

                {/* Badges de estado */}
                {isSurplus ? (
                    <div className="text-xs mt-2 font-bold text-amber-800 flex items-center gap-1.5 bg-amber-100/80 px-2.5 py-1 rounded-lg w-fit border border-amber-200">
                        <span>⚠️</span>
                        <span>Sobrante registrado: +{item.additionalQuantity - item.pendingQuantity} un. por sobre lo solicitado</span>
                    </div>
                ) : willBeComplete ? (
                    <div className="text-xs mt-2 font-bold text-emerald-700 flex items-center gap-1 bg-emerald-100/80 px-2.5 py-1 rounded-lg w-fit">
                        <span>✅</span> Línea de pedido se completará totalmente.
                    </div>
                ) : isFilled && isOriginal ? (
                    <div className="text-xs mt-2 font-bold text-blue-700 flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-lg w-fit border border-blue-100">
                        <span>📦</span> Recibiendo {item.additionalQuantity} un. (Entrega parcial)
                    </div>
                ) : null}
            </div>

            {/* Panel de Entradas Numéricas */}
            <div className="flex gap-3 items-end w-full md:w-auto mt-2 md:mt-0 pt-3 md:pt-0 border-t border-gray-200/60 md:border-0 justify-between md:justify-end">
                <div className="w-1/2 md:w-32">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                        Precio Un. ($)
                    </label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                        <input
                            type="number"
                            value={item.unitPrice || ''}
                            onChange={(e) => onUpdateUnitPrice(item, parseFloat(e.target.value) || 0)}
                            onFocus={handleFocusSelect}
                            className="w-full pl-7 pr-2 py-2.5 border border-gray-300 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none text-right bg-white shadow-xs"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            required
                        />
                    </div>
                </div>

                <div className="w-1/2 md:w-36">
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">
                            A Recibir
                        </label>
                        {isOriginal && (
                            <div className="flex items-center gap-1">
                                {item.additionalQuantity > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => onUpdateQuantity(item, 0)}
                                        className="text-[9px] font-extrabold text-gray-500 bg-gray-100 hover:bg-gray-200 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                                        title="Limpiar a 0"
                                    >
                                        0
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => onUpdateQuantity(item, maxToReceive)}
                                    className="text-[9px] font-black text-indigo-700 bg-indigo-100 hover:bg-indigo-200 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                                    title="Recibir todo lo pendiente"
                                >
                                    TODO
                                </button>
                            </div>
                        )}
                    </div>

                    <input
                        ref={quantityInputRef}
                        type="number"
                        value={item.additionalQuantity}
                        onChange={(e) => onUpdateQuantity(item, parseInt(e.target.value) || 0)}
                        onKeyDown={handleQuantityKeyDown}
                        onFocus={handleFocusSelect}
                        className={`w-full px-3 py-2.5 border rounded-xl text-center text-lg font-black outline-none transition-all focus:ring-2 ${
                            isSurplus
                                ? 'bg-amber-100 border-amber-400 text-amber-950 focus:ring-amber-500'
                                : isFilled
                                ? isExtraItem
                                    ? 'bg-indigo-100 border-indigo-300 text-indigo-950 focus:ring-indigo-500'
                                    : 'bg-emerald-100 border-emerald-300 text-emerald-950 focus:ring-emerald-500'
                                : 'bg-white border-gray-300 text-gray-800 focus:ring-indigo-500'
                        }`}
                        min="0"
                        placeholder="0"
                    />
                </div>
            </div>
        </div>
    );
};