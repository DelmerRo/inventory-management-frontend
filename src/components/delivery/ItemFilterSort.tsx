import React from 'react';

export type SortCriterion = 'sku' | 'name' | 'pending' | 'price';
export type SortDirection = 'asc' | 'desc';

interface ItemFilterSortProps {
    searchQuery: string;
    onSearchChange: (value: string) => void;
    sortBy: SortCriterion;
    onSortByChange: (criterion: SortCriterion) => void;
    sortDirection: SortDirection;
    onToggleDirection: () => void;
}

export const ItemFilterSort: React.FC<ItemFilterSortProps> = ({
    searchQuery,
    onSearchChange,
    sortBy,
    onSortByChange,
    sortDirection,
    onToggleDirection,
}) => {
    return (
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1">
                <input
                    type="text"
                    placeholder="🔍 Filtrar productos por SKU o Nombre..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                />
            </div>

            <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Ordenar:</span>
                    <select
                        value={sortBy}
                        onChange={(e) => onSortByChange(e.target.value as SortCriterion)}
                        className="bg-transparent text-xs font-bold text-gray-700 outline-none cursor-pointer"
                    >
                        <option value="sku">SKU Proveedor</option>
                        <option value="name">Nombre de Producto</option>
                        <option value="pending">Cantidad Faltante</option>
                        <option value="price">Costo Unitario ($)</option>
                    </select>
                </div>

                <button
                    type="button"
                    onClick={onToggleDirection}
                    className="p-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-xl transition-colors font-bold text-xs flex items-center gap-1"
                    title={sortDirection === 'asc' ? 'Orden Ascendente' : 'Orden Descendente'}
                >
                    <span>{sortDirection === 'asc' ? '⬆️' : '⬇️'}</span>
                </button>
            </div>
        </div>
    );
};