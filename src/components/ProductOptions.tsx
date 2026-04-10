// src/components/ProductOptions.tsx
// P0-5: Complete option system redesign
// Types: Single (단독형), Combination (조합형), Direct (직접입력형)

'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Download, RefreshCw, AlertCircle } from 'lucide-react';

type OptionType = 'single' | 'combination' | 'direct';

interface OptionName {
  name: string;
}

interface OptionRow {
  id: string;
  values: string[]; // e.g., ["빨강", "S"] for combination
  optionPrice?: number;
  stock?: number;
  saleStatus?: string;
  managementCode?: string;
  enabled: boolean;
}

interface DirectInput {
  name: string;
  enabled: boolean;
}

interface ProductOptionsProps {
  value?: {
    optionType: OptionType;
    optionNames?: OptionName[];
    optionRows?: OptionRow[];
    directInputs?: DirectInput[];
  } | null;
  onChange: (value: {
    optionType: OptionType;
    optionNames?: OptionName[];
    optionRows?: OptionRow[];
    directInputs?: DirectInput[];
  }) => void;
}

export default function ProductOptions({
  value,
  onChange
}: ProductOptionsProps) {
  const [optionType, setOptionType] = useState<OptionType>(value?.optionType || 'combination');
  const [numOptions, setNumOptions] = useState(2);
  const [sortOrder, setSortOrder] = useState('registration');
  
  // Option names and values input
  const [optionInputs, setOptionInputs] = useState<{ name: string; values: string }[]>([
    { name: '', values: '' },
    { name: '', values: '' }
  ]);
  
  // Generated option rows
  const [optionRows, setOptionRows] = useState<OptionRow[]>([]);
  
  // Direct input options (max 5)
  const [directInputs, setDirectInputs] = useState<DirectInput[]>([
    { name: '', enabled: true }
  ]);

  useEffect(() => {
    if (value) {
      setOptionType(value.optionType);
      if (value.optionNames && value.optionNames.length > 0) {
        setNumOptions(value.optionNames.length);
      }
      if (value.optionRows) {
        setOptionRows(value.optionRows);
      }
      if (value.directInputs) {
        setDirectInputs(value.directInputs);
      }
    }
  }, [value]);

  useEffect(() => {
    // Update parent component
    if (optionType === 'direct') {
      onChange({
        optionType: 'direct',
        directInputs
      });
    } else {
      onChange({
        optionType,
        optionNames: optionInputs.map(input => ({ name: input.name })),
        optionRows
      });
    }
  }, [optionType, optionInputs, optionRows, directInputs]);

  const handleOptionTypeChange = (type: OptionType) => {
    setOptionType(type);
    setOptionRows([]);
    if (type === 'direct') {
      setDirectInputs([{ name: '', enabled: true }]);
    }
  };

  const handleNumOptionsChange = (num: number) => {
    setNumOptions(num);
    const newInputs = Array.from({ length: num }, (_, i) => 
      optionInputs[i] || { name: '', values: '' }
    );
    setOptionInputs(newInputs);
  };

  const handleOptionInputChange = (index: number, field: 'name' | 'values', value: string) => {
    const newInputs = [...optionInputs];
    newInputs[index] = { ...newInputs[index], [field]: value };
    setOptionInputs(newInputs);
  };

  const generateCombinations = () => {
    // Parse values from comma-separated strings
    const optionSets = optionInputs
      .filter(input => input.name && input.values)
      .map(input => ({
        name: input.name.trim(),
        values: input.values.split(',').map(v => v.trim()).filter(Boolean)
      }));

    if (optionSets.length === 0) {
      alert('Please enter option names and values');
      return;
    }

    let combinations: OptionRow[] = [];

    if (optionType === 'combination') {
      // Cartesian product for combinations
      combinations = generateCartesianProduct(optionSets);
    } else {
      // Flat list for single type
      combinations = generateFlatList(optionSets);
    }

    setOptionRows(combinations);
  };

  const generateCartesianProduct = (optionSets: { name: string; values: string[] }[]): OptionRow[] => {
    const results: OptionRow[] = [];
    
    const recurse = (current: string[], depth: number) => {
      if (depth === optionSets.length) {
        results.push({
          id: Math.random().toString(36).substr(2, 9),
          values: [...current],
          optionPrice: 0,
          stock: 0,
          saleStatus: 'active',
          managementCode: '',
          enabled: true
        });
        return;
      }

      for (const value of optionSets[depth].values) {
        recurse([...current, value], depth + 1);
      }
    };

    recurse([], 0);
    return results;
  };

  const generateFlatList = (optionSets: { name: string; values: string[] }[]): OptionRow[] => {
    const results: OptionRow[] = [];
    
    optionSets.forEach(set => {
      set.values.forEach(value => {
        results.push({
          id: Math.random().toString(36).substr(2, 9),
          values: [value],
          enabled: true
        });
      });
    });

    return results;
  };

  const handleRowChange = (id: string, field: string, value: any) => {
    setOptionRows(rows => 
      rows.map(row => 
        row.id === id ? { ...row, [field]: value } : row
      )
    );
  };

  const handleDeleteRow = (id: string) => {
    setOptionRows(rows => rows.filter(row => row.id !== id));
  };

  const handleAddRow = () => {
    const newRow: OptionRow = {
      id: Math.random().toString(36).substr(2, 9),
      values: optionInputs.map(() => ''),
      enabled: true
    };

    if (optionType === 'combination') {
      newRow.optionPrice = 0;
      newRow.stock = 0;
      newRow.saleStatus = 'active';
      newRow.managementCode = '';
    }

    setOptionRows([...optionRows, newRow]);
  };

  const handleDeleteSelected = () => {
    setOptionRows(rows => rows.filter(row => row.enabled));
  };

  // Direct input handlers
  const handleDirectInputChange = (index: number, field: 'name' | 'enabled', value: string | boolean) => {
    const newInputs = [...directInputs];
    newInputs[index] = { ...newInputs[index], [field]: value };
    setDirectInputs(newInputs);
  };

  const handleAddDirectInput = () => {
    if (directInputs.length < 5) {
      setDirectInputs([...directInputs, { name: '', enabled: true }]);
    }
  };

  const handleDeleteDirectInput = (index: number) => {
    setDirectInputs(directInputs.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* Option Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Option Configuration Type
        </label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="optionType"
              value="single"
              checked={optionType === 'single'}
              onChange={() => handleOptionTypeChange('single')}
              className="w-4 h-4 text-pink-600 focus:ring-pink-500"
            />
            <span className="text-sm">Single</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="optionType"
              value="combination"
              checked={optionType === 'combination'}
              onChange={() => handleOptionTypeChange('combination')}
              className="w-4 h-4 text-pink-600 focus:ring-pink-500"
            />
            <span className="text-sm">Combination</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="optionType"
              value="direct"
              checked={optionType === 'direct'}
              onChange={() => handleOptionTypeChange('direct')}
              className="w-4 h-4 text-pink-600 focus:ring-pink-500"
            />
            <span className="text-sm">Direct Input</span>
          </label>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {optionType === 'single' && "Flat list without stock/price per option"}
          {optionType === 'combination' && "Cartesian product with stock/price per combination"}
          {optionType === 'direct' && "Customer enters text directly (max 5 fields)"}
        </p>
      </div>

      {/* Single & Combination Type UI */}
      {(optionType === 'single' || optionType === 'combination') && (
        <>
          {/* Configuration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of Options
              </label>
              <select
                value={numOptions}
                onChange={(e) => handleNumOptionsChange(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              >
                <option value={1}>1 option</option>
                <option value={2}>2 options</option>
                <option value={3}>3 options</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort Order
              </label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              >
                <option value="registration">Registration Order</option>
                <option value="alphabetical">Alphabetical</option>
              </select>
            </div>
          </div>

          {/* Option Inputs */}
          <div className="space-y-3">
            {optionInputs.map((input, index) => (
              <div key={index} className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder={`Option ${index + 1} name (e.g., Color)`}
                  value={input.name}
                  onChange={(e) => handleOptionInputChange(index, 'name', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="Values (comma-separated: Red,Blue,Green)"
                  value={input.values}
                  onChange={(e) => handleOptionInputChange(index, 'values', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>
            ))}
          </div>

          {/* Generate Button */}
          <button
            type="button"
            onClick={generateCombinations}
            className="w-full px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Generate Option List
          </button>

          {/* Option List Table */}
          {optionRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900">
                  Generated Options ({optionRows.length})
                </h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleDeleteSelected}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Delete Selected
                  </button>
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="px-3 py-1 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add Row
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2 text-left"><input type="checkbox" /></th>
                      {optionInputs.map((input, i) => (
                        <th key={i} className="px-3 py-2 text-left">{input.name || `Option ${i + 1}`}</th>
                      ))}
                      {optionType === 'combination' && (
                        <>
                          <th className="px-3 py-2 text-left">Price</th>
                          <th className="px-3 py-2 text-left">Stock</th>
                          <th className="px-3 py-2 text-left">Status</th>
                          <th className="px-3 py-2 text-left">Code</th>
                        </>
                      )}
                      <th className="px-3 py-2 text-left">Enabled</th>
                      <th className="px-3 py-2 text-left">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {optionRows.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <input type="checkbox" checked={row.enabled} onChange={(e) => handleRowChange(row.id, 'enabled', e.target.checked)} />
                        </td>
                        {row.values.map((value, i) => (
                          <td key={i} className="px-3 py-2">{value}</td>
                        ))}
                        {optionType === 'combination' && (
                          <>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                value={row.optionPrice || 0}
                                onChange={(e) => handleRowChange(row.id, 'optionPrice', Number(e.target.value))}
                                className="w-20 px-2 py-1 border border-gray-300 rounded"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                value={row.stock || 0}
                                onChange={(e) => handleRowChange(row.id, 'stock', Number(e.target.value))}
                                className="w-20 px-2 py-1 border border-gray-300 rounded"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <select
                                value={row.saleStatus || 'active'}
                                onChange={(e) => handleRowChange(row.id, 'saleStatus', e.target.value)}
                                className="w-24 px-2 py-1 border border-gray-300 rounded text-xs"
                              >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={row.managementCode || ''}
                                onChange={(e) => handleRowChange(row.id, 'managementCode', e.target.value)}
                                className="w-24 px-2 py-1 border border-gray-300 rounded text-xs"
                                placeholder="Code"
                              />
                            </td>
                          </>
                        )}
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={row.enabled}
                            onChange={(e) => handleRowChange(row.id, 'enabled', e.target.checked)}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(row.id)}
                            className="p-1 text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Direct Input Type UI */}
      {optionType === 'direct' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">Direct Input Options</p>
                <p className="text-xs text-blue-700 mt-1">
                  Customers will manually enter text for these options (max 5).
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {directInputs.map((input, index) => (
              <div key={index} className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder={`Option ${index + 1} name (e.g., Engraving Text)`}
                  value={input.name}
                  onChange={(e) => handleDirectInputChange(index, 'name', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={input.enabled}
                    onChange={(e) => handleDirectInputChange(index, 'enabled', e.target.checked)}
                    className="w-4 h-4 text-pink-600 focus:ring-pink-500 rounded"
                  />
                  <span className="text-sm text-gray-600">Enabled</span>
                </label>
                <button
                  type="button"
                  onClick={() => handleDeleteDirectInput(index)}
                  disabled={directInputs.length === 1}
                  className="p-2 text-red-600 hover:text-red-800 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {directInputs.length < 5 && (
            <button
              type="button"
              onClick={handleAddDirectInput}
              className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-pink-500 hover:bg-pink-50 transition-colors flex items-center justify-center gap-2 text-gray-600 hover:text-pink-600"
            >
              <Plus className="w-5 h-5" />
              Add Option Field ({directInputs.length}/5)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
