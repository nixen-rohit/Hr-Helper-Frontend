import { ApiResponse, Filter, LogicOperator, Preset } from './types';
const API_BASE = import.meta.env.VITE_API_BASE || '/api';
export const fetchRecords = async (
  page: number,
  limit: number,
  sortField?: string,
  sortOrder?: string,
  filters?: Filter[],
  logic?: LogicOperator
): Promise<ApiResponse> => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  if (sortField) params.append('sortField', sortField);
  if (sortOrder) params.append('sortOrder', sortOrder);
  if (filters && filters.length > 0) params.append('filters', JSON.stringify(filters));
  if (logic) params.append('logic', logic);

  const response = await fetch(`${API_BASE}/records?${params}`);
  return response.json();
};

export const fetchPresets = async (): Promise<Preset[]> => {
  const response = await fetch(`${API_BASE}/presets`);
  return response.json();
};

export const createPreset = async (preset: Omit<Preset, 'id'>): Promise<Preset> => {
  const response = await fetch(`${API_BASE}/presets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(preset),
  });
  return response.json();
};

export const setDefaultPreset = async (id: number): Promise<void> => {
  await fetch(`${API_BASE}/presets/${id}/default`, {
    method: 'PUT',
  });
};

export const deletePreset = async (id: number): Promise<void> => {
  await fetch(`${API_BASE}/presets/${id}`, {
    method: 'DELETE',
  });
};