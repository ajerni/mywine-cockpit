'use client';

import { useState, useEffect } from 'react';
import { Column, ListParams, ListResponse, Filter } from '@/types/lists';

interface DataListProps<T> {
  listId: string;  // e.g., 'users', 'wines', 'messages'
  columns: Column[];
  title: string;
  onClose?: () => void;
  defaultSort?: {
    field: string;
    direction: 'ASC' | 'DESC';
  };
  onRowClick?: (row: any) => void;
}

export function DataList<T>({ listId, columns, title, onClose, defaultSort, onRowClick }: DataListProps<T>) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState<ListParams>({
    page: 1,
    pageSize: 10,
    sortBy: defaultSort?.field || undefined,
    sortDirection: defaultSort?.direction?.toLowerCase() as 'asc' | 'desc' | undefined
  });
  const [filters, setFilters] = useState<Filter[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchData();
  }, [params, filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/lists/${listId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...params, filters }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }

      const result: ListResponse<T> = await response.json();
      setData(result.data);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b">
          <div className="flex flex-wrap gap-2">
            {columns
              .filter(col => col.filterable)
              .map(col => (
                <input
                  key={col.key}
                  type="text"
                  placeholder={`Filter ${col.label}`}
                  className="border rounded px-2 py-1"
                  onChange={(e) => {
                    const newFilters = filters.filter(f => f.column !== col.key);
                    if (e.target.value) {
                      newFilters.push({ column: col.key, value: e.target.value });
                    }
                    setFilters(newFilters);
                  }}
                />
              ))}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {columns.map(col => (
                  <th
                    key={col.key}
                    className="px-4 py-2 text-left"
                    onClick={() => {
                      if (col.sortable) {
                        setParams(prev => ({
                          ...prev,
                          sortBy: col.key,
                          sortDirection:
                            prev.sortBy === col.key && prev.sortDirection === 'asc'
                              ? 'desc'
                              : 'asc',
                        }));
                      }
                    }}
                  >
                    {col.label}
                    {col.sortable && (
                      <span className="ml-1">
                        {params.sortBy === col.key
                          ? params.sortDirection === 'asc'
                            ? '↑'
                            : '↓'
                          : '↕'}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row: any, i) => (
                <tr 
                  key={i} 
                  className="border-b hover:bg-gray-50 cursor-pointer"
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map(col => (
                    <td key={col.key} className="px-4 py-2">
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t flex justify-between items-center">
          <div>
            Total: {total} items
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setParams(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={params.page === 1}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-1">
              Page {params.page} of {Math.ceil(total / params.pageSize)}
            </span>
            <button
              onClick={() => setParams(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={params.page >= Math.ceil(total / params.pageSize)}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 