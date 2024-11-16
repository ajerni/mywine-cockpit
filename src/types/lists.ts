export type SortDirection = 'asc' | 'desc';

export interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
}

export interface Filter {
  column: string;
  value: string;
}

export interface ListParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDirection?: SortDirection;
  filters?: Filter[];
}

export interface ListResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
} 