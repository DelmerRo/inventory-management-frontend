// src/utils/folderHelper.ts

/**
 * Dispara el protocolo local de Windows para buscar la carpeta de categoría/subcategoría
 * existente y crear/abrir la carpeta con el SKU.
 */
export const openProductFolder = (
  categoryName?: string,
  subcategoryName?: string,
  sku?: string
) => {
  if (!sku || sku.trim() === '' || sku.includes('---')) {
    alert('⚠️ El producto no tiene un SKU definitivo asignado aún.');
    return;
  }

  const cat = categoryName?.trim() || 'Sin_Categoria';
  const subcat = subcategoryName?.trim() || 'Sin_Subcategoria';
  const cleanSku = sku.trim().toUpperCase();

  const uri = `utama-folder://${encodeURIComponent(cat)}/${encodeURIComponent(subcat)}/${encodeURIComponent(cleanSku)}`;
  window.location.href = uri;
};