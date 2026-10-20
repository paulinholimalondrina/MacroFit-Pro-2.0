import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Plus, X, Check, Loader2, PenSquare, Utensils, ScanBarcode } from 'lucide-react';
import type { FoodItem } from '../data/tacoDatabase.ts';
import { BARCODE_CATALOG_BR, BASE_TACO_EXPANDIDA } from '../data/tacoDatabase.ts';
import {
  PORTION_UNITS,
  calcularPorcaoAlimento,
  filterFoodsByQuery,
  normalizeBarcode,
  parseOpenFoodFactsProduct,
  removerAcentos,
  type DiaryEntry,
} from '../utils/nutrition.ts';
import { BarcodeScannerView } from './BarcodeScannerView.tsx';

interface FoodSearchModalProps {
  isOpen: boolean;
  targetCategory: string;
  customFoods: FoodItem[];
  apiBaseUrl: string;
  initialBarcodeMode?: boolean;
  onClose: () => void;
  onAddDiaryEntry: (entry: Omit<DiaryEntry, 'id'>) => void;
  onSaveCustomFood: (food: FoodItem) => Promise<void>;
}

export const FoodSearchModal: React.FC<FoodSearchModalProps> = ({
  isOpen,
  targetCategory,
  customFoods,
  apiBaseUrl,
  initialBarcodeMode = false,
  onClose,
  onAddDiaryEntry,
  onSaveCustomFood,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodItem[]>([]);
  const [searchOrigin, setSearchOrigin] = useState<string>('Base TACO Pronta');
  const [isSearching, setIsSearching] = useState(false);

  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [quantity, setQuantity] = useState<string>('100');
  const [selectedUnitIdx, setSelectedUnitIdx] = useState<number>(0);

  // Barcode scanner sub-mode
  const [isBarcodeMode, setIsBarcodeMode] = useState(false);
  const [isLookingUpBarcode, setIsLookingUpBarcode] = useState(false);
  const [barcodeError, setBarcodeError] = useState('');

  // Manual food creation sub-mode
  const [isManualMode, setIsManualMode] = useState(false);
  const [manNome, setManNome] = useState('');
  const [manMarca, setManMarca] = useState('');
  const [manCodigoBarras, setManCodigoBarras] = useState('');
  const [manKcal, setManKcal] = useState('');
  const [manProt, setManProt] = useState('');
  const [manCarb, setManCarb] = useState('');
  const [manFat, setManFat] = useState('');
  const [manError, setManError] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedFood(null);
      setQuantity('100');
      setSelectedUnitIdx(0);
      setIsManualMode(false);
      setIsBarcodeMode(Boolean(initialBarcodeMode));
      setIsLookingUpBarcode(false);
      setBarcodeError('');
      setManCodigoBarras('');
      setManError('');
      const initialList = [...customFoods, ...BASE_TACO_EXPANDIDA.slice(0, 14)];
      setResults(initialList);
      setSearchOrigin('Sugestões TACO & Favoritos');
      if (!initialBarcodeMode) {
        setTimeout(() => inputRef.current?.focus(), 80);
      }
    }
  }, [isOpen, customFoods, initialBarcodeMode]);

  useEffect(() => {
    if (!isOpen || isBarcodeMode) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      const baseList = [...customFoods, ...BASE_TACO_EXPANDIDA.slice(0, 14)];
      if (selectedFood && !baseList.some((i) => i.nome === selectedFood.nome && i.marca === selectedFood.marca)) {
        setResults([selectedFood, ...baseList]);
      } else {
        setResults(baseList);
      }
      if (!selectedFood?.codigoBarras) {
        setSearchOrigin('Sugestões TACO & Favoritos');
      }
      setIsSearching(false);
      return;
    }

    // Immediate local search (0ms)
    const combinedLocal = [...customFoods, ...BASE_TACO_EXPANDIDA];
    const localMatches = filterFoodsByQuery(combinedLocal, trimmed);
    setResults(localMatches);
    setSearchOrigin(`TACO Local (${localMatches.length} itens)`);

    // Debounced hybrid API search (FatSecret + Neon + TACO)
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const base = apiBaseUrl.replace(/\/+$/, '');
        const endpoint = `${base}/api/alimentos?q=${encodeURIComponent(trimmed)}`;
        const resp = await fetch(endpoint);
        if (resp.ok) {
          const data = (await resp.json()) as { origem?: string; itens?: FoodItem[] };
          if (Array.isArray(data.itens) && data.itens.length > 0) {
            const seen = new Set<string>();
            const merged: FoodItem[] = [];
            for (const item of [...localMatches, ...data.itens]) {
              const key = `${removerAcentos(item.nome)}|${removerAcentos(item.marca)}`;
              if (!seen.has(key)) {
                seen.add(key);
                merged.push(item);
              }
            }
            setResults(merged);
            const labelOrigem =
              data.origem === 'hibrido_taco_fatsecret'
                ? 'Híbrido TACO + FatSecret'
                : data.origem === 'hibrido_openfoodfacts'
                  ? 'Híbrido TACO + OpenFoodFacts'
                  : 'Base TACO + Cache';
            setSearchOrigin(`${labelOrigem} (${merged.length})`);
          }
        }
      } catch {
        // Keep fast local TACO results on offline
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query, isOpen, isBarcodeMode, customFoods, apiBaseUrl]);

  const handleBarcodeDetected = useCallback(
    async (rawCode: string) => {
      const cleanCode = normalizeBarcode(rawCode);
      if (cleanCode.length < 8) {
        setBarcodeError('Código de barras inválido (mínimo 8 dígitos).');
        return;
      }

      setBarcodeError('');
      setIsLookingUpBarcode(true);

      const applyDiscoveredFood = (food: FoodItem, originLabel: string) => {
        setIsBarcodeMode(false);
        setIsLookingUpBarcode(false);
        setSelectedFood(food);
        setQuantity('100');
        setSelectedUnitIdx(0);
        setResults((prev) => [
          food,
          ...prev.filter((p) => p.nome !== food.nome || p.marca !== food.marca),
        ]);
        setSearchOrigin(originLabel);
      };

      try {
        // 1. Check custom foods saved locally
        const localCustom = customFoods.find(
          (f) => f.codigoBarras && normalizeBarcode(f.codigoBarras) === cleanCode
        );
        if (localCustom) {
          applyDiscoveredFood(localCustom, `Código ${cleanCode} (Seus Favoritos)`);
          return;
        }

        // 2. Check built-in Brazilian EAN-13 Catalog (0ms)
        if (BARCODE_CATALOG_BR[cleanCode]) {
          applyDiscoveredFood(BARCODE_CATALOG_BR[cleanCode], `Código ${cleanCode} (Catálogo BR)`);
          return;
        }

        // 3. Query Backend Barcode Endpoint (/api/alimentos/barcode/:code)
        const base = apiBaseUrl.replace(/\/+$/, '');
        try {
          const apiResp = await fetch(
            `${base}/api/alimentos/barcode/${encodeURIComponent(cleanCode)}`
          );
          if (apiResp.ok) {
            const data = (await apiResp.json()) as { item?: FoodItem; origem?: string };
            if (data.item) {
              applyDiscoveredFood(data.item, `Código ${cleanCode} (API Híbrida)`);
              return;
            }
          }
        } catch {
          // Fallback to direct client-side OpenFoodFacts lookup below
        }

        // 4. Direct browser fallback to OpenFoodFacts API v2 (works offline from backend / on GitHub Pages)
        const offUrls = [
          `https://br.openfoodfacts.org/api/v2/product/${encodeURIComponent(cleanCode)}.json`,
          `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(cleanCode)}.json`,
        ];
        for (const url of offUrls) {
          try {
            const offResp = await fetch(url);
            if (offResp.ok) {
              const offData = await offResp.json();
              const parsed = parseOpenFoodFactsProduct(offData, cleanCode);
              if (parsed) {
                await onSaveCustomFood(parsed);
                applyDiscoveredFood(parsed, `Código ${cleanCode} (OpenFoodFacts)`);
                return;
              }
            }
          } catch {
            // continue
          }
        }

        // 5. If barcode is brand new, open manual registration pre-filled with the barcode!
        setIsBarcodeMode(false);
        setIsLookingUpBarcode(false);
        setManCodigoBarras(cleanCode);
        setManNome('');
        setManMarca('');
        setManError(
          `Código ${cleanCode} lido com sucesso! Como este produto ainda não consta na base pública, informe os dados do rótulo abaixo para salvá-lo.`
        );
        setIsManualMode(true);
      } finally {
        setIsLookingUpBarcode(false);
      }
    },
    [apiBaseUrl, customFoods, onSaveCustomFood]
  );

  if (!isOpen) return null;

  const currentUnit = PORTION_UNITS[selectedUnitIdx] || PORTION_UNITS[0];
  const numericQty = parseFloat(quantity) || 0;

  const previewMacros = selectedFood
    ? calcularPorcaoAlimento(selectedFood, numericQty, currentUnit.gramsPerUnit)
    : { calorias: 0, proteinas: 0, carboidratos: 0, gorduras: 0, gramasTotais: 0 };

  const handleSelectFood = (food: FoodItem) => {
    setSelectedFood(food);
    if (currentUnit.gramsPerUnit === 1) {
      setQuantity('100');
    } else {
      setQuantity('1');
    }
  };

  const handleUnitChange = (newIdx: number) => {
    setSelectedUnitIdx(newIdx);
    const newUnit = PORTION_UNITS[newIdx];
    if (newUnit.gramsPerUnit === 1 && numericQty <= 5) {
      setQuantity('100');
    } else if (newUnit.gramsPerUnit > 1 && numericQty >= 50) {
      setQuantity('1');
    }
  };

  const handleConfirmAdd = () => {
    if (!selectedFood || numericQty <= 0) return;

    const unitDesc =
      currentUnit.gramsPerUnit === 1
        ? `${numericQty}${currentUnit.shortUnit}`
        : `${numericQty} ${currentUnit.shortUnit} (${previewMacros.gramasTotais}g)`;

    onAddDiaryEntry({
      categoria: targetCategory,
      nome: selectedFood.nome,
      marca: selectedFood.marca || 'TACO',
      quantidade: numericQty,
      unidadeDesc: unitDesc,
      calorias: previewMacros.calorias,
      proteinas: previewMacros.proteinas,
      carboidratos: previewMacros.carboidratos,
      gorduras: previewMacros.gorduras,
    });
    onClose();
  };

  const handleCreateManualFood = async (e: React.FormEvent) => {
    e.preventDefault();
    const nome = manNome.trim();
    if (!nome) {
      setManError('Informe o nome do alimento.');
      return;
    }
    if (manKcal === '' || isNaN(Number(manKcal))) {
      setManError('Informe as calorias por 100g.');
      return;
    }

    const cleanBarcode = normalizeBarcode(manCodigoBarras);
    const novo: FoodItem = {
      nome,
      marca: manMarca.trim() || 'Manual',
      calorias: Math.max(0, parseFloat(manKcal) || 0),
      proteinas: Math.max(0, parseFloat(manProt) || 0),
      carboidratos: Math.max(0, parseFloat(manCarb) || 0),
      gorduras: Math.max(0, parseFloat(manFat) || 0),
      fonte: cleanBarcode ? 'BARCODE' : 'MANUAL',
      ...(cleanBarcode ? { codigoBarras: cleanBarcode } : {}),
    };

    await onSaveCustomFood(novo);
    setIsManualMode(false);
    setSelectedFood(novo);
    setQuantity('100');
    setSelectedUnitIdx(0);
    setManNome('');
    setManMarca('');
    setManCodigoBarras('');
    setManKcal('');
    setManProt('');
    setManCarb('');
    setManFat('');
    setManError('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="food-modal-title"
    >
      <div className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-[#111827] border-t sm:border border-slate-800 p-5 sm:p-6 shadow-2xl max-h-[92vh] flex flex-col">
        <div className="w-10 h-1.5 bg-slate-700 rounded-full mx-auto mb-3 sm:hidden shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-3 shrink-0">
          <div>
            <h3 id="food-modal-title" className="text-base font-bold text-white flex items-center gap-2">
              <Utensils className="w-4 h-4 text-emerald-400" />
              {isBarcodeMode
                ? 'Leitor de Código de Barras'
                : isManualMode
                  ? 'Cadastrar Alimento Manual'
                  : 'Buscar & Adicionar Alimento'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Refeição destino: <strong className="text-emerald-400">{targetCategory}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar busca de alimentos"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isBarcodeMode ? (
          <div className="overflow-y-auto pr-1">
            <BarcodeScannerView
              onDetected={handleBarcodeDetected}
              onCancel={() => setIsBarcodeMode(false)}
              isLookingUp={isLookingUpBarcode}
              errorMsg={barcodeError}
            />
          </div>
        ) : isManualMode ? (
          <form onSubmit={handleCreateManualFood} className="space-y-3 overflow-y-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="man-nome" className="block text-xs font-medium text-slate-300 mb-1">
                  Nome do Alimento *
                </label>
                <input
                  id="man-nome"
                  type="text"
                  value={manNome}
                  onChange={(e) => setManNome(e.target.value)}
                  placeholder="Ex: Barra de Proteína..."
                  className="w-full min-h-[44px] bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label htmlFor="man-marca" className="block text-xs font-medium text-slate-300 mb-1">
                  Marca / Fabricante
                </label>
                <input
                  id="man-marca"
                  type="text"
                  value={manMarca}
                  onChange={(e) => setManMarca(e.target.value)}
                  placeholder="Ex: Integralmédica, Nestlé..."
                  className="w-full min-h-[44px] bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="man-barcode" className="block text-xs font-medium text-slate-300 mb-1">
                Código de Barras EAN-13 (Opcional)
              </label>
              <input
                id="man-barcode"
                type="text"
                inputMode="numeric"
                value={manCodigoBarras}
                onChange={(e) => setManCodigoBarras(e.target.value)}
                placeholder="Ex: 7891000100103"
                className="w-full min-h-[42px] bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-emerald-400 font-mono outline-none focus:border-emerald-500"
              />
            </div>

            <p className="text-xs font-semibold text-emerald-400 pt-1">
              Valores nutricionais por 100g (ou 100ml):
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="man-kcal" className="block text-xs text-slate-400 mb-1">
                  Calorias (kcal) *
                </label>
                <input
                  id="man-kcal"
                  type="number"
                  step="any"
                  value={manKcal}
                  onChange={(e) => setManKcal(e.target.value)}
                  placeholder="250"
                  className="w-full min-h-[44px] bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label htmlFor="man-prot" className="block text-xs text-slate-400 mb-1">
                  Proteínas (g)
                </label>
                <input
                  id="man-prot"
                  type="number"
                  step="any"
                  value={manProt}
                  onChange={(e) => setManProt(e.target.value)}
                  placeholder="12"
                  className="w-full min-h-[44px] bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label htmlFor="man-carb" className="block text-xs text-slate-400 mb-1">
                  Carboidratos (g)
                </label>
                <input
                  id="man-carb"
                  type="number"
                  step="any"
                  value={manCarb}
                  onChange={(e) => setManCarb(e.target.value)}
                  placeholder="30"
                  className="w-full min-h-[44px] bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label htmlFor="man-fat" className="block text-xs text-slate-400 mb-1">
                  Gorduras Totais (g)
                </label>
                <input
                  id="man-fat"
                  type="number"
                  step="any"
                  value={manFat}
                  onChange={(e) => setManFat(e.target.value)}
                  placeholder="8"
                  className="w-full min-h-[44px] bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {manError && <p className="text-xs text-emerald-300 font-medium">{manError}</p>}

            <div className="pt-3 border-t border-slate-800 flex gap-2">
              <button
                type="button"
                onClick={() => setIsManualMode(false)}
                className="flex-1 min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Voltar para Busca
              </button>
              <button
                type="submit"
                className="flex-1 min-h-[44px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-colors cursor-pointer"
              >
                Salvar & Selecionar
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* Search Input & Camera Barcode Trigger */}
            <div className="flex gap-2 mb-2 shrink-0">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Pesquisar alimento ou marca"
                  placeholder="Ex: Nescau, Frango, Arroz, Whey..."
                  className="w-full min-h-[46px] bg-slate-950 border border-slate-700/90 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 transition-colors"
                />
                {isSearching && (
                  <Loader2 className="w-4 h-4 text-emerald-400 animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsBarcodeMode(true)}
                aria-label="Ler código de barras com a câmera"
                className="min-h-[46px] px-3.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 font-bold text-xs flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer whitespace-nowrap"
              >
                <ScanBarcode className="w-4 h-4 text-emerald-400" />
                <span>Ler Código</span>
              </button>
            </div>

            {/* Search Metadata */}
            <div className="flex items-center justify-between text-xs text-slate-400 px-1 mb-2 shrink-0">
              <span>
                {query.trim().length < 2
                  ? 'Toque em um alimento ou leia o código de barras'
                  : `Resultados para "${query}"`}
              </span>
              <span className="font-mono text-[11px] text-slate-400">{searchOrigin}</span>
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 min-h-[140px] max-h-[210px] border border-slate-800/90 rounded-xl p-2 bg-slate-950/50 mb-3">
              {results.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 space-y-2">
                  <p>Nenhum alimento encontrado para "{query}".</p>
                  <button
                    type="button"
                    onClick={() => {
                      setManNome(query);
                      setIsManualMode(true);
                    }}
                    className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold hover:underline cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Cadastrar "{query}" manualmente
                  </button>
                </div>
              ) : (
                results.map((item, idx) => {
                  const isSelected =
                    selectedFood?.nome === item.nome && selectedFood?.marca === item.marca;
                  return (
                    <button
                      key={`${item.nome}-${item.marca}-${idx}`}
                      type="button"
                      onClick={() => handleSelectFood(item)}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500/15 border-emerald-500/60 text-white'
                          : 'bg-slate-900/70 hover:bg-slate-800/80 border-slate-800/80 text-slate-200'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-white truncate">{item.nome}</p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {item.marca} · 100g
                          {item.codigoBarras ? ` · EAN ${item.codigoBarras}` : ''}
                        </p>
                      </div>
                      <div className="text-right shrink-0 font-mono">
                        <span className="text-xs font-bold text-emerald-400 block">
                          {Math.round(item.calorias)} kcal
                        </span>
                        <span className="text-[10px] text-slate-400">
                          P:{item.proteinas}g · C:{item.carboidratos}g · G:{item.gorduras}g
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Manual Food Button */}
            <button
              type="button"
              onClick={() => {
                setManNome(query);
                setIsManualMode(true);
              }}
              className="w-full min-h-[40px] mb-3 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-emerald-400 text-xs font-semibold transition-colors border border-dashed border-slate-700 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <PenSquare className="w-3.5 h-3.5 text-emerald-400" />
              Não encontrou o produto? Cadastrar Alimento Manualmente
            </button>

            {/* Selected Food Portion Calculator */}
            {selectedFood && (
              <div className="border-t border-slate-800 pt-3 space-y-3 shrink-0">
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{selectedFood.nome}</p>
                      <p className="text-xs text-slate-400 truncate">
                        {selectedFood.marca} ·{' '}
                        {selectedFood.codigoBarras
                          ? `Código ${selectedFood.codigoBarras}`
                          : selectedFood.fonte === 'FATSECRET'
                            ? 'FatSecret'
                            : selectedFood.fonte === 'MANUAL'
                              ? 'Cadastro Manual'
                              : 'Tabela TACO'}
                      </p>
                    </div>
                    <span className="text-xs font-mono text-slate-400 shrink-0">
                      Total: {previewMacros.gramasTotais}g
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label htmlFor="portion-qty" className="block text-[11px] font-medium text-slate-400 mb-1">
                        Quantidade
                      </label>
                      <input
                        id="portion-qty"
                        type="number"
                        min="0.1"
                        step="any"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="w-full min-h-[42px] bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white font-mono font-bold outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="portion-unit" className="block text-[11px] font-medium text-slate-400 mb-1">
                        Unidade / Medida
                      </label>
                      <select
                        id="portion-unit"
                        value={selectedUnitIdx}
                        onChange={(e) => handleUnitChange(Number(e.target.value))}
                        className="w-full min-h-[42px] bg-slate-950 border border-slate-700 rounded-lg pl-2.5 pr-7 py-1.5 text-xs text-white font-medium outline-none focus:border-emerald-500"
                      >
                        {PORTION_UNITS.map((u, i) => (
                          <option key={u.label} value={i}>
                            {u.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Live Calculated Macros Preview */}
                  <div className="grid grid-cols-4 gap-2 mt-3 text-center bg-slate-950/90 p-2.5 rounded-lg border border-slate-800/80 font-mono">
                    <div>
                      <span className="block text-[10px] font-sans text-slate-400">Calorias</span>
                      <span className="text-sm font-bold text-emerald-400">{previewMacros.calorias}</span>
                      <span className="text-[10px] text-slate-500 ml-0.5">kcal</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-sans text-slate-400">Proteína</span>
                      <span className="text-sm font-bold text-rose-400">{previewMacros.proteinas}</span>
                      <span className="text-[10px] text-slate-500 ml-0.5">g</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-sans text-slate-400">Carbo</span>
                      <span className="text-sm font-bold text-amber-400">{previewMacros.carboidratos}</span>
                      <span className="text-[10px] text-slate-500 ml-0.5">g</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-sans text-slate-400">Gordura</span>
                      <span className="text-sm font-bold text-sky-400">{previewMacros.gorduras}</span>
                      <span className="text-[10px] text-slate-500 ml-0.5">g</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleConfirmAdd}
                  className="w-full min-h-[48px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  Registrar em {targetCategory}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
