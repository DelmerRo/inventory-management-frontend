import React, { useState, useEffect, useMemo } from 'react';
import { productApi } from '../api/products';
import { supplyApi } from '../api/supplies';
import type { ProductDetail } from '../types/product';

export interface PackagingRecipeItemRequest {
  supplyId: number;
  calculationType: 'FIJO' | 'AREA_CM2' | 'PERIMETRO_CM';
  multiplier: number;
}

interface SupplyItem {
  id: number;
  name: string;
  unitMeasure: string;
  unitCost: number;
  currentStock: number;
  active: boolean;
}

interface PackagingRecipeModalProps {
  product: ProductDetail;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedProduct: ProductDetail) => void;
}

export const PackagingRecipeModal: React.FC<PackagingRecipeModalProps> = ({
  product,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [supplies, setSupplies] = useState<SupplyItem[]>([]);
  const [recipes, setRecipes] = useState<PackagingRecipeItemRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // CÁLCULOS BASE EN VIVO PARA FEEDBACK VISUAL
  const productMetrics = useMemo(() => {
    const l = product.length || 0;
    const w = product.width || 0;
    const h = product.height || 0;
    const hasDimensions = l > 0 && w > 0 && h > 0;

    const perimeter = hasDimensions ? (l + w + h) * 2 : 0;
    const area = hasDimensions ? ((l * w) + (l * h) + (w * h)) * 2 : 0;

    return { hasDimensions, perimeter, area, unit: product.measureUnit || 'cm' };
  }, [product]);

  useEffect(() => {
    if (isOpen) {
      loadSupplies();
      // AHORA CARGA LA FÓRMULA ORIGINAL, NO EL RESULTADO
      if (product.packagingBreakdown && product.packagingBreakdown.length > 0) {
        const existingRecipes: PackagingRecipeItemRequest[] = product.packagingBreakdown.map((item: any) => ({
          supplyId: item.supplyId,
          calculationType: item.calculationType || 'FIJO', 
          multiplier: item.multiplier || 1 
        }));
        setRecipes(existingRecipes);
      } else {
        setRecipes([]);
      }
    }
  }, [isOpen, product]);

  const loadSupplies = async () => {
    setIsLoading(true);
    try {
      const data = await supplyApi.getAll();
      setSupplies(data.filter((s: any) => s.active));
    } catch (error) {
      console.error('Error al cargar insumos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRow = () => {
    setRecipes([...recipes, { supplyId: supplies[0]?.id || 0, calculationType: 'FIJO', multiplier: 1 }]);
  };

  const handleRemoveRow = (index: number) => {
    setRecipes(recipes.filter((_, i) => i !== index));
  };

  const handleChangeRow = (index: number, field: keyof PackagingRecipeItemRequest, value: any) => {
    const updated = [...recipes];
    updated[index] = { ...updated[index], [field]: value };
    setRecipes(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const updatedProduct = await productApi.updatePackagingRecipe(product.id, recipes);
      onSuccess(updatedProduct);
      onClose();
    } catch (error: any) {
      alert(error.message || 'Error al guardar la receta de empaque');
    } finally {
      setIsSubmitting(false);
    }
  };

  // HELPER PARA RENDERIZAR UX INTUITIVA (CON CONVERSIÓN DE UNIDADES)
  const getStrategyUX = (type: string, multiplier: number, supply?: SupplyItem) => {
    if (!productMetrics.hasDimensions && type !== 'FIJO') {
      return { label: "Valor", warning: "⚠️ Producto sin medidas", preview: "No calculable" };
    }

    const sm = supply?.unitMeasure || 'un';

    switch (type) {
      case 'FIJO':
        return { label: "Cantidad Exacta", warning: null, preview: `Gasto: ${multiplier} ${sm}` };
      case 'PERIMETRO_CM':
        // Convierte centímetros a metros (÷ 100)
        const calcPer = ((productMetrics.perimeter / 100) * multiplier).toFixed(3);
        return { label: "Multiplicador / Vueltas", warning: null, preview: `Base ${productMetrics.perimeter}${productMetrics.unit} = Gasto: ${calcPer} ${sm}` };
      case 'AREA_CM2':
        // Convierte centímetros cuadrados a metros cuadrados (÷ 10000)
        const calcArea = ((productMetrics.area / 10000) * multiplier).toFixed(3);
        return { label: "Multiplicador / Capas", warning: null, preview: `Base ${productMetrics.area}${productMetrics.unit}² = Gasto: ${calcArea} ${sm}` };
      default:
        return { label: "Multiplicador", warning: null, preview: "" };
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 bg-gray-900 text-white flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2">📦 Receta de Empaque</h2>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 bg-gray-50/50">
          
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Producto a empacar</span>
              <span className="text-lg font-black text-gray-900">{product.name}</span>
            </div>
            <div className="flex gap-4 text-sm bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
              <div><span className="text-gray-400 font-medium">Perímetro vol.:</span> <span className="font-bold">{productMetrics.perimeter} {productMetrics.unit}</span></div>
              <div className="border-l border-gray-200 pl-4"><span className="text-gray-400 font-medium">Área total:</span> <span className="font-bold">{productMetrics.area} {productMetrics.unit}²</span></div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Materiales a utilizar</label>
              <button type="button" onClick={handleAddRow} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm">
                + Agregar Material
              </button>
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-gray-400">Cargando catálogo...</div>
            ) : recipes.length === 0 ? (
              <div className="text-center py-12 bg-white border-2 border-dashed border-gray-200 rounded-2xl text-gray-400">
                <p className="font-medium mb-1">No has definido cómo se empaca este producto.</p>
                <p className="text-xs">Añade cajas o cintas para calcular tu costo real.</p>
              </div>
            ) : (
              recipes.map((recipe, index) => {
                const selectedSupply = supplies.find(s => s.id === recipe.supplyId);
                const ux = getStrategyUX(recipe.calculationType, recipe.multiplier, selectedSupply);

                return (
                  <div key={index} className={`bg-white p-5 rounded-2xl border shadow-sm flex flex-col gap-4 relative transition-all ${ux.warning ? 'border-amber-300 bg-amber-50/10' : 'border-gray-200'}`}>
                    
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                      <div className="md:col-span-5">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Insumo</label>
                        <select
                          value={recipe.supplyId}
                          onChange={(e) => handleChangeRow(index, 'supplyId', Number(e.target.value))}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                          <option value="0" disabled>Seleccionar...</option>
                          {supplies.map(sup => (
                            <option key={sup.id} value={sup.id}>{sup.name} ({sup.unitMeasure})</option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-4">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Estrategia Matemática</label>
                        <select
                          value={recipe.calculationType}
                          onChange={(e) => handleChangeRow(index, 'calculationType', e.target.value as any)}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                          <option value="FIJO">Fijo (Unidades/Cajas)</option>
                          <option value="PERIMETRO_CM">Perímetro (Cintas)</option>
                          <option value="AREA_CM2">Área (Pluribol/Film)</option>
                        </select>
                      </div>

                      <div className="md:col-span-3 relative">
                        <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${ux.warning ? 'text-amber-600' : 'text-indigo-600'}`}>
                          {ux.label}
                        </label>
                        <input
                          type="number"
                          step="0.0001"
                          min="0.0001"
                          value={recipe.multiplier}
                          onChange={(e) => handleChangeRow(index, 'multiplier', parseFloat(e.target.value) || 0)}
                          className={`w-full px-3 py-2.5 border rounded-xl text-sm font-black text-center focus:ring-2 outline-none ${ux.warning ? 'border-amber-300 bg-amber-50 focus:ring-amber-500' : 'border-indigo-200 bg-indigo-50 focus:ring-indigo-500 text-indigo-900'}`}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 mt-1 border-t border-gray-100">
                      <div className="text-xs font-medium">
                        {ux.warning ? (
                          <span className="text-amber-600">{ux.warning}</span>
                        ) : (
                          <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">💡 {ux.preview}</span>
                        )}
                      </div>
                      <button type="button" onClick={() => handleRemoveRow(index)} className="text-xs font-bold text-rose-500 hover:bg-rose-50 px-2 py-1 rounded-md transition-colors">
                        Eliminar
                      </button>
                    </div>

                  </div>
                );
              })
            )}
          </div>

          <div className="flex justify-end gap-3 pt-6">
            <button type="button" onClick={onClose} className="px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting || recipes.length === 0} className="px-8 py-3 bg-gray-900 text-white rounded-xl font-bold shadow-sm disabled:opacity-50">
              {isSubmitting ? 'Guardando...' : 'Confirmar Receta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};