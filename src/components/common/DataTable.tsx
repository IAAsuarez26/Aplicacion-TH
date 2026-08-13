import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, Download, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchKeys?: (keyof T | string)[];
  searchPlaceholder?: string;
  pageSize?: number;
  loading?: boolean;
  actions?: React.ReactNode;
  filterComponent?: React.ReactNode;
  emptyTitle?: string;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  exportFilename?: string;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  searchKeys = [],
  searchPlaceholder = 'Buscar registros...',
  pageSize = 10,
  loading = false,
  actions,
  filterComponent,
  emptyTitle = 'No hay registros',
  emptyMessage = 'No se encontraron datos que coincidan con la búsqueda o filtros aplicados.',
  onRowClick,
  exportFilename = 'exportacion_datos',
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(pageSize);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Filtrado por búsqueda
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;

    const term = searchTerm.toLowerCase();
    return data.filter((item) => {
      if (searchKeys.length === 0) {
        return Object.values(item).some((val) =>
          String(val ?? '').toLowerCase().includes(term)
        );
      }

      return searchKeys.some((key) => {
        const val = item[key as keyof T];
        return String(val ?? '').toLowerCase().includes(term);
      });
    });
  }, [data, searchTerm, searchKeys]);

  // Ordenamiento
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;

    return [...filteredData].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      let comparison = 0;
      if (typeof valA === 'number' && typeof valB === 'number') {
        comparison = valA - valB;
      } else {
        comparison = String(valA).localeCompare(String(valB), undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortKey, sortDirection]);

  // Paginación
  const totalPages = Math.ceil(sortedData.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(start, start + itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortKey(null);
        setSortDirection('asc');
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const exportToCSV = () => {
    if (sortedData.length === 0) return;

    const headers = columns.map((c) => `"${c.header}"`).join(',');
    const rows = sortedData.map((item) => {
      return columns
        .map((c) => {
          const val = item[c.key];
          return `"${String(val ?? '').replace(/"/g, '""')}"`;
        })
        .join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${exportFilename}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="glass-card rounded-2xl p-5 md:p-6 shadow-xl space-y-4">
      {/* Top Bar: Search, Filters & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={searchPlaceholder}
            className="w-full pl-10 pr-4 py-2 bg-slate-900/90 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200"
            >
              Limpiar
            </button>
          )}
        </div>

        {/* Filter component & actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {filterComponent}

          <button
            onClick={exportToCSV}
            disabled={sortedData.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Exportar registros en formato CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Exportar CSV</span>
          </button>

          {actions}
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-sm text-slate-200 divide-y divide-slate-800">
          <thead className="bg-slate-900/90 text-xs text-slate-400 uppercase font-semibold">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3.5 ${col.className || ''} ${
                    col.sortable ? 'cursor-pointer select-none hover:text-slate-200' : ''
                  }`}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col.header}</span>
                    {col.sortable && (
                      <span className="text-slate-500">
                        {sortKey === col.key ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-brand-400" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-brand-400" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 opacity-40 hover:opacity-100" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
            {loading ? (
              // Skeleton loading
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-4">
                      <div className="h-4 bg-slate-800 rounded w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : paginatedData.length > 0 ? (
              paginatedData.map((item, rowIdx) => (
                <tr
                  key={item.id || item.cargo_id || item.direccion_id || item.gerencia_id || item.departamento_id || item.empleado_id || item.historial_id || rowIdx}
                  onClick={() => onRowClick && onRowClick(item)}
                  className={`transition-colors ${
                    onRowClick ? 'cursor-pointer hover:bg-brand-500/10' : 'hover:bg-slate-800/40'
                  }`}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3.5 ${col.className || ''}`}>
                      {col.render ? col.render(item) : item[col.key] ?? '-'}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center">
                  <div className="max-w-sm mx-auto flex flex-col items-center">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400 mb-3">
                      <Search className="w-6 h-6" />
                    </div>
                    <h4 className="text-base font-semibold text-slate-200">{emptyTitle}</h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 pt-2">
        <div className="flex items-center gap-2">
          <span>Mostrando</span>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-brand-500"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <span>de {sortedData.length} registros</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1 || sortedData.length === 0}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="px-3 py-1 text-slate-300 font-medium">
            Página {currentPage} de {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages || sortedData.length === 0}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
