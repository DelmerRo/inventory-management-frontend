import React from 'react';
import type { PendingReceivedItem } from '../../types/purchaseOrder';

interface PendingItemCardProps {
    item: PendingReceivedItem;
    onUpdateQuantity: (item: PendingReceivedItem, quantity: number) => void;
    onUpdateUnitPrice: (item: PendingReceivedItem, price: number) => void;
    onUpdateExtraSku: (item: PendingReceivedItem, sku: string) => void;
    onUpdateExtraName: (item: PendingReceivedItem, name: string) => void;
    onRemoveExtra: (item: PendingReceivedItem) => void;
}

export const PendingItemCard: React.FC<PendingItemCardProps> = ({
    item,
    onUpdateQuantity,
    onUpdateUnitPrice,
    onUpdateExtraSku,
    onUpdateExtraName,
    onRemoveExtra,
}) => {
    const isOriginal = item.orderedQuantity > 0;
    const maxToReceive = item.pendingQuantity;
    const isFilled = item.additionalQuantity > 0;
    const isSurplus = isOriginal && item.additionalQuantity > item.pendingQuantity;
    const willBeComplete = isOriginal && item.additionalQuantity === item.pendingQuantity;

    return (
        <div
            className={`p-4 md:p-5 rounded-2xl border transition-all relative overflow-hidden group flex flex-col md:flex-row md:items-center gap-4 ${
                isSurplus
                    ? 'bg-amber-50 border-amber-300'
                    : isFilled
                    ? 'bg-green-50 border-green-200'
                    : 'bg-white border-gray-200 hover:border-indigo-200 shadow-sm'
            }`}
        >
            <div
                className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                    isSurplus
                        ? 'bg-amber-500'
                        : isFilled
                        ? 'bg-green-400'
                        : isOriginal
                        ? 'bg-gray-200'
                        : 'bg-indigo-400'
                }`}
            ></div>

            <div className="flex-1 pl-2">
                <div className="flex justify-between items-start mb-2">
                    {isOriginal ? (
                        <span className="text-[10px] bg-white border border-gray-200 text-gray-600 font-black uppercase px-2 py-1 rounded shadow-sm font-mono">
                            {item.supplierSku}
                        </span>
                    ) : (
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={item.supplierSku}
                                onChange={(e) => onUpdateExtraSku(item, e.target.value)}
                                placeholder="INGRESAR SKU"
                                className="w-36 px-2.5 py-1 border border-indigo-200 bg-indigo-50 rounded font-mono text-xs uppercase focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-indigo-900"
                                required
                            />
                            <span className="text-[9px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded uppercase">
                                Extra
                            </span>
                        </div>
                    )}

                    {!isOriginal && (
                        <button
                            type="button"
                            onClick={() => onRemoveExtra(item)}
                            className="md:hidden text-red-400 hover:text-red-600 p-1 bg-red-50 rounded-lg"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    )}
                </div>

                {isOriginal ? (
                    <h4 className="font-bold text-gray-900 leading-tight mb-1">{item.productName}</h4>
                ) : (
                    <input
                        type="text"
                        value={item.productName}
                        onChange={(e) => onUpdateExtraName(item, e.target.value)}
                        placeholder="Nombre / Descripción del Producto Extra..."
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none mb-1 bg-white"
                        required
                    />
                )}

                {isOriginal && (
                    <div className="flex gap-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                        <span>Pedido: {item.orderedQuantity}</span>
                        <span>|</span>
                        <span className="text-green-600">Recibido: {item.alreadyReceived}</span>
                        <span>|</span>
                        <span className="text-yellow-600">Falta: {maxToReceive}</span>
                    </div>
                )}

                {isSurplus ? (
                    <div className="text-xs mt-2 font-bold text-amber-700 flex items-center gap-1">
                        <span>⚠️ Sobrante:</span>
                        <span>+{item.additionalQuantity - item.pendingQuantity} un. sobre lo solicitado</span>
                    </div>
                ) : willBeComplete ? (
                    <div className="text-xs mt-2 font-bold text-green-600">✅ Se completará la línea de pedido</div>
                ) : isFilled && isOriginal ? (
                    <div className="text-xs mt-2 font-bold text-blue-600">
                        📦 Recibiendo {item.additionalQuantity} unidades parcialmente
                    </div>
                ) : null}
            </div>

            <div className="flex gap-3 items-end w-full md:w-auto mt-2 md:mt-0 pt-3 md:pt-0 border-t border-gray-100 md:border-0">
                <div className="w-1/2 md:w-28">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                        Costo Un.
                    </label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">\$</span>
                        <input
                            type="number"
                            value={item.unitPrice || ''}
                            onChange={(e) => onUpdateUnitPrice(item, parseFloat(e.target.value) || 0)}
                            className="w-full pl-6 pr-2 py-2.5 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none text-right bg-white"
                            step="0.01"
                            min="0"
                            required
                        />
                    </div>
                </div>

                <div className="w-1/2 md:w-32">
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                            Cant. Recibida
                        </label>
                        {isOriginal && maxToReceive > 0 && (
                            <button
                                type="button"
                                onClick={() => onUpdateQuantity(item, maxToReceive)}
                                className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-1.5 rounded hover:bg-indigo-100 transition-colors"
                            >
                                TODO
                            </button>
                        )}
                    </div>
                    <input
                        type="number"
                        value={item.additionalQuantity}
                        onChange={(e) => onUpdateQuantity(item, parseInt(e.target.value) || 0)}
                        className={`w-full px-3 py-2.5 border rounded-xl text-center text-lg font-black outline-none transition-all focus:ring-2 focus:ring-indigo-500 ${
                            isSurplus
                                ? 'bg-amber-100 border-amber-400 text-amber-900'
                                : isFilled
                                ? 'bg-green-100 border-green-300 text-green-800'
                                : 'bg-white border-gray-200'
                        }`}
                        min="0"
                        placeholder="0"
                    />
                </div>

                {!isOriginal && (
                    <button
                        type="button"
                        onClick={() => onRemoveExtra(item)}
                        className="hidden md:flex p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
};