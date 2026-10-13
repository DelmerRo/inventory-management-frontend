// pages/StockReconciliationPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { useProductStore } from '../store/productStore';

interface CsvRow {
  [key: string]: string;
}

export interface ChannelFileData {
  name: string;
  data: CsvRow[];
  headers: string[];
  skuColumn: string;
  stockColumn: string;
}

export interface ReconciliationRow {
  sku: string;
  productId?: number;
  productName: string;
  systemStock: number | null;
  meliStock: number | null;
  tnStock: number | null;
  status: 'pending' | 'updating' | 'updated' | 'skipped';
  isDiscrepancy: boolean;
  isPlatformMismatch: boolean;
  missingInSystem: boolean;
  missingInMeli: boolean;
  missingInTn: boolean;
}

type TabCategory = 'discrepancies' | 'platformMismatch' | 'missingSystem' | 'missingChannels' | 'all';

const StockReconciliationPage: React.FC = () => {
  const navigate = useNavigate();

  // Estados de Archivos
  const [meliFile, setMeliFile] = useState<ChannelFileData | null>(null);
  const [tnFile, setTnFile] = useState<ChannelFileData | null>(null);

  // Estados de Procesamiento
  const [step, setStep] = useState<1 | 2>(1);
  const [isComparing, setIsComparing] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabCategory>('discrepancies');
  const [searchQuery, setSearchQuery] = useState('');

  // Matriz de Auditoría
  const [rows, setRows] = useState<ReconciliationRow[]>([]);
  const [customInputs, setCustomInputs] = useState<Record<number, number>>({});

  const { fetchProducts, updateStock } = useProductStore();

  // 🚀 PARSER UNIVERSAL (.xlsx, .xls y .csv)
  const parseFile = (file: File, channel: 'meli' | 'tn') => {
    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          const workbook = XLSX.read(buffer, { type: 'array' });

          // 1. Detección inteligente de pestaña (Priorizar 'Publicaciones' y omitir 'Ayuda')
          let targetSheetName = workbook.SheetNames.find(
            name => name.toLowerCase().includes('publicacio') || name.toLowerCase().includes('publicaciones')
          );

          if (!targetSheetName) {
            targetSheetName = workbook.SheetNames.find(
              name => !name.toLowerCase().includes('ayuda') && !name.toLowerCase().includes('help')
            ) || workbook.SheetNames[0];
          }

          const worksheet = workbook.Sheets[targetSheetName];
          if (!worksheet) {
            alert(`No se pudo encontrar la hoja de datos en el archivo Excel.`);
            return;
          }

          // 2. Convertir hoja a matriz de filas para ubicar la cabecera real
          const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });

          if (!rawRows || rawRows.length === 0) {
            alert('El archivo Excel está vacío.');
            return;
          }

          // Buscar la fila que contiene las columnas 'SKU' o 'Stock en tu depósito'
          let headerIndex = rawRows.findIndex(row =>
            Array.isArray(row) && row.some(cell => {
              const strVal = String(cell).trim().toLowerCase();
              return strVal === 'sku' || strVal.includes('stock en tu depósito') || strVal.includes('stock');
            })
          );

          if (headerIndex === -1) headerIndex = 0;

          const headers = (rawRows[headerIndex] as any[]).map(c => String(c).trim()).filter(Boolean);
          const dataRows = rawRows.slice(headerIndex + 1);

          // 3. Mapear datos descartando filas secundarias de aclaraciones (ej: "Obligatorio")
          const cleanData: CsvRow[] = [];

          dataRows.forEach(rowArr => {
            const rowObj: CsvRow = {};
            let isNoteRow = false;

            headers.forEach((header, colIdx) => {
              const cellVal = rowArr[colIdx] !== undefined ? String(rowArr[colIdx]).trim() : '';
              if (cellVal.toLowerCase() === 'obligatorio') {
                isNoteRow = true;
              }
              rowObj[header] = cellVal;
            });

            // Solo agregamos la fila si no es una fila descriptiva "Obligatorio" y tiene datos
            if (!isNoteRow && Object.values(rowObj).some(v => v !== '')) {
              cleanData.push(rowObj);
            }
          });

          // Auto-detección de columnas para MercadoLibre / Tiendanube
          const skuMatch = headers.find(h => 
            h.toUpperCase() === 'SKU' || 
            h.toLowerCase().includes('código') || 
            h.toLowerCase().includes('codigo')
          ) || headers[0] || '';

          const stockMatch = headers.find(h => 
            h.toLowerCase().includes('stock en tu depósito') ||
            h.toLowerCase().includes('stock') ||
            h.toLowerCase().includes('cantidad') ||
            h.toLowerCase().includes('disponible')
          ) || '';

          const fileData: ChannelFileData = {
            name: file.name,
            data: cleanData,
            headers,
            skuColumn: skuMatch,
            stockColumn: stockMatch
          };

          if (channel === 'meli') setMeliFile(fileData);
          else setTnFile(fileData);

        } catch (err: any) {
          console.error(err);
          alert(`Error procesando archivo Excel: ${err.message}`);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      // Manejo de CSV estándar vía PapaParse
      Papa.parse<CsvRow>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.meta.fields) {
            const headers = results.meta.fields.map(h => h.trim());

            const skuMatch = headers.find(h => {
              const lh = h.toLowerCase();
              return lh === 'sku' || lh.includes('código') || lh.includes('codigo');
            }) || '';

            const stockMatch = headers.find(h => {
              const lh = h.toLowerCase();
              return (
                lh.includes('stock en tu depósito') ||
                lh.includes('stock') ||
                lh.includes('cantidad') ||
                lh.includes('disponible')
              );
            }) || '';

            const cleanData = results.data.filter(row => {
              const vals = Object.values(row).map(v => String(v).toLowerCase());
              return !vals.includes('obligatorio');
            });

            const fileData: ChannelFileData = {
              name: file.name,
              data: cleanData,
              headers,
              skuColumn: skuMatch,
              stockColumn: stockMatch
            };

            if (channel === 'meli') setMeliFile(fileData);
            else setTnFile(fileData);
          }
        },
        error: (err) => {
          alert(`Error procesando CSV de ${channel === 'meli' ? 'MercadoLibre' : 'Tiendanube'}: ${err.message}`);
        }
      });
    }
  };

  // Motor de Triangulación
  const handleRunReconciliation = async () => {
    if (!meliFile && !tnFile) {
      alert('Debes subir al menos un archivo (Excel o CSV) para auditoría.');
      return;
    }

    if (meliFile && (!meliFile.skuColumn || !meliFile.stockColumn)) {
      alert('Mapea las columnas de SKU y Stock para MercadoLibre.');
      return;
    }

    if (tnFile && (!tnFile.skuColumn || !tnFile.stockColumn)) {
      alert('Mapea las columnas de SKU y Stock para Tiendanube.');
      return;
    }

    setIsComparing(true);

    try {
      await fetchProducts();
      const currentProducts = useProductStore.getState().products;

      const meliMap = new Map<string, number>();
      const tnMap = new Map<string, number>();
      const allSkus = new Set<string>();

      if (meliFile) {
        meliFile.data.forEach(row => {
          const sku = row[meliFile.skuColumn]?.trim();
          if (sku) {
            const rawStock = row[meliFile.stockColumn];
            const stock = parseInt(rawStock, 10);
            meliMap.set(sku, isNaN(stock) ? 0 : stock);
            allSkus.add(sku);
          }
        });
      }

      if (tnFile) {
        tnFile.data.forEach(row => {
          const sku = row[tnFile.skuColumn]?.trim();
          if (sku) {
            const rawStock = row[tnFile.stockColumn];
            const stock = parseInt(rawStock, 10);
            tnMap.set(sku, isNaN(stock) ? 0 : stock);
            allSkus.add(sku);
          }
        });
      }

      currentProducts.forEach(prod => {
        if (prod.sku && prod.active) {
          allSkus.add(prod.sku);
        }
      });

      const matrix: ReconciliationRow[] = [];

      allSkus.forEach(sku => {
        const product = currentProducts.find(p => p.sku === sku);
        const hasMeli = meliMap.has(sku);
        const hasTn = tnMap.has(sku);

        const sysStock = product ? product.currentStock : null;
        const meliStock = hasMeli ? meliMap.get(sku)! : null;
        const tnStock = hasTn ? tnMap.get(sku)! : null;

        const isMissingInSystem = sysStock === null;
        const isMissingInMeli = meliFile !== null && meliStock === null;
        const isMissingInTn = tnFile !== null && tnStock === null;

        const isPlatformMismatch = (
          meliFile !== null && 
          tnFile !== null && 
          hasMeli && 
          hasTn && 
          meliStock !== tnStock
        );

        let isDiscrepancy = false;
        if (sysStock !== null) {
          if (meliStock !== null && sysStock !== meliStock) isDiscrepancy = true;
          if (tnStock !== null && sysStock !== tnStock) isDiscrepancy = true;
        }

        matrix.push({
          sku,
          productId: product?.id,
          productName: product?.name || '--- (No existe en My Inventory)',
          systemStock: sysStock,
          meliStock,
          tnStock,
          status: 'pending',
          isDiscrepancy,
          isPlatformMismatch,
          missingInSystem: isMissingInSystem,
          missingInMeli: isMissingInMeli,
          missingInTn: isMissingInTn
        });
      });

      setRows(matrix);

      if (matrix.some(r => r.isDiscrepancy)) setActiveTab('discrepancies');
      else if (matrix.some(r => r.isPlatformMismatch)) setActiveTab('platformMismatch');
      else if (matrix.some(r => r.missingInSystem)) setActiveTab('missingSystem');
      else setActiveTab('all');

      setStep(2);
    } catch (err) {
      console.error('Error al conciliar:', err);
      alert('Error ejecutando la conciliación.');
    } finally {
      setIsComparing(false);
    }
  };

  // Remediación Individual
  const handleApplyAdjustment = async (row: ReconciliationRow, targetStock: number) => {
    if (!row.productId || row.systemStock === null) return;

    const difference = targetStock - row.systemStock;
    if (difference === 0) return;

    setRows(prev => prev.map(r => r.sku === row.sku ? { ...r, status: 'updating' } : r));

    try {
      const isAdd = difference > 0;
      const quantity = Math.abs(difference);

      await updateStock(
        row.productId, 
        quantity, 
        isAdd, 
        `Conciliación omnicanal (${meliFile ? 'ML' : ''}${meliFile && tnFile ? '/' : ''}${tnFile ? 'TN' : ''})`, 
        "Admin"
      );

      setRows(prev => prev.map(r => {
        if (r.sku === row.sku) {
          return {
            ...r,
            systemStock: targetStock,
            isDiscrepancy: (r.meliStock !== null && r.meliStock !== targetStock) || (r.tnStock !== null && r.tnStock !== targetStock),
            status: 'updated'
          };
        }
        return r;
      }));
    } catch (err) {
      console.error(err);
      alert(`Error ajustando ${row.sku}`);
      setRows(prev => prev.map(r => r.sku === row.sku ? { ...r, status: 'pending' } : r));
    }
  };

  // Remediación Masiva (Bulk Actions)
  const handleBulkRemediate = async (source: 'meli' | 'tn') => {
    const targetRows = rows.filter(r => 
      r.status === 'pending' && 
      r.isDiscrepancy && 
      r.productId && 
      (source === 'meli' ? r.meliStock !== null : r.tnStock !== null)
    );

    if (targetRows.length === 0) {
      alert(`No hay descalces pendientes con valor disponible en ${source === 'meli' ? 'MercadoLibre' : 'Tiendanube'}.`);
      return;
    }

    const confirmMsg = `¿Deseas aplicar en masa los cambios de stock para ${targetRows.length} productos usando los valores de ${source === 'meli' ? 'MercadoLibre' : 'Tiendanube'}?`;
    if (!window.confirm(confirmMsg)) return;

    setIsBulkProcessing(true);

    for (const row of targetRows) {
      const targetVal = source === 'meli' ? row.meliStock! : row.tnStock!;
      await handleApplyAdjustment(row, targetVal);
    }

    setIsBulkProcessing(false);
  };

  // Exportar Reporte de Auditoría
  const handleExportAuditCSV = () => {
    if (rows.length === 0) return;

    const csvContent = [
      ['SKU', 'Producto', 'Stock Sistema', 'Stock ML', 'Stock TN', 'Estado Descalce', 'Diferencia ML', 'Diferencia TN'],
      ...rows.map(r => [
        `"${r.sku}"`,
        `"${(r.productName || '').replace(/"/g, '""')}"`,
        r.systemStock !== null ? r.systemStock : 'N/A',
        r.meliStock !== null ? r.meliStock : 'N/A',
        r.tnStock !== null ? r.tnStock : 'N/A',
        r.isDiscrepancy ? 'Diferencia' : r.missingInSystem ? 'Falta en ERP' : 'Sincronizado',
        r.systemStock !== null && r.meliStock !== null ? r.meliStock - r.systemStock : 'N/A',
        r.systemStock !== null && r.tnStock !== null ? r.tnStock - r.systemStock : 'N/A'
      ])
    ].map(e => e.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `auditoria_stock_omnicanal_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Métricas
  const totalAnalyzed = rows.length;
  const discrepanciesCount = rows.filter(r => r.isDiscrepancy).length;
  const platformMismatchCount = rows.filter(r => r.isPlatformMismatch).length;
  const missingInSystemCount = rows.filter(r => r.missingInSystem).length;
  const missingInChannelsCount = rows.filter(r => r.missingInMeli || r.missingInTn).length;

  // Filtrado general (Tab + Búsqueda)
  const filteredRows = rows.filter(row => {
    const matchesTab = 
      activeTab === 'discrepancies' ? row.isDiscrepancy :
      activeTab === 'platformMismatch' ? row.isPlatformMismatch :
      activeTab === 'missingSystem' ? row.missingInSystem :
      activeTab === 'missingChannels' ? (row.missingInMeli || row.missingInTn) :
      true;

    const query = searchQuery.toLowerCase().trim();
    const matchesQuery = !query || 
      row.sku.toLowerCase().includes(query) || 
      (row.productName || '').toLowerCase().includes(query);

    return matchesTab && matchesQuery;
  });

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-6">
      
      {/* Barra Superior */}
      <div className="flex justify-between items-center flex-wrap gap-4 pb-3 border-b border-gray-200">
        <div>
          <button 
            onClick={() => navigate('/products')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 mb-1"
          >
            ← Volver a Productos
          </button>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            🔄 Centro de Auditoría y Conciliación Omnicanal
          </h1>
          <p className="text-xs text-gray-500">
            Triangulación de stock: My Inventory ERP vs. MercadoLibre vs. Tiendanube
          </p>
        </div>

        {step === 2 && (
          <div className="flex gap-2">
            <button
              onClick={handleExportAuditCSV}
              className="bg-gray-100 text-gray-700 hover:bg-gray-200 font-semibold text-xs px-3 py-2 rounded-lg border border-gray-300 transition flex items-center gap-1"
            >
              📥 Exportar Auditoría CSV
            </button>
            <button 
              onClick={() => setStep(1)}
              className="bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs px-3 py-2 rounded-lg border border-blue-200 transition"
            >
              ⚙️ Cambiar Archivos
            </button>
          </div>
        )}
      </div>

      {/* PASO 1: CARGA DE ARCHIVOS (.XLSX / .CSV) */}
      {step === 1 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          <div className="border-l-4 border-blue-600 pl-4">
            <h2 className="text-lg font-bold text-gray-800">1. Selecciona los Archivos (Excel .xlsx o CSV)</h2>
            <p className="text-xs text-gray-500">Soporta las planillas multinivel nativas exportadas por MercadoLibre y Tiendanube.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* MercadoLibre */}
            <div className="border-2 border-dashed border-yellow-300 bg-yellow-50/30 rounded-xl p-5 space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-bold text-yellow-900 text-sm flex items-center gap-2">
                  🟡 MercadoLibre (.xlsx / .csv)
                </span>
                {meliFile && <span className="bg-yellow-200 text-yellow-900 text-xs px-2 py-0.5 rounded font-bold">✓ Cargado ({meliFile.data.length} ítems)</span>}
              </div>

              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                id="meli-upload-page"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) parseFile(f, 'meli');
                }}
              />
              <label
                htmlFor="meli-upload-page"
                className="block text-center cursor-pointer bg-white border border-yellow-300 text-yellow-800 font-semibold py-2 px-4 rounded-lg hover:bg-yellow-100 transition shadow-sm text-xs"
              >
                {meliFile ? `Cambiar (${meliFile.name})` : 'Subir planilla de MercadoLibre (.xlsx / .csv)'}
              </label>

              {meliFile && (
                <div className="space-y-3 bg-white p-3 rounded-lg border border-yellow-200 text-xs">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Columna SKU MercadoLibre</label>
                    <select
                      value={meliFile.skuColumn}
                      onChange={(e) => setMeliFile({ ...meliFile, skuColumn: e.target.value })}
                      className="w-full p-2 border rounded bg-gray-50"
                    >
                      <option value="">-- Seleccionar --</option>
                      {meliFile.headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Columna Stock / Disponible</label>
                    <select
                      value={meliFile.stockColumn}
                      onChange={(e) => setMeliFile({ ...meliFile, stockColumn: e.target.value })}
                      className="w-full p-2 border rounded bg-gray-50"
                    >
                      <option value="">-- Seleccionar --</option>
                      {meliFile.headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Tiendanube */}
            <div className="border-2 border-dashed border-blue-300 bg-blue-50/30 rounded-xl p-5 space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-bold text-blue-900 text-sm flex items-center gap-2">
                  🔵 Tiendanube (.xlsx / .csv)
                </span>
                {tnFile && <span className="bg-blue-200 text-blue-900 text-xs px-2 py-0.5 rounded font-bold">✓ Cargado ({tnFile.data.length} ítems)</span>}
              </div>

              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                id="tn-upload-page"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) parseFile(f, 'tn');
                }}
              />
              <label
                htmlFor="tn-upload-page"
                className="block text-center cursor-pointer bg-white border border-blue-300 text-blue-800 font-semibold py-2 px-4 rounded-lg hover:bg-blue-100 transition shadow-sm text-xs"
              >
                {tnFile ? `Cambiar (${tnFile.name})` : 'Subir planilla de Tiendanube (.xlsx / .csv)'}
              </label>

              {tnFile && (
                <div className="space-y-3 bg-white p-3 rounded-lg border border-blue-200 text-xs">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Columna SKU Tiendanube</label>
                    <select
                      value={tnFile.skuColumn}
                      onChange={(e) => setTnFile({ ...tnFile, skuColumn: e.target.value })}
                      className="w-full p-2 border rounded bg-gray-50"
                    >
                      <option value="">-- Seleccionar --</option>
                      {tnFile.headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Columna Stock / Cantidad</label>
                    <select
                      value={tnFile.stockColumn}
                      onChange={(e) => setTnFile({ ...tnFile, stockColumn: e.target.value })}
                      className="w-full p-2 border rounded bg-gray-50"
                    >
                      <option value="">-- Seleccionar --</option>
                      {tnFile.headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <button
              onClick={handleRunReconciliation}
              disabled={(!meliFile && !tnFile) || isComparing}
              className="bg-green-600 text-white font-bold px-8 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-300 transition shadow"
            >
              {isComparing ? 'Analizando e Integrando Catalogos...' : 'Ejecutar Conciliación Omnicanal →'}
            </button>
          </div>
        </div>
      )}

      {/* PASO 2: PANEL DE RESULTADOS Y REMEDIACIÓN */}
      {step === 2 && (
        <div className="space-y-6">
          
          {/* MÉTRICAS DE IMPACTO */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-white border rounded-xl p-3 text-center shadow-sm">
              <div className="text-xl font-bold text-gray-800">{totalAnalyzed}</div>
              <div className="text-xs text-gray-500 font-medium">SKUs Auditados</div>
            </div>
            <div className={`border rounded-xl p-3 text-center shadow-sm ${discrepanciesCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
              <div className={`text-xl font-bold ${discrepanciesCount > 0 ? 'text-red-600' : 'text-gray-700'}`}>{discrepanciesCount}</div>
              <div className="text-xs text-gray-500 font-medium">Diferencias Sistema</div>
            </div>
            <div className={`border rounded-xl p-3 text-center shadow-sm ${platformMismatchCount > 0 ? 'bg-orange-50 border-orange-200' : 'bg-white'}`}>
              <div className={`text-xl font-bold ${platformMismatchCount > 0 ? 'text-orange-600' : 'text-gray-700'}`}>{platformMismatchCount}</div>
              <div className="text-xs text-gray-500 font-medium">Descalce ML vs. TN</div>
            </div>
            <div className={`border rounded-xl p-3 text-center shadow-sm ${missingInSystemCount > 0 ? 'bg-purple-50 border-purple-200' : 'bg-white'}`}>
              <div className={`text-xl font-bold ${missingInSystemCount > 0 ? 'text-purple-600' : 'text-gray-700'}`}>{missingInSystemCount}</div>
              <div className="text-xs text-gray-500 font-medium">Faltan en My Inventory</div>
            </div>
            <div className="bg-white border rounded-xl p-3 text-center shadow-sm">
              <div className="text-xl font-bold text-blue-600">{missingInChannelsCount}</div>
              <div className="text-xs text-gray-500 font-medium">Faltan en Canales</div>
            </div>
          </div>

          {/* BARRA DE HERRAMIENTAS Y ACCIONES MASIVAS */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap justify-between items-center gap-4">
            <div className="w-full md:w-72">
              <input
                type="text"
                placeholder="🔎 Filtrar hallazgos por SKU o Nombre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500 font-bold">Ajuste Masivo Rápido:</span>
              {meliFile && (
                <button
                  onClick={() => handleBulkRemediate('meli')}
                  disabled={isBulkProcessing}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                >
                  ⚡ Igualar Todo a MercadoLibre
                </button>
              )}
              {tnFile && (
                <button
                  onClick={() => handleBulkRemediate('tn')}
                  disabled={isBulkProcessing}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                >
                  ⚡ Igualar Todo a Tiendanube
                </button>
              )}
            </div>
          </div>

          {/* PESTAÑAS DE FILTRADO */}
          <div className="flex border-b border-gray-200 overflow-x-auto gap-2 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('discrepancies')}
              className={`py-2.5 px-4 rounded-t-lg transition whitespace-nowrap ${activeTab === 'discrepancies' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              ⚠️ Diferencias Sistema ({discrepanciesCount})
            </button>
            <button
              onClick={() => setActiveTab('platformMismatch')}
              className={`py-2.5 px-4 rounded-t-lg transition whitespace-nowrap ${activeTab === 'platformMismatch' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              🔀 Descalce ML vs TN ({platformMismatchCount})
            </button>
            <button
              onClick={() => setActiveTab('missingSystem')}
              className={`py-2.5 px-4 rounded-t-lg transition whitespace-nowrap ${activeTab === 'missingSystem' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              🚫 Faltan en ERP ({missingInSystemCount})
            </button>
            <button
              onClick={() => setActiveTab('missingChannels')}
              className={`py-2.5 px-4 rounded-t-lg transition whitespace-nowrap ${activeTab === 'missingChannels' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              📦 Faltan en Tiendas ({missingInChannelsCount})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`py-2.5 px-4 rounded-t-lg transition whitespace-nowrap ${activeTab === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              📋 Todos ({totalAnalyzed})
            </button>
          </div>

          {/* TABLA DE AUDITORÍA */}
          {filteredRows.length === 0 ? (
            <div className="bg-white border border-gray-200 p-12 text-center rounded-xl text-gray-500 text-sm">
              🎉 No hay registros en esta vista con los filtros aplicados.
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs md:text-sm">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700 border-b font-bold">
                      <th className="p-3">SKU</th>
                      <th className="p-3">Producto (My Inventory)</th>
                      <th className="p-3 text-center bg-gray-200/50">Sistema ERP</th>
                      <th className="p-3 text-center bg-yellow-100/50">MercadoLibre</th>
                      <th className="p-3 text-center bg-blue-100/50">Tiendanube</th>
                      <th className="p-3 text-center">Acción / Remediación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredRows.map(row => {
                      const isSkipped = row.status === 'skipped';
                      const isUpdated = row.status === 'updated';
                      const isUpdating = row.status === 'updating';

                      return (
                        <tr 
                          key={row.sku} 
                          className={`hover:bg-gray-50 transition ${isSkipped ? 'opacity-40 bg-gray-50' : ''} ${isUpdated ? 'bg-green-50/50' : ''}`}
                        >
                          <td className="p-3 font-mono font-bold text-gray-900 whitespace-nowrap">
                            {row.sku}
                          </td>

                          <td className="p-3 font-medium text-gray-700">
                            {row.productName}
                            {row.isPlatformMismatch && (
                              <span className="ml-2 inline-block bg-orange-100 text-orange-800 text-[10px] px-2 py-0.5 rounded font-bold">
                                ML ≠ TN
                              </span>
                            )}
                          </td>

                          <td className="p-3 text-center font-bold text-gray-800 bg-gray-50/50">
                            {row.systemStock !== null ? row.systemStock : <span className="text-red-400 italic">No registrado</span>}
                          </td>

                          <td className={`p-3 text-center font-bold bg-yellow-50/30 ${row.meliStock !== null && row.systemStock !== null && row.meliStock !== row.systemStock ? 'text-red-600 bg-red-50' : 'text-gray-800'}`}>
                            {row.meliStock !== null ? row.meliStock : <span className="text-gray-400 italic">--</span>}
                          </td>

                          <td className={`p-3 text-center font-bold bg-blue-50/30 ${row.tnStock !== null && row.systemStock !== null && row.tnStock !== row.systemStock ? 'text-red-600 bg-red-50' : 'text-gray-800'}`}>
                            {row.tnStock !== null ? row.tnStock : <span className="text-gray-400 italic">--</span>}
                          </td>

                          <td className="p-3 text-center">
                            {!row.productId ? (
                              <span className="text-xs text-purple-600 font-semibold bg-purple-50 px-2 py-1 rounded">
                                Crear en Sistema
                              </span>
                            ) : isUpdated ? (
                              <span className="text-green-600 font-bold flex items-center justify-center gap-1">
                                ✓ Actualizado ({row.systemStock})
                              </span>
                            ) : isUpdating ? (
                              <span className="text-yellow-600 font-medium animate-pulse">Procesando...</span>
                            ) : (
                              <div className="flex flex-wrap items-center justify-center gap-1">
                                {row.meliStock !== null && row.meliStock !== row.systemStock && (
                                  <button
                                    onClick={() => handleApplyAdjustment(row, row.meliStock!)}
                                    className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs px-2 py-1 rounded font-semibold transition"
                                  >
                                    Usar ML ({row.meliStock})
                                  </button>
                                )}

                                {row.tnStock !== null && row.tnStock !== row.systemStock && (
                                  <button
                                    onClick={() => handleApplyAdjustment(row, row.tnStock!)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded font-semibold transition"
                                  >
                                    Usar TN ({row.tnStock})
                                  </button>
                                )}

                                <div className="flex items-center gap-1 border rounded p-0.5 bg-gray-50">
                                  <input
                                    type="number"
                                    placeholder="Cant."
                                    className="w-12 text-center text-xs border border-gray-300 rounded p-0.5 bg-white"
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value, 10);
                                      setCustomInputs({ ...customInputs, [row.productId!]: isNaN(val) ? 0 : val });
                                    }}
                                  />
                                  <button
                                    onClick={() => {
                                      const targetVal = customInputs[row.productId!];
                                      if (targetVal !== undefined) handleApplyAdjustment(row, targetVal);
                                      else alert('Ingresa una cantidad');
                                    }}
                                    className="bg-gray-700 hover:bg-gray-900 text-white text-xs px-2 py-0.5 rounded font-semibold transition"
                                  >
                                    Fijar
                                  </button>
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StockReconciliationPage;