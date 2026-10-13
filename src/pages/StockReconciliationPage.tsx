// pages/StockReconciliationPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import apiClient from '../api/client';
import { useProductStore } from '../store/productStore';
import type { ProductSummary, ApiResponse } from '../types/product';

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
  supplierSku: string;
  imageUrl?: string;
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

// 📋 Componente de Botón de Copiado Rápido al Portapapeles
const CopyButton: React.FC<{ text: string; label?: string; className?: string }> = ({ 
  text, 
  label, 
  className = '' 
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!text || text === '---') return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error al copiar al portapapeles:', err);
    }
  };

  if (!text || text === '---') return null;

  return (
    <button
      onClick={handleCopy}
      className={`p-1 rounded-md transition-all duration-200 text-gray-400 hover:text-indigo-600 hover:bg-gray-100 ${
        copied ? 'text-green-600 bg-green-50 scale-110' : ''
      } ${className}`}
      title={copied ? '¡Copiado!' : `Copiar ${label || text}`}
    >
      {copied ? (
        <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
        </svg>
      )}
    </button>
  );
};

// Componente de Miniatura Ampliada (64x64px)
const ProductThumbnail: React.FC<{ 
  imageUrl?: string; 
  alt: string; 
  onClick?: () => void;
}> = ({ imageUrl, alt, onClick }) => {
  const [error, setError] = useState(false);

  if (!imageUrl || error) {
    return (
      <div className="w-16 h-16 rounded-xl bg-gray-100 border border-gray-200 flex flex-col items-center justify-center text-gray-400 mx-auto text-2xl shadow-sm">
        📦
      </div>
    );
  }

  return (
    <div 
      onClick={onClick}
      className="relative group w-16 h-16 rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm cursor-pointer hover:border-indigo-500 hover:ring-2 hover:ring-indigo-300 transition-all mx-auto flex items-center justify-center"
      title="Haz clic para ver imagen en alta resolución"
    >
      <img
        src={imageUrl}
        alt={alt}
        className="w-full h-full object-contain p-1 group-hover:scale-110 transition-transform duration-300"
        loading="lazy"
        onError={() => setError(true)}
      />
      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold uppercase tracking-wider">
        🔍 Ampliar
      </div>
    </div>
  );
};

// Términos de cabecera a omitir
const INVALID_SKUS = new Set([
  'sku',
  'código',
  'codigo',
  'family_id',
  'agrupador de variantes',
  'publicaciones',
  'item_id',
  'número de publicación',
  'información del producto',
  'condiciones de publicación',
  'número de producto',
  'número de variante',
  'título',
  'variantes',
  'stock en tu depósito'
]);

const isInvalidSku = (sku: string): boolean => {
  if (!sku) return true;
  const lower = sku.trim().toLowerCase();
  if (INVALID_SKUS.has(lower)) return true;
  if (lower.startsWith('obligatorio')) return true;
  if (lower.startsWith('si cambiás')) return true;
  return false;
};

// Extracción del SKU del Proveedor
const extractSupplierSku = (product?: any): string => {
  if (!product) return '---';

  if (product.primarySupplierSku && String(product.primarySupplierSku).trim() !== '' && product.primarySupplierSku !== '---') {
    return String(product.primarySupplierSku).trim();
  }

  if (product.supplierSku && String(product.supplierSku).trim() !== '' && product.supplierSku !== '---') {
    return String(product.supplierSku).trim();
  }

  if (Array.isArray(product.suppliers) && product.suppliers.length > 0) {
    const primary = product.suppliers.find((s: any) => s.isPrimary) || product.suppliers[0];
    const sSku = primary?.supplierSku || primary?.sku;
    if (sSku && String(sSku).trim() !== '' && sSku !== '---') {
      return String(sSku).trim();
    }
  }

  return '---';
};

const StockReconciliationPage: React.FC = () => {
  const navigate = useNavigate();

  // 💾 PERSISTENCIA
  const [meliFile, setMeliFile] = useState<ChannelFileData | null>(() => {
    const saved = localStorage.getItem('stock_recon_meliFile');
    return saved ? JSON.parse(saved) : null;
  });

  const [tnFile, setTnFile] = useState<ChannelFileData | null>(() => {
    const saved = localStorage.getItem('stock_recon_tnFile');
    return saved ? JSON.parse(saved) : null;
  });

  const [step, setStep] = useState<1 | 2>(() => {
    const saved = localStorage.getItem('stock_recon_step');
    return saved ? JSON.parse(saved) : 1;
  });

  const [rows, setRows] = useState<ReconciliationRow[]>(() => {
    const saved = localStorage.getItem('stock_recon_rows');
    return saved ? JSON.parse(saved) : [];
  });

  // Modal Lightbox
  const [selectedImage, setSelectedImage] = useState<{ url: string; title: string; sku: string; supplierSku: string } | null>(null);

  // Estados de interfaz
  const [isComparing, setIsComparing] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabCategory>('discrepancies');
  const [searchQuery, setSearchQuery] = useState('');
  const [customInputs, setCustomInputs] = useState<Record<number, number>>({});

  const { updateStock } = useProductStore();

  useEffect(() => {
    if (meliFile) localStorage.setItem('stock_recon_meliFile', JSON.stringify(meliFile));
    else localStorage.removeItem('stock_recon_meliFile');
  }, [meliFile]);

  useEffect(() => {
    if (tnFile) localStorage.setItem('stock_recon_tnFile', JSON.stringify(tnFile));
    else localStorage.removeItem('stock_recon_tnFile');
  }, [tnFile]);

  useEffect(() => {
    localStorage.setItem('stock_recon_step', JSON.stringify(step));
  }, [step]);

  useEffect(() => {
    if (rows.length > 0) localStorage.setItem('stock_recon_rows', JSON.stringify(rows));
    else localStorage.removeItem('stock_recon_rows');
  }, [rows]);

  const handleResetAll = () => {
    if (window.confirm('¿Deseas reiniciar la auditoría y limpiar los archivos cargados?')) {
      setMeliFile(null);
      setTnFile(null);
      setRows([]);
      setStep(1);
      localStorage.removeItem('stock_recon_meliFile');
      localStorage.removeItem('stock_recon_tnFile');
      localStorage.removeItem('stock_recon_rows');
      localStorage.removeItem('stock_recon_step');
    }
  };

  // Parser
  const parseFile = (file: File, channel: 'meli' | 'tn') => {
    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          const workbook = XLSX.read(buffer, { type: 'array' });

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
            alert('No se encontró la hoja de datos en el archivo Excel.');
            return;
          }

          const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });

          if (!rawRows || rawRows.length === 0) {
            alert('El archivo Excel está vacío.');
            return;
          }

          let headerIndex = rawRows.findIndex(row =>
            Array.isArray(row) && row.some(cell => {
              const strVal = String(cell).trim().toLowerCase();
              return strVal === 'agrupador de variantes' || strVal === 'stock en tu depósito' || strVal === 'número de publicación';
            })
          );

          if (headerIndex === -1) {
            headerIndex = rawRows.findIndex(row =>
              Array.isArray(row) && row.some(cell => String(cell).trim().toLowerCase() === 'sku')
            );
          }

          if (headerIndex === -1) headerIndex = 0;

          const headers = (rawRows[headerIndex] as any[]).map(c => String(c).trim()).filter(Boolean);
          const dataRows = rawRows.slice(headerIndex + 1);

          const cleanData: CsvRow[] = [];

          dataRows.forEach(rowArr => {
            const rowObj: CsvRow = {};
            let isNoteRow = false;

            headers.forEach((header, colIdx) => {
              const cellVal = rowArr[colIdx] !== undefined ? String(rowArr[colIdx]).trim() : '';
              if (cellVal.toLowerCase().includes('obligatorio') || cellVal.toLowerCase().includes('si cambiás')) {
                isNoteRow = true;
              }
              rowObj[header] = cellVal;
            });

            const rowSku = rowObj['SKU'] || Object.values(rowObj)[0] || '';

            if (!isNoteRow && !isInvalidSku(rowSku) && Object.values(rowObj).some(v => v !== '')) {
              cleanData.push(rowObj);
            }
          });

          const skuMatch = headers.find(h => {
            const lh = h.toLowerCase();
            return lh === 'sku' || lh.includes('código') || lh.includes('codigo');
          }) || headers[0] || '';

          const stockMatch = headers.find(h => {
            const lh = h.toLowerCase();
            return (
              lh.includes('stock en tu depósito') ||
              lh.includes('stock') ||
              lh.includes('cantidad') ||
              lh.includes('disponible')
            );
          }) || '';

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
          alert(`Error procesando Excel: ${err.message}`);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
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
              const rowSku = row[skuMatch] || '';
              return !vals.includes('obligatorio') && !isInvalidSku(rowSku);
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
          alert(`Error procesando CSV: ${err.message}`);
        }
      });
    }
  };

  const fetchEnrichedErpProducts = async (): Promise<ProductSummary[]> => {
    try {
      const response = await apiClient.get<ApiResponse<{ content: ProductSummary[] }>>(
        '/products/paged?page=0&size=3000'
      );
      if (response.data?.data?.content && response.data.data.content.length > 0) {
        return response.data.data.content;
      }
    } catch (e) {
      console.warn('Fallback a productos generales...', e);
    }

    try {
      const fallbackResponse = await apiClient.get<ApiResponse<ProductSummary[]>>('/products');
      return fallbackResponse.data?.data || [];
    } catch (err) {
      console.error('Error cargando catálogo ERP:', err);
      return [];
    }
  };

  const handleRunReconciliation = async () => {
    if (!meliFile && !tnFile) {
      alert('Sube al menos un archivo para iniciar el proceso.');
      return;
    }

    setIsComparing(true);

    try {
      const erpProducts = await fetchEnrichedErpProducts();

      const erpMap = new Map<string, ProductSummary>();
      erpProducts.forEach(p => {
        if (p.sku) erpMap.set(p.sku.trim().toLowerCase(), p);
      });

      const meliMap = new Map<string, { originalSku: string; stock: number }>();
      const tnMap = new Map<string, { originalSku: string; stock: number }>();
      const allNormalizedSkus = new Set<string>();

      if (meliFile) {
        meliFile.data.forEach(row => {
          const rawSku = row[meliFile.skuColumn]?.trim();
          if (rawSku && !isInvalidSku(rawSku)) {
            const normSku = rawSku.toLowerCase();
            const rawStock = row[meliFile.stockColumn];
            const stock = parseInt(rawStock, 10);
            meliMap.set(normSku, { originalSku: rawSku, stock: isNaN(stock) ? 0 : stock });
            allNormalizedSkus.add(normSku);
          }
        });
      }

      if (tnFile) {
        tnFile.data.forEach(row => {
          const rawSku = row[tnFile.skuColumn]?.trim();
          if (rawSku && !isInvalidSku(rawSku)) {
            const normSku = rawSku.toLowerCase();
            const rawStock = row[tnFile.stockColumn];
            const stock = parseInt(rawStock, 10);
            tnMap.set(normSku, { originalSku: rawSku, stock: isNaN(stock) ? 0 : stock });
            allNormalizedSkus.add(normSku);
          }
        });
      }

      erpProducts.forEach(p => {
        if (p.sku && p.active && !isInvalidSku(p.sku)) {
          allNormalizedSkus.add(p.sku.trim().toLowerCase());
        }
      });

      const matrix: ReconciliationRow[] = [];

      allNormalizedSkus.forEach(normSku => {
        if (isInvalidSku(normSku)) return;

        const product = erpMap.get(normSku) || erpProducts.find(p => 
          p.primarySupplierSku && p.primarySupplierSku.trim().toLowerCase() === normSku
        );

        const meliItem = meliMap.get(normSku);
        const tnItem = tnMap.get(normSku);

        const displaySku = product?.sku || meliItem?.originalSku || tnItem?.originalSku || normSku.toUpperCase();

        const hasMeli = !!meliItem;
        const hasTn = !!tnItem;

        const sysStock = product ? product.currentStock : null;
        const meliStock = hasMeli ? meliItem!.stock : null;
        const tnStock = hasTn ? tnItem!.stock : null;

        const supplierSku = extractSupplierSku(product);
        const imageUrl = product?.imageUrl || '';

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
          sku: displaySku,
          productId: product?.id,
          productName: product?.name || '--- (No registrado en ERP)',
          supplierSku,
          imageUrl,
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
      console.error('Error en conciliación:', err);
      alert('Error ejecutando la conciliación.');
    } finally {
      setIsComparing(false);
    }
  };

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

  const handleBulkRemediate = async (source: 'meli' | 'tn') => {
    const targetRows = rows.filter(r => 
      r.status === 'pending' && 
      r.isDiscrepancy && 
      r.productId && 
      (source === 'meli' ? r.meliStock !== null : r.tnStock !== null)
    );

    if (targetRows.length === 0) {
      alert(`No hay registros pendientes con valor en ${source === 'meli' ? 'MercadoLibre' : 'Tiendanube'}.`);
      return;
    }

    if (!window.confirm(`¿Deseas igualar el stock de ${targetRows.length} productos en el ERP usando los valores de ${source === 'meli' ? 'MercadoLibre' : 'Tiendanube'}?`)) return;

    setIsBulkProcessing(true);
    for (const row of targetRows) {
      const targetVal = source === 'meli' ? row.meliStock! : row.tnStock!;
      await handleApplyAdjustment(row, targetVal);
    }
    setIsBulkProcessing(false);
  };

  const handleExportAuditCSV = () => {
    if (rows.length === 0) return;

    const csvContent = [
      ['SKU ERP', 'SKU Proveedor', 'Producto', 'Stock ERP', 'Stock ML', 'Stock TN', 'Estado'],
      ...rows.map(r => [
        `"${r.sku}"`,
        `"${r.supplierSku || ''}"`,
        `"${(r.productName || '').replace(/"/g, '""')}"`,
        r.systemStock !== null ? r.systemStock : 'N/A',
        r.meliStock !== null ? r.meliStock : 'N/A',
        r.tnStock !== null ? r.tnStock : 'N/A',
        r.isDiscrepancy ? 'Diferencia' : r.missingInSystem ? 'Falta en ERP' : 'Sincronizado'
      ])
    ].map(e => e.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `auditoria_stock_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalAnalyzed = rows.length;
  const discrepanciesCount = rows.filter(r => r.isDiscrepancy).length;
  const platformMismatchCount = rows.filter(r => r.isPlatformMismatch).length;
  const missingInSystemCount = rows.filter(r => r.missingInSystem).length;
  const missingInChannelsCount = rows.filter(r => r.missingInMeli || r.missingInTn).length;

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
      (row.supplierSku || '').toLowerCase().includes(query) ||
      (row.productName || '').toLowerCase().includes(query);

    return matchesTab && matchesQuery;
  });

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-6">
      
      {/* 🔍 MODAL LIGHTBOX INTERACTIVO CON BOTONES DE COPIADO */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-fadeIn"
          onClick={() => setSelectedImage(null)}
        >
          <div 
            className="bg-white rounded-2xl p-5 max-w-lg w-full shadow-2xl relative flex flex-col items-center gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex justify-between items-start border-b pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-base leading-snug line-clamp-1">{selectedImage.title}</h3>
                <div className="flex flex-wrap gap-2 items-center mt-1.5 text-xs">
                  <div className="flex items-center gap-1 bg-gray-100 text-gray-800 px-2 py-0.5 rounded font-mono font-bold">
                    <span>SKU: {selectedImage.sku}</span>
                    <CopyButton text={selectedImage.sku} label="SKU ERP" />
                  </div>
                  {selectedImage.supplierSku && selectedImage.supplierSku !== '---' && (
                    <div className="flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded font-mono font-bold">
                      <span>PROV: {selectedImage.supplierSku}</span>
                      <CopyButton text={selectedImage.supplierSku} label="SKU Proveedor" className="text-indigo-500 hover:text-indigo-800" />
                    </div>
                  )}
                </div>
              </div>
              <button 
                onClick={() => setSelectedImage(null)}
                className="text-gray-400 hover:text-gray-900 text-xl font-bold p-1 rounded-full hover:bg-gray-100 transition"
              >
                ✕
              </button>
            </div>

            <div className="w-full h-80 flex items-center justify-center bg-gray-50 rounded-xl overflow-hidden p-3 border border-gray-100">
              <img 
                src={selectedImage.url} 
                alt={selectedImage.title} 
                className="max-w-full max-h-full object-contain rounded-lg drop-shadow"
              />
            </div>

            <p className="text-xs text-gray-400 text-center">Haz clic fuera del recuadro para cerrar la vista previa</p>
          </div>
        </div>
      )}

      {/* Encabezado */}
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

        <div className="flex gap-2">
          {(meliFile || tnFile || rows.length > 0) && (
            <button
              onClick={handleResetAll}
              className="bg-red-50 text-red-700 hover:bg-red-100 font-semibold text-xs px-3 py-2 rounded-lg border border-red-200 transition"
            >
              🗑️ Reiniciar Auditoría
            </button>
          )}

          {step === 2 && (
            <>
              <button
                onClick={handleExportAuditCSV}
                className="bg-gray-100 text-gray-700 hover:bg-gray-200 font-semibold text-xs px-3 py-2 rounded-lg border border-gray-300 transition"
              >
                📥 Exportar CSV
              </button>
              <button 
                onClick={() => setStep(1)}
                className="bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs px-3 py-2 rounded-lg border border-blue-200 transition"
              >
                ⚙️ Cambiar Archivos
              </button>
            </>
          )}
        </div>
      </div>

      {/* PASO 1 */}
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
                {meliFile && <span className="bg-yellow-200 text-yellow-900 text-xs px-2 py-0.5 rounded font-bold">✓ Cargado ({meliFile.data.length})</span>}
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
                {meliFile ? `Cambiar (${meliFile.name})` : 'Subir planilla MercadoLibre'}
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
                      {meliFile.headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Columna Stock</label>
                    <select
                      value={meliFile.stockColumn}
                      onChange={(e) => setMeliFile({ ...meliFile, stockColumn: e.target.value })}
                      className="w-full p-2 border rounded bg-gray-50"
                    >
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
                {tnFile && <span className="bg-blue-200 text-blue-900 text-xs px-2 py-0.5 rounded font-bold">✓ Cargado ({tnFile.data.length})</span>}
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
                {tnFile ? `Cambiar (${tnFile.name})` : 'Subir planilla Tiendanube'}
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
                      {tnFile.headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Columna Stock</label>
                    <select
                      value={tnFile.stockColumn}
                      onChange={(e) => setTnFile({ ...tnFile, stockColumn: e.target.value })}
                      className="w-full p-2 border rounded bg-gray-50"
                    >
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
              {isComparing ? 'Analizando Catálogos...' : 'Ejecutar Conciliación Omnicanal →'}
            </button>
          </div>
        </div>
      )}

      {/* PASO 2 */}
      {step === 2 && (
        <div className="space-y-6">
          
          {/* Métricas */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-white border rounded-xl p-3 text-center shadow-sm">
              <div className="text-xl font-bold text-gray-800">{totalAnalyzed}</div>
              <div className="text-xs text-gray-500 font-medium">SKUs Auditados</div>
            </div>
            <div className={`border rounded-xl p-3 text-center shadow-sm ${discrepanciesCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
              <div className={`text-xl font-bold ${discrepanciesCount > 0 ? 'text-red-600' : 'text-gray-700'}`}>{discrepanciesCount}</div>
              <div className="text-xs text-gray-500 font-medium">Diferencias ERP</div>
            </div>
            <div className={`border rounded-xl p-3 text-center shadow-sm ${platformMismatchCount > 0 ? 'bg-orange-50 border-orange-200' : 'bg-white'}`}>
              <div className={`text-xl font-bold ${platformMismatchCount > 0 ? 'text-orange-600' : 'text-gray-700'}`}>{platformMismatchCount}</div>
              <div className="text-xs text-gray-500 font-medium">Descalce ML vs. TN</div>
            </div>
            <div className={`border rounded-xl p-3 text-center shadow-sm ${missingInSystemCount > 0 ? 'bg-purple-50 border-purple-200' : 'bg-white'}`}>
              <div className={`text-xl font-bold ${missingInSystemCount > 0 ? 'text-purple-600' : 'text-gray-700'}`}>{missingInSystemCount}</div>
              <div className="text-xs text-gray-500 font-medium">Faltan en ERP</div>
            </div>
            <div className="bg-white border rounded-xl p-3 text-center shadow-sm">
              <div className="text-xl font-bold text-blue-600">{missingInChannelsCount}</div>
              <div className="text-xs text-gray-500 font-medium">Faltan en Tiendas</div>
            </div>
          </div>

          {/* Filtro y Acciones */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap justify-between items-center gap-4">
            <div className="w-full md:w-80">
              <input
                type="text"
                placeholder="🔎 Filtrar por SKU, SKU Proveedor o Nombre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500 font-bold">Ajuste Masivo:</span>
              {meliFile && (
                <button
                  onClick={() => handleBulkRemediate('meli')}
                  disabled={isBulkProcessing}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                >
                  ⚡ Usar MercadoLibre
                </button>
              )}
              {tnFile && (
                <button
                  onClick={() => handleBulkRemediate('tn')}
                  disabled={isBulkProcessing}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                >
                  ⚡ Usar Tiendanube
                </button>
              )}
            </div>
          </div>

          {/* Pestañas */}
          <div className="flex border-b border-gray-200 overflow-x-auto gap-2 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('discrepancies')}
              className={`py-2.5 px-4 rounded-t-lg transition whitespace-nowrap ${activeTab === 'discrepancies' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              ⚠️ Diferencias ERP ({discrepanciesCount})
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

          {/* Tabla de Resultados */}
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
                      <th className="p-3 text-center w-24">Foto</th>
                      <th className="p-3">SKU ERP</th>
                      <th className="p-3">SKU Proveedor</th>
                      <th className="p-3">Producto</th>
                      <th className="p-3 text-center bg-gray-200/50">ERP</th>
                      <th className="p-3 text-center bg-yellow-100/50">MercadoLibre</th>
                      <th className="p-3 text-center bg-blue-100/50">Tiendanube</th>
                      <th className="p-3 text-center">Acción / Remediación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredRows.map(row => {
                      const isUpdated = row.status === 'updated';
                      const isUpdating = row.status === 'updating';

                      return (
                        <tr 
                          key={row.sku} 
                          className={`hover:bg-gray-50 transition ${isUpdated ? 'bg-green-50/50' : ''}`}
                        >
                          {/* Miniatura Ampliada + Modal Lightbox */}
                          <td className="p-3 text-center w-24">
                            <ProductThumbnail 
                              imageUrl={row.imageUrl} 
                              alt={row.productName} 
                              onClick={() => {
                                if (row.imageUrl) {
                                  setSelectedImage({ 
                                    url: row.imageUrl, 
                                    title: row.productName,
                                    sku: row.sku,
                                    supplierSku: row.supplierSku
                                  });
                                }
                              }}
                            />
                          </td>

                          {/* 📋 SKU ERP con Botón de Copiado Rápido */}
                          <td className="p-3 font-mono font-bold text-gray-900 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span>{row.sku}</span>
                              <CopyButton text={row.sku} label="SKU ERP" />
                            </div>
                          </td>

                          {/* 📋 SKU Proveedor con Botón de Copiado Rápido */}
                          <td className="p-3 font-mono text-xs whitespace-nowrap">
                            {row.supplierSku && row.supplierSku !== '---' ? (
                              <div className="flex items-center gap-1.5">
                                <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold px-2.5 py-1 rounded-md inline-block shadow-sm">
                                  {row.supplierSku}
                                </span>
                                <CopyButton 
                                  text={row.supplierSku} 
                                  label="SKU Proveedor" 
                                  className="text-indigo-400 hover:text-indigo-700 hover:bg-indigo-50" 
                                />
                              </div>
                            ) : (
                              <span className="text-gray-400 italic">---</span>
                            )}
                          </td>

                          <td className="p-3 font-medium text-gray-800">
                            {row.productName}
                            {row.isPlatformMismatch && (
                              <span className="ml-2 inline-block bg-orange-100 text-orange-800 text-[10px] px-2 py-0.5 rounded font-bold">
                                ML ≠ TN
                              </span>
                            )}
                          </td>

                          <td className="p-3 text-center font-bold text-gray-800 bg-gray-50/50">
                            {row.systemStock !== null ? row.systemStock : <span className="text-purple-600 font-normal italic">No en ERP</span>}
                          </td>

                          <td className={`p-3 text-center font-bold bg-yellow-50/30 ${row.meliStock !== null && row.systemStock !== null && row.meliStock !== row.systemStock ? 'text-red-600 bg-red-50' : 'text-gray-800'}`}>
                            {row.meliStock !== null ? row.meliStock : <span className="text-gray-400 italic">--</span>}
                          </td>

                          <td className={`p-3 text-center font-bold bg-blue-50/30 ${row.tnStock !== null && row.systemStock !== null && row.tnStock !== row.systemStock ? 'text-red-600 bg-red-50' : 'text-gray-800'}`}>
                            {row.tnStock !== null ? row.tnStock : <span className="text-gray-400 italic">--</span>}
                          </td>

                          <td className="p-3 text-center">
                            {!row.productId ? (
                              <span className="text-xs text-purple-700 font-semibold bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-md">
                                Requerido Dar de Alta
                              </span>
                            ) : isUpdated ? (
                              <span className="text-green-600 font-bold flex items-center justify-center gap-1">
                                ✓ Actualizado ({row.systemStock})
                              </span>
                            ) : isUpdating ? (
                              <span className="text-yellow-600 font-medium animate-pulse">Guardando...</span>
                            ) : (
                              <div className="flex flex-wrap items-center justify-center gap-1">
                                {row.meliStock !== null && row.meliStock !== row.systemStock && (
                                  <button
                                    onClick={() => handleApplyAdjustment(row, row.meliStock!)}
                                    className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs px-2.5 py-1 rounded font-semibold transition"
                                  >
                                    Usar ML ({row.meliStock})
                                  </button>
                                )}

                                {row.tnStock !== null && row.tnStock !== row.systemStock && (
                                  <button
                                    onClick={() => handleApplyAdjustment(row, row.tnStock!)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2.5 py-1 rounded font-semibold transition"
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