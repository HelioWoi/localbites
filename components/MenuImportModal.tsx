import React, { useState, useRef } from 'react';
import { X, Upload, FileText, CheckCircle, AlertCircle, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';

interface MenuImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  partnerId: string;
  onImportComplete: () => void;
}

interface ParsedMenuItem {
  name: string;
  category: string;
  description?: string;
  price?: number;
  isValid: boolean;
  errors: string[];
}

const MenuImportModal: React.FC<MenuImportModalProps> = ({ isOpen, onClose, partnerId, onImportComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedItems, setParsedItems] = useState<ParsedMenuItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importComplete, setImportComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);
    setParsedItems([]);

    try {
      const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();
      
      if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        // Parse Excel file
        const arrayBuffer = await selectedFile.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const csvText = XLSX.utils.sheet_to_csv(firstSheet);
        const items = parseCSV(csvText);
        setParsedItems(items);
      } else {
        // Parse CSV file
        const text = await selectedFile.text();
        const items = parseCSV(text);
        setParsedItems(items);
      }
    } catch (err) {
      setError('Failed to read file. Please make sure it\'s a valid CSV or Excel file.');
      console.error('File parse error:', err);
    }
  };

  const parseCSV = (text: string): ParsedMenuItem[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    // Get headers (first line)
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    // Find column indices
    const nameIndex = headers.findIndex(h => h.includes('name') || h.includes('item') || h.includes('dish'));
    const categoryIndex = headers.findIndex(h => h.includes('category') || h.includes('type'));
    const descriptionIndex = headers.findIndex(h => h.includes('description') || h.includes('desc'));
    const priceIndex = headers.findIndex(h => h.includes('price') || h.includes('cost'));

    // Parse data rows
    const items: ParsedMenuItem[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      
      const name = nameIndex >= 0 ? values[nameIndex] : '';
      const category = categoryIndex >= 0 ? values[categoryIndex] : 'Uncategorized';
      const description = descriptionIndex >= 0 ? values[descriptionIndex] : '';
      const priceStr = priceIndex >= 0 ? values[priceIndex] : '';
      const price = priceStr ? parseFloat(priceStr.replace(/[^0-9.]/g, '')) : undefined;

      const errors: string[] = [];
      if (!name) errors.push('Missing name');
      if (!category) errors.push('Missing category');

      items.push({
        name,
        category,
        description,
        price: isNaN(price!) ? undefined : price,
        isValid: errors.length === 0,
        errors
      });
    }

    return items;
  };

  const handleImport = async () => {
    if (!partnerId || parsedItems.length === 0) return;

    setIsProcessing(true);
    setImportProgress(0);

    try {
      const validItems = parsedItems.filter(item => item.isValid);
      const totalItems = validItems.length;

      for (let i = 0; i < validItems.length; i++) {
        const item = validItems[i];
        
        await supabase
          .from('menu_items')
          .insert({
            partner_id: partnerId,
            name: item.name,
            category: item.category,
            description: item.description || null,
            price: item.price || null,
            video_url: '',
            photo_url: null,
            is_active: true,
            sort_order: i
          });

        setImportProgress(Math.round(((i + 1) / totalItems) * 100));
      }

      setImportComplete(true);
      setTimeout(() => {
        onImportComplete();
        handleClose();
      }, 2000);

    } catch (err) {
      setError('Failed to import menu items. Please try again.');
      console.error('Import error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setParsedItems([]);
    setImportProgress(0);
    setImportComplete(false);
    setError(null);
    onClose();
  };

  const downloadTemplate = () => {
    const template = 'Name,Category,Description,Price\nBig Breakfast,Breakfast,Poached eggs with bacon and toast,29.00\nCappuccino,Drinks,Classic Italian coffee,5.50\nCaesar Salad,Lunch,Fresh romaine with parmesan,18.00';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'menu-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const validCount = parsedItems.filter(i => i.isValid).length;
  const invalidCount = parsedItems.length - validCount;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-200">
          <div>
            <h2 className="text-xl font-bold text-zinc-900">Import Menu</h2>
            <p className="text-sm text-zinc-500 mt-1">Upload CSV file from Uber Eats, Square, or any platform</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!file ? (
            <div className="space-y-4">
              {/* Download Template */}
              <button
                onClick={downloadTemplate}
                className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-zinc-300 rounded-xl hover:border-orange-400 hover:bg-orange-50 transition-colors"
              >
                <Download size={20} className="text-orange-500" />
                <span className="text-sm font-semibold text-zinc-700">Download CSV Template</span>
              </button>

              {/* Upload Area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-zinc-300 rounded-xl p-12 text-center hover:border-orange-400 hover:bg-orange-50 transition-colors cursor-pointer"
              >
                <Upload size={48} className="mx-auto mb-4 text-zinc-400" />
                <p className="text-lg font-semibold text-zinc-900 mb-2">Upload CSV or Excel File</p>
                <p className="text-sm text-zinc-500 mb-4">
                  Drag and drop or click to browse
                </p>
                <p className="text-xs text-zinc-400">
                  Supports CSV and Excel (.xlsx, .xls) files from Uber Eats, Square, Toast, and more
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">How to export from other platforms:</h3>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• <strong>Uber Eats:</strong> Manager → Menu → Export → Download CSV</li>
                  <li>• <strong>Square:</strong> Items → Export → Download</li>
                  <li>• <strong>Toast:</strong> Menu → Export Menu → CSV</li>
                  <li>• <strong>Manual:</strong> Use our template with Name, Category, Description, Price columns</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* File Info */}
              <div className="flex items-center gap-3 p-4 bg-zinc-50 rounded-xl">
                <FileText size={24} className="text-orange-500" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-zinc-900">{file.name}</p>
                  <p className="text-xs text-zinc-500">{parsedItems.length} items detected</p>
                </div>
                <button
                  onClick={() => {
                    setFile(null);
                    setParsedItems([]);
                  }}
                  className="text-xs text-zinc-500 hover:text-zinc-700"
                >
                  Change file
                </button>
              </div>

              {/* Stats */}
              {parsedItems.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle size={16} className="text-green-600" />
                      <span className="text-xs font-semibold text-green-900">Valid Items</span>
                    </div>
                    <p className="text-2xl font-bold text-green-600">{validCount}</p>
                  </div>
                  {invalidCount > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertCircle size={16} className="text-red-600" />
                        <span className="text-xs font-semibold text-red-900">Invalid Items</span>
                      </div>
                      <p className="text-2xl font-bold text-red-600">{invalidCount}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Preview */}
              <div className="border border-zinc-200 rounded-xl overflow-hidden">
                <div className="bg-zinc-50 px-4 py-2 border-b border-zinc-200">
                  <p className="text-xs font-semibold text-zinc-700">Preview (first 10 items)</p>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {parsedItems.slice(0, 10).map((item, index) => (
                    <div
                      key={index}
                      className={`p-3 border-b border-zinc-100 ${!item.isValid ? 'bg-red-50' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-zinc-900">{item.name || '(No name)'}</p>
                          <p className="text-xs text-zinc-500">{item.category}</p>
                          {item.description && (
                            <p className="text-xs text-zinc-400 mt-1">{item.description}</p>
                          )}
                        </div>
                        {item.price && (
                          <span className="text-sm font-semibold text-zinc-700">${item.price.toFixed(2)}</span>
                        )}
                      </div>
                      {item.errors.length > 0 && (
                        <div className="mt-2 flex items-center gap-1">
                          <AlertCircle size={12} className="text-red-500" />
                          <span className="text-xs text-red-600">{item.errors.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Progress */}
              {isProcessing && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-blue-900">Importing...</span>
                    <span className="text-sm font-semibold text-blue-600">{importProgress}%</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${importProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Success */}
              {importComplete && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                  <CheckCircle size={24} className="text-green-600" />
                  <div>
                    <p className="text-sm font-semibold text-green-900">Import Complete!</p>
                    <p className="text-xs text-green-700">{validCount} items added to your menu</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {file && !importComplete && (
          <div className="flex items-center justify-between gap-3 p-6 border-t border-zinc-200">
            <button
              onClick={handleClose}
              className="px-6 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={validCount === 0 || isProcessing}
              className="px-6 py-2.5 bg-orange-500 text-white text-sm font-semibold rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Importing...' : `Import ${validCount} Items`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MenuImportModal;
