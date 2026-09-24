// pages/SupplyList.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { useSupplyStore } from '../store/supplyStore';
import type { SupplyResponse, SupplyRequest, SupplyMovementRequest } from '../types/supply';

const formatARS = (value: number) => 
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(value);

const PACKAGING_UNITS = [
    { value: 'unidad', label: 'Unidad (un)' },
    { value: 'm2', label: 'Metro cuadrado (m²)' },
    { value: 'ml', label: 'Metro lineal (ml)' },
    { value: 'rollo', label: 'Rollo' },
    { value: 'plancha', label: 'Plancha' },
    { value: 'caja', label: 'Caja' },
    { value: 'pack', label: 'Pack x unidades' },
    { value: 'kg', label: 'Kilogramo (kg)' },
    { value: 'gramos', label: 'Gramos (g)' }
];

const SupplyList: React.FC = () => {
    const { 
        supplies, 
        isLoading, 
        fetchSupplies, 
        createSupply, 
        updateSupply, 
        deactivateSupply,
        registerMovement,
        fetchMovements,
        selectedSupplyMovements,
        isMovementsLoading
    } = useSupplyStore();

    const [modalState, setModalState] = useState<'create' | 'edit' | 'stock' | null>(null);
    const [editingSupply, setEditingSupply] = useState<SupplyResponse | null>(null);
    const [activeSupplyForMovement, setActiveSupplyForMovement] = useState<SupplyResponse | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState<SupplyRequest>({
        name: '',
        description: '',
        unitMeasure: 'unidad',
        unitCost: 0,
        initialStock: 0
    });

    const [movementData, setMovementData] = useState<SupplyMovementRequest>({
        quantity: 1,
        movementType: 'ENTRADA',
        reason: '',
        unitCost: undefined
    });

    useEffect(() => {
        fetchSupplies();
    }, [fetchSupplies]);

    // Filtrado en tiempo real de insumos
    const filteredSupplies = useMemo(() => {
        return supplies.filter(s => 
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.description && s.description.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [supplies, searchTerm]);

    // Métricas del negocio (KPIs)
    const metrics = useMemo(() => {
        const totalCapital = supplies.reduce((acc, s) => acc + (s.unitCost * s.currentStock), 0);
        const criticalCount = supplies.filter(s => s.currentStock <= 10).length;
        return { totalCapital, criticalCount, totalItems: supplies.length };
    }, [supplies]);

    const handleOpenCreate = () => {
        setEditingSupply(null);
        setFormData({ name: '', description: '', unitMeasure: 'unidad', unitCost: 0, initialStock: 0 });
        setModalState('create');
    };

    const handleOpenEdit = (supply: SupplyResponse) => {
        setEditingSupply(supply);
        setFormData({
            name: supply.name,
            description: supply.description || '',
            unitMeasure: supply.unitMeasure,
            unitCost: supply.unitCost,
            initialStock: supply.currentStock
        });
        setModalState('edit');
    };

    const handleSaveSupply = async (e: React.FormEvent) => {
        e.preventDefault();
        let success = false;
        if (modalState === 'edit' && editingSupply) {
            success = await updateSupply(editingSupply.id, formData);
        } else {
            success = await createSupply(formData);
        }
        if (success) {
            setModalState(null);
        }
    };

    const handleOpenMovements = (supply: SupplyResponse) => {
        setActiveSupplyForMovement(supply);
        setMovementData({ quantity: 1, movementType: 'ENTRADA', reason: '', unitCost: supply.unitCost });
        fetchMovements(supply.id);
        setModalState('stock');
    };

    const handleSaveMovement = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeSupplyForMovement) return;
        const success = await registerMovement(activeSupplyForMovement.id, movementData);
        if (success) {
            setMovementData({ quantity: 1, movementType: 'ENTRADA', reason: '', unitCost: activeSupplyForMovement.unitCost });
        }
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('¿Estás seguro de que deseas desactivar este insumo?')) {
            await deactivateSupply(id);
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8">
            
            {/* Header de la Página */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">🏷️ Gestión de Insumos</h1>
                    <p className="text-gray-500 font-medium text-sm mt-1">Control de materiales de embalaje, etiquetas y suministros operativos</p>
                </div>
                <button
                    onClick={handleOpenCreate}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-2xl shadow-md transition flex items-center gap-2"
                >
                    <span>➕ Nuevo Insumo</span>
                </button>
            </div>

            {/* Panel de Métricas / KPIs Operativos */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="bg-indigo-50 p-3.5 rounded-2xl text-indigo-600 text-xl font-black">💰</div>
                    <div>
                        <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Capital en Insumos</p>
                        <p className="text-xl font-black text-gray-900">{formatARS(metrics.totalCapital)}</p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="bg-blue-50 p-3.5 rounded-2xl text-blue-600 text-xl font-black">📦</div>
                    <div>
                        <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Total de Insumos</p>
                        <p className="text-xl font-black text-gray-900">{metrics.totalItems} activos</p>
                    </div>
                </div>
                <div className={`p-5 rounded-3xl border shadow-sm flex items-center gap-4 ${metrics.criticalCount > 0 ? 'bg-red-50/60 border-red-100' : 'bg-emerald-50/60 border-emerald-100'}`}>
                    <div className={`p-3.5 rounded-2xl text-xl font-black ${metrics.criticalCount > 0 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                        {metrics.criticalCount > 0 ? '⚠️' : '✅'}
                    </div>
                    <div>
                        <p className={`text-[10px] font-extrabold uppercase tracking-wider ${metrics.criticalCount > 0 ? 'text-red-500' : 'text-emerald-600'}`}>Stock Crítico</p>
                        <p className={`text-xl font-black ${metrics.criticalCount > 0 ? 'text-red-700' : 'text-emerald-800'}`}>
                            {metrics.criticalCount} {metrics.criticalCount === 1 ? 'insumo bajo' : 'insumos bajos'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Barra de Búsqueda y Filtros con opción de limpiar */}
            <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative w-full sm:w-96">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">🔍</span>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar por nombre o descripción..."
                        className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                    {searchTerm && (
                        <button 
                            onClick={() => setSearchTerm('')}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 font-bold text-xs"
                            title="Limpiar búsqueda"
                        >
                            ✕
                        </button>
                    )}
                </div>
                <div className="text-xs font-bold text-gray-400 px-2">
                    Mostrando <span className="text-gray-800 font-black">{filteredSupplies.length}</span> de {supplies.length} insumos
                </div>
            </div>

            {/* Tabla de Insumos */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/70 border-b border-gray-100 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">
                                <th className="p-4 pl-6">Insumo</th>
                                <th className="p-4">Medida</th>
                                <th className="p-4">Costo Unitario</th>
                                <th className="p-4">Stock Actual</th>
                                <th className="p-4 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-sm">
                            {isLoading && supplies.length === 0 ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="p-4 pl-6 text-gray-400">Cargando insumos...</td>
                                    </tr>
                                ))
                            ) : filteredSupplies.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-400 font-medium">No se encontraron insumos que coincidan con la búsqueda.</td>
                                </tr>
                            ) : (
                                filteredSupplies.map((supply) => (
                                    <tr key={supply.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="p-4 pl-6">
                                            <p className="font-bold text-gray-900">{supply.name}</p>
                                            {supply.description && <p className="text-xs text-gray-400 truncate max-w-xs">{supply.description}</p>}
                                        </td>
                                        <td className="p-4 text-gray-600 font-medium">
                                            <span className="bg-gray-100 px-2.5 py-1 rounded-lg text-xs font-bold text-gray-700">{supply.unitMeasure}</span>
                                        </td>
                                        <td className="p-4 font-black text-gray-800">{formatARS(supply.unitCost)}</td>
                                        <td className="p-4">
                                            <span className={`px-3 py-1 rounded-xl text-xs font-black ${supply.currentStock > 10 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700 animate-pulse'}`}>
                                                {supply.currentStock} un.
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex justify-center items-center gap-2">
                                                <button
                                                    onClick={() => handleOpenMovements(supply)}
                                                    className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1"
                                                    title="Gestionar Stock / Historial"
                                                >
                                                    <span>🔄 Stock</span>
                                                </button>
                                                <button
                                                    onClick={() => handleOpenEdit(supply)}
                                                    className="bg-gray-100 text-gray-600 hover:bg-gray-200 px-3 py-1.5 rounded-xl text-xs font-bold transition"
                                                    title="Editar"
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(supply.id)}
                                                    className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-xl text-xs font-bold transition"
                                                    title="Desactivar"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ========================================== */}
            {/* MODAL CREAR / EDITAR INSUMO                */}
            {/* ========================================== */}
            {(modalState === 'create' || modalState === 'edit') && (
                <div 
                    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
                    style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}
                >
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl my-auto max-h-[90vh] flex flex-col relative z-50 animate-fade-in-up">
                        
                        <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-100 shrink-0">
                            <h2 className="text-xl font-black text-gray-900">
                                {modalState === 'edit' ? '✏️ Editar Insumo' : '➕ Nuevo Insumo'}
                            </h2>
                            <button 
                                type="button"
                                onClick={() => setModalState(null)} 
                                className="text-gray-400 hover:text-gray-600 font-bold p-2 rounded-xl hover:bg-gray-100 transition-colors"
                            >
                                ✕
                            </button>
                        </div>
                        
                        <div className="overflow-y-auto pr-1 flex-1">
                            <form id="supplyForm" onSubmit={handleSaveSupply} className="space-y-4 pb-2">
                                <div>
                                    <label className="block text-xs font-extrabold text-gray-500 uppercase mb-1">Nombre del Insumo</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                                        placeholder="Ej: Cartón Corrugado m2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-extrabold text-gray-500 uppercase mb-1">Descripción</label>
                                    <textarea
                                        value={formData.description || ''}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-20 font-medium"
                                        placeholder="Detalles adicionales..."
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-extrabold text-gray-500 uppercase mb-1">Unidad de Medida</label>
                                        <select
                                            value={formData.unitMeasure}
                                            onChange={(e) => setFormData({ ...formData, unitMeasure: e.target.value })}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                            {PACKAGING_UNITS.map((unit) => (
                                                <option key={unit.value} value={unit.value}>
                                                    {unit.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-extrabold text-gray-500 uppercase mb-1">Costo Unitario ($)</label>
                                        <input
                                            type="number"
                                            step="0.0001"
                                            required
                                            value={formData.unitCost}
                                            onChange={(e) => setFormData({ ...formData, unitCost: Number(e.target.value) })}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                                        />
                                    </div>
                                </div>
                                {modalState === 'create' && (
                                    <div>
                                        <label className="block text-xs font-extrabold text-gray-500 uppercase mb-1">Stock Inicial</label>
                                        <input
                                            type="number"
                                            value={formData.initialStock}
                                            onChange={(e) => setFormData({ ...formData, initialStock: Number(e.target.value) })}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                                        />
                                    </div>
                                )}
                            </form>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-gray-100 shrink-0">
                            <button
                                type="button"
                                onClick={() => setModalState(null)}
                                className="px-5 py-2.5 rounded-2xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                form="supplyForm"
                                disabled={isLoading}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-2xl text-sm font-bold shadow-md transition disabled:opacity-50"
                            >
                                {isLoading ? 'Guardando...' : 'Guardar Insumo'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================== */}
            {/* MODAL GESTIÓN DE STOCK E HISTORIAL         */}
            {/* ========================================== */}
            {modalState === 'stock' && activeSupplyForMovement && (
                <div 
                    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
                    style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}
                >
                    <div className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl my-auto max-h-[90vh] flex flex-col relative z-50 animate-fade-in-up">
                        
                        <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-100 shrink-0">
                            <div>
                                <h2 className="text-xl font-black text-gray-900">🔄 Stock: {activeSupplyForMovement.name}</h2>
                                <p className="text-xs text-gray-400 font-bold mt-0.5">Stock Actual: <span className="text-indigo-600">{activeSupplyForMovement.currentStock} {activeSupplyForMovement.unitMeasure}</span></p>
                            </div>
                            <button 
                                type="button"
                                onClick={() => setModalState(null)} 
                                className="text-gray-400 hover:text-gray-600 font-bold p-2 rounded-xl hover:bg-gray-100 transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="overflow-y-auto pr-1 flex-1">
                            <form id="movementForm" onSubmit={handleSaveMovement} className="bg-gray-50 p-5 rounded-2xl border border-gray-200 mb-6 space-y-4">
                                <p className="text-xs font-black text-gray-700 uppercase tracking-wider border-b border-gray-200 pb-2">Registrar Movimiento</p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-extrabold text-gray-500 uppercase mb-1">Tipo</label>
                                        <select
                                            value={movementData.movementType}
                                            onChange={(e) => setMovementData({ ...movementData, movementType: e.target.value as any })}
                                            className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="ENTRADA">ENTRADA (+)</option>
                                            <option value="SALIDA">SALIDA (-)</option>
                                            <option value="AJUSTE">AJUSTE (Físico)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-extrabold text-gray-500 uppercase mb-1">Cantidad</label>
                                        <input
                                            type="number"
                                            min="1"
                                            required
                                            value={movementData.quantity}
                                            onChange={(e) => setMovementData({ ...movementData, quantity: Number(e.target.value) })}
                                            className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                    {movementData.movementType === 'ENTRADA' && (
                                        <div>
                                            <label className="block text-[10px] font-extrabold text-gray-500 uppercase mb-1">Nuevo Costo ($)</label>
                                            <input
                                                type="number"
                                                step="0.0001"
                                                placeholder="Opcional"
                                                value={movementData.unitCost || ''}
                                                onChange={(e) => setMovementData({ ...movementData, unitCost: e.target.value ? Number(e.target.value) : undefined })}
                                                className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                                            />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-[10px] font-extrabold text-gray-500 uppercase mb-1">
                                        Motivo {movementData.movementType === 'AJUSTE' && <span className="text-red-500 ml-1">*Obligatorio</span>}
                                    </label>
                                    <input
                                        type="text"
                                        required={movementData.movementType === 'AJUSTE'}
                                        value={movementData.reason || ''}
                                        onChange={(e) => setMovementData({ ...movementData, reason: e.target.value })}
                                        placeholder="Ej: Compra / Rotura / Inventario físico"
                                        className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 font-medium"
                                    />
                                </div>
                                <div className="flex justify-end pt-2">
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow transition disabled:opacity-50"
                                    >
                                        {isLoading ? 'Registrando...' : 'Aplicar Movimiento'}
                                    </button>
                                </div>
                            </form>

                            <div>
                                <p className="text-xs font-black text-gray-700 uppercase tracking-wider mb-3">Historial Reciente</p>
                                {isMovementsLoading ? (
                                    <p className="text-xs text-gray-400 py-4 text-center bg-gray-50 rounded-xl">Cargando historial...</p>
                                ) : selectedSupplyMovements.length === 0 ? (
                                    <p className="text-xs text-gray-400 py-4 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">No hay movimientos registrados.</p>
                                ) : (
                                    <div className="space-y-3 pb-2">
                                        {selectedSupplyMovements.map((mov) => (
                                            <div key={mov.id} className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-sm flex justify-between items-center text-xs hover:border-gray-300 transition-colors">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1.5">
                                                        <span className={`px-2 py-0.5 rounded-md font-black text-[10px] tracking-wide ${
                                                            mov.movementType === 'ENTRADA' ? 'bg-emerald-100 text-emerald-800' :
                                                            mov.movementType === 'SALIDA' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                                                        }`}>
                                                            {mov.movementType}
                                                        </span>
                                                        <span className="font-bold text-gray-800 text-sm">{mov.quantity} un.</span>
                                                        <span className="text-gray-400">({formatARS(mov.unitCost)} c/u)</span>
                                                    </div>
                                                    <p className="text-gray-500 font-medium">{mov.reason || 'Sin observación'}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-black text-gray-900 text-sm">{formatARS(mov.totalValue)}</p>
                                                    <p className="text-[10px] text-gray-400 mt-1 font-medium">{new Date(mov.movementDate).toLocaleString('es-AR')}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupplyList;