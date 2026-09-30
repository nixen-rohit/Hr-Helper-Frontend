export interface Employee {
  id: number;
  firstName: string;
  lastName:string;    
  email: string;
  department: string;
  position: string;
  salary: number;
  age: number;
  status: string;
  city: string;
  hireDate: string;
  performanceScore: number;
}

export interface Filter {
  field: keyof Employee;
  operator: FilterOperator;
  value: string;
}

export type FilterOperator = 'equals' | 'contains' | '>' | '<' | '>=' | '<=' | 'startsWith' | 'endsWith';

export type LogicOperator = 'AND' | 'OR';

export interface Preset {
  id: number;
  name: string;
  filters: Filter[];
  logic: LogicOperator;
  isDefault: boolean;
}

export interface ApiResponse {
  data: Employee[];
  total: number;
  hasMore: boolean;
}

export type SortOrder = 'asc' | 'desc' | null;