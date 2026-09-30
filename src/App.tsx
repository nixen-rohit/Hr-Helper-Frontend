import { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import { Employee, Filter, FilterOperator, LogicOperator, Preset, SortOrder } from './types';
import { fetchRecords, fetchPresets, createPreset, setDefaultPreset, deletePreset } from './api';

const OPERATORS: FilterOperator[] = ['equals', 'contains', '>', '<', '>=', '<=', 'startsWith', 'endsWith'];

const FIELDS: Array<{ value: keyof Employee; label: string }> = [
  { value: 'firstName', label: 'First Name' },
  { value: 'lastName', label: 'Last Name' },
  { value: 'email', label: 'Email' },
  { value: 'department', label: 'Department' },
  { value: 'position', label: 'Position' },
  { value: 'salary', label: 'Salary' },
  { value: 'age', label: 'Age' },
  { value: 'status', label: 'Status' },
  { value: 'city', label: 'City' },
  { value: 'hireDate', label: 'Hire Date' },
  { value: 'performanceScore', label: 'Performance Score' },
];

function App() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  
  // Sorting
  const [sortField, setSortField] = useState<keyof Employee | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>(null);
  
  // Filtering
  const [filters, setFilters] = useState<Filter[]>([]);
  const [logic, setLogic] = useState<LogicOperator>('AND');
  
  // Presets
  const [presets, setPresets] = useState<Preset[]>([]);
  const [activePresetId, setActivePresetId] = useState<number | null>(null);
  const [newPresetName, setNewPresetName] = useState('');
  
  const tableRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);

  // Load presets on mount and apply default
  useEffect(() => {
    const loadPresets = async () => {
      try {
        const loadedPresets = await fetchPresets();
        setPresets(loadedPresets);
        
        // Apply default preset
        const defaultPreset = loadedPresets.find(p => p.isDefault);
        if (defaultPreset) {
          setFilters(defaultPreset.filters);
          setLogic(defaultPreset.logic);
          setActivePresetId(defaultPreset.id);
        }
      } catch (error) {
        console.error('Error loading presets:', error);
      }
    };
    loadPresets();
  }, []);

  // Load data whenever filters, sorting, or logic changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    // Reset and reload data when filters/sort changes
    setEmployees([]);
    setPage(0);
    setHasMore(true);
    loadData(0, true);
  }, [filters, logic, sortField, sortOrder]);

  const loadData = async (pageNum: number, reset = false) => {
    if (loading) return;
    
    setLoading(true);
    try {
      const response = await fetchRecords(
        pageNum,
        50,
        sortField || undefined,
        sortOrder || undefined,
        filters.length > 0 ? filters : undefined,
        logic
      );
      
      setEmployees(prev => reset ? response.data : [...prev, ...response.data]);
      setHasMore(response.hasMore);
      setTotalRecords(response.total);
      setPage(pageNum);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadData(0, true);
  }, []);

  // Infinite scroll
  const handleScroll = useCallback(() => {
    if (!tableRef.current || loading || !hasMore) return;
    
    const { scrollTop, scrollHeight, clientHeight } = tableRef.current;
    if (scrollHeight - scrollTop <= clientHeight * 1.5) {
      loadData(page + 1, false);
    }
  }, [loading, hasMore, page]);

  useEffect(() => {
    const tableElement = tableRef.current;
    if (tableElement) {
      tableElement.addEventListener('scroll', handleScroll);
      return () => tableElement.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // Sorting
  const handleSort = (field: keyof Employee) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : sortOrder === 'desc' ? null : 'asc');
      if (sortOrder === 'desc') {
        setSortField(null);
      }
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Filtering
  const addFilter = () => {
    setFilters([...filters, { field: 'firstName', operator: 'contains', value: '' }]);
  };

  const updateFilter = (index: number, field: keyof Filter, value: any) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], [field]: value };
    setFilters(newFilters);
  };

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const clearFilters = () => {
    setFilters([]);
    setActivePresetId(null);
  };

  // Presets
  const loadPreset = (preset: Preset) => {
    setFilters(preset.filters);
    setLogic(preset.logic);
    setActivePresetId(preset.id);
  };

  const saveNewPreset = async () => {
    if (!newPresetName.trim() || filters.length === 0) return;
    
    try {
      const newPreset = await createPreset({
        name: newPresetName,
        filters,
        logic,
        isDefault: false,
      });
      setPresets([...presets, newPreset]);
      setNewPresetName('');
      setActivePresetId(newPreset.id);
    } catch (error) {
      console.error('Error saving preset:', error);
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      await setDefaultPreset(id);
      setPresets(presets.map(p => ({ ...p, isDefault: p.id === id })));
    } catch (error) {
      console.error('Error setting default preset:', error);
    }
  };

  const handleDeletePreset = async (id: number) => {
    try {
      await deletePreset(id);
      setPresets(presets.filter(p => p.id !== id));
      if (activePresetId === id) {
        setActivePresetId(null);
      }
    } catch (error) {
      console.error('Error deleting preset:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Employee Data Table</h1>

      {/* Presets Section */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Filter Presets</h2>
        <div className="flex flex-wrap gap-3">
          {presets.map(preset => (
            <div
              key={preset.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-md border-2 transition-colors ${
                activePresetId === preset.id 
                  ? 'border-blue-500 bg-blue-50' 
                  : preset.isDefault
                  ? 'border-yellow-300 bg-yellow-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <span 
                onClick={() => loadPreset(preset)} 
                className="cursor-pointer text-sm font-medium text-gray-700 hover:text-blue-600"
              >
                {preset.name}
                {preset.isDefault && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-600 text-white">
                    Default
                  </span>
                )}
              </span>
              <button
                className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-200 rounded hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => handleSetDefault(preset.id)}
                disabled={preset.isDefault}
              >
                Set Default
              </button>
              <button
                className="px-2 py-1 text-xs font-medium text-white bg-red-500 rounded hover:bg-red-600 transition-colors"
                onClick={() => handleDeletePreset(preset.id)}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
        
        <div className="flex gap-3 mt-4 pt-4 border-t border-gray-200">
          <input
            type="text"
            placeholder="New preset name..."
            value={newPresetName}
            onChange={(e) => setNewPresetName(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            className="px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-md hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={saveNewPreset}
            disabled={!newPresetName.trim() || filters.length === 0}
          >
            Save Current Filters as Preset
          </button>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          <div className="flex gap-2">
            <button 
              className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 transition-colors"
              onClick={addFilter}
            >
              Add Filter
            </button>
            <button 
              className="px-4 py-2 text-sm font-medium text-white bg-gray-500 rounded-md hover:bg-gray-600 transition-colors"
              onClick={clearFilters}
            >
              Clear All Filters
            </button>
          </div>
        </div>

        {filters.length > 0 && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <label className="text-sm font-medium text-gray-700">Logic:</label>
              <select 
                value={logic} 
                onChange={(e) => setLogic(e.target.value as LogicOperator)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="AND">AND (all conditions must match)</option>
                <option value="OR">OR (any condition can match)</option>
              </select>
            </div>

            <div className="space-y-3 mb-4">
              {filters.map((filter, index) => (
                <div key={index} className="flex flex-wrap gap-2 items-center p-3 bg-gray-50 rounded-md">
                  <select
                    value={filter.field}
                    onChange={(e) => updateFilter(index, 'field', e.target.value)}
                    className="min-w-[150px] px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {FIELDS.map(field => (
                      <option key={field.value} value={field.value}>
                        {field.label}
                      </option>
                    ))}
                  </select>
                  
                  <select
                    value={filter.operator}
                    onChange={(e) => updateFilter(index, 'operator', e.target.value)}
                    className="min-w-[120px] px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {OPERATORS.map(op => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                  
                  <input
                    type="text"
                    value={filter.value}
                    onChange={(e) => updateFilter(index, 'value', e.target.value)}
                    placeholder="Filter value..."
                    className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  
                  <button
                    className="px-3 py-2 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600 transition-colors"
                    onClick={() => removeFilter(index)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 text-sm text-gray-600">
          Showing {employees.length} of {totalRecords} records
          {sortField && ` • Sorted by ${sortField} (${sortOrder})`}
          {filters.length > 0 && ` • ${filters.length} filter(s) active`}
        </div>
        
        <div className="table-wrapper h-[600px] overflow-y-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10 bg-white shadow-sm">
              <tr>
                {FIELDS.map(field => (
                  <th
                    key={field.value}
                    className={`px-3 py-3 text-left text-xs font-semibold text-gray-700 bg-gray-50 border-b-2 border-gray-200 cursor-pointer select-none whitespace-nowrap hover:bg-gray-100 transition-colors ${
                      sortField === field.value ? 'text-blue-600' : ''
                    }`}
                    onClick={() => handleSort(field.value)}
                  >
                    {field.label}
                    {sortField === field.value ? (
                      sortOrder === 'asc' ? ' ▲' : ' ▼'
                    ) : (
                      <span className="text-gray-400"> ⇅</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-3 border-b border-gray-100 text-sm text-gray-700">{employee.firstName}</td>
                  <td className="px-3 py-3 border-b border-gray-100 text-sm text-gray-700">{employee.lastName}</td>
                  <td className="px-3 py-3 border-b border-gray-100 text-sm text-gray-700">{employee.email}</td>
                  <td className="px-3 py-3 border-b border-gray-100 text-sm text-gray-700">{employee.department}</td>
                  <td className="px-3 py-3 border-b border-gray-100 text-sm text-gray-700">{employee.position}</td>
                  <td className="px-3 py-3 border-b border-gray-100 text-sm text-gray-700">${employee.salary.toLocaleString()}</td>
                  <td className="px-3 py-3 border-b border-gray-100 text-sm text-gray-700">{employee.age}</td>
                  <td className="px-3 py-3 border-b border-gray-100 text-sm text-gray-700">{employee.status}</td>
                  <td className="px-3 py-3 border-b border-gray-100 text-sm text-gray-700">{employee.city}</td>
                  <td className="px-3 py-3 border-b border-gray-100 text-sm text-gray-700">{employee.hireDate}</td>
                  <td className="px-3 py-3 border-b border-gray-100 text-sm text-gray-700">{employee.performanceScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {loading && (
            <div className="py-5 text-center text-gray-600 text-sm">
              Loading more records...
            </div>
          )}
          {!loading && employees.length === 0 && (
            <div className="py-10 text-center text-gray-400 text-base">
              No records found
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}

export default App;