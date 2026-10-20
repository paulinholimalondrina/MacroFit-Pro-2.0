/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Droplets,
  Flame,
  Plus,
  RotateCcw,
  Trash2,
  Utensils,
  Calculator,
  Database,
  UserCheck,
  Smartphone,
  FolderPlus,
  X,
} from 'lucide-react';
import type { FoodItem } from './data/tacoDatabase.ts';
import {
  calcularMetasMetabolicas,
  calcularTotaisDiarios,
  type DiaryEntry,
  type MetabolicGoals,
} from './utils/nutrition.ts';
import { FoodSearchModal } from './components/FoodSearchModal.tsx';
import { MetabolicGoalsView } from './components/MetabolicGoalsView.tsx';
import { TacoCatalogView } from './components/TacoCatalogView.tsx';
import { AccountCloudView } from './components/AccountCloudView.tsx';
import { PWAInstallModal } from './components/PWAInstallModal.tsx';
import { usePWAInstall } from './hooks/usePWAInstall.ts';

type ActiveTab = 'diario' | 'metas' | 'catalogo' | 'conta';

const DEFAULT_CATEGORIES = ['Café da Manhã', 'Almoço', 'Lanche da Tarde', 'Jantar'];

const DEFAULT_METAS: MetabolicGoals = calcularMetasMetabolicas({
  genero: 'm',
  idade: 30,
  peso: 75,
  altura: 175,
  atividade: 1.55,
  objetivo: 0,
});

function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatPortugueseDate(isoDate: string): string {
  try {
    const [y, m, d] = isoDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    });
  } catch {
    return isoDate;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('diario');
  const [currentDate, setCurrentDate] = useState<string>(getTodayISO);

  // Categories
  const [categories, setCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('macrofit_categorias');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return DEFAULT_CATEGORIES;
  });

  // Metabolic goals
  const [metas, setMetas] = useState<MetabolicGoals>(() => {
    try {
      const saved = localStorage.getItem('macrofit_metas');
      if (saved) return { ...DEFAULT_METAS, ...JSON.parse(saved) };
    } catch {
      // ignore
    }
    return DEFAULT_METAS;
  });

  // Daily diary & water for current date
  const [diario, setDiario] = useState<Record<string, DiaryEntry[]>>({});
  const [aguaAtual, setAguaAtual] = useState<number>(0);

  // Custom foods saved locally
  const [customFoods, setCustomFoods] = useState<FoodItem[]>(() => {
    try {
      const saved = localStorage.getItem('macrofit_custom_foods');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  // Multi-user Auth & Backend API URL
  const [currentUser, setCurrentUser] = useState<string | null>(() =>
    localStorage.getItem('macrofit_usuario')
  );
  const [authToken, setAuthToken] = useState<string | null>(() =>
    localStorage.getItem('macrofit_token')
  );
  const [apiBaseUrl, setApiBaseUrl] = useState<string>(() => {
    const saved = localStorage.getItem('macrofit_backend_url');
    if (saved !== null) return saved;
    if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
      return 'https://ais-pre-bni4jp6evocwom3vuscuhd-481614738372.us-east5.run.app';
    }
    return '';
  });
  const [serverStatus, setServerStatus] = useState<{
    online: boolean;
    database: string;
    message: string;
  }>({
    online: true,
    database: 'neon_postgresql',
    message: 'API Híbrida TACO + FatSecret Ativa',
  });

  // Modals
  const [foodModalCategory, setFoodModalCategory] = useState<string | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  const { isInstalled } = usePWAInstall();

  // Check API status
  const testBackendConnection = useCallback(
    async (overrideUrl?: string) => {
      const base = (overrideUrl !== undefined ? overrideUrl : apiBaseUrl).replace(/\/+$/, '');
      try {
        // Try /api/status first, then root /
        const resp = await fetch(`${base}/api/status`);
        if (resp.ok) {
          const data = (await resp.json()) as { database?: string; mensagem?: string };
          setServerStatus({
            online: true,
            database: data.database || 'neon_postgresql',
            message: data.mensagem || 'Servidor Integrado TACO + FatSecret Conectado',
          });
          return;
        }
        const rootResp = await fetch(`${base}/`);
        if (rootResp.ok) {
          setServerStatus({
            online: true,
            database: 'neon_postgresql',
            message: 'Servidor API Externo Conectado',
          });
          return;
        }
      } catch {
        // Fallback offline
      }
      setServerStatus({
        online: false,
        database: 'offline_taco',
        message: 'Modo Offline (Base TACO Local Ativa)',
      });
    },
    [apiBaseUrl]
  );

  useEffect(() => {
    testBackendConnection();
  }, [testBackendConnection]);

  // Load daily data from Cloud (if logged in) or LocalStorage
  const loadDayData = useCallback(
    async (dateStr: string) => {
      const base = apiBaseUrl.replace(/\/+$/, '');
      if (authToken) {
        try {
          const resp = await fetch(
            `${base}/api/usuario/dados-completos?data=${encodeURIComponent(dateStr)}`,
            {
              headers: { Authorization: authToken },
            }
          );
          if (resp.ok) {
            const data = (await resp.json()) as {
              metas?: Partial<MetabolicGoals>;
              agua?: number;
              diario?: Record<string, DiaryEntry[]>;
            };
            if (data.metas) {
              const mergedMetas = { ...DEFAULT_METAS, ...data.metas };
              setMetas(mergedMetas);
              localStorage.setItem('macrofit_metas', JSON.stringify(mergedMetas));
            }
            const cloudAgua = Number(data.agua) || 0;
            const cloudDiario = data.diario || {};
            setAguaAtual(cloudAgua);
            setDiario(cloudDiario);
            localStorage.setItem(`macrofit_agua_${dateStr}`, String(cloudAgua));
            localStorage.setItem(`macrofit_diario_${dateStr}`, JSON.stringify(cloudDiario));

            // Ensure any categories returned from cloud diary exist in category list
            const cloudCats = Object.keys(cloudDiario);
            if (cloudCats.length > 0) {
              setCategories((prev) => {
                const missing = cloudCats.filter((c) => !prev.includes(c));
                if (missing.length === 0) return prev;
                const updated = [...prev, ...missing];
                localStorage.setItem('macrofit_categorias', JSON.stringify(updated));
                return updated;
              });
            }
            return;
          }
        } catch {
          // Fallback to localStorage if offline
        }
      }

      // LocalStorage fallback (with deterministic initial seed for today if brand new)
      try {
        const savedDiario = localStorage.getItem(`macrofit_diario_${dateStr}`);
        const savedAgua = localStorage.getItem(`macrofit_agua_${dateStr}`);

        if (savedDiario) {
          setDiario(JSON.parse(savedDiario));
        } else if (dateStr === getTodayISO() && !localStorage.getItem('macrofit_seeded_v1')) {
          const initialSeed: Record<string, DiaryEntry[]> = {
            'Café da Manhã': [
              {
                id: 101,
                categoria: 'Café da Manhã',
                nome: 'Ovo de Galinha Inteiro Cozido',
                marca: 'Ovos / TACO',
                quantidade: 2,
                unidadeDesc: '2 unid. (100g)',
                calorias: 146,
                proteinas: 13.3,
                carboidratos: 0.6,
                gorduras: 9.5,
              },
              {
                id: 102,
                categoria: 'Café da Manhã',
                nome: 'Aveia em Flocos Finos',
                marca: 'Quaker / TACO',
                quantidade: 40,
                unidadeDesc: '40g',
                calorias: 158,
                proteinas: 5.6,
                carboidratos: 26.6,
                gorduras: 3.4,
              },
            ],
            Almoço: [
              {
                id: 103,
                categoria: 'Almoço',
                nome: 'Peito de Frango Grelhado',
                marca: 'Aves / TACO',
                quantidade: 150,
                unidadeDesc: '150g',
                calorias: 239,
                proteinas: 48.0,
                carboidratos: 0.0,
                gorduras: 3.8,
              },
              {
                id: 104,
                categoria: 'Almoço',
                nome: 'Arroz Branco Cozido',
                marca: 'Cereais / TACO',
                quantidade: 120,
                unidadeDesc: '120g',
                calorias: 154,
                proteinas: 3.0,
                carboidratos: 33.7,
                gorduras: 0.2,
              },
            ],
          };
          localStorage.setItem('macrofit_seeded_v1', 'true');
          localStorage.setItem(`macrofit_diario_${dateStr}`, JSON.stringify(initialSeed));
          localStorage.setItem(`macrofit_agua_${dateStr}`, '750');
          setDiario(initialSeed);
          setAguaAtual(750);
          return;
        } else {
          setDiario({});
        }

        setAguaAtual(savedAgua ? parseFloat(savedAgua) || 0 : 0);
      } catch {
        setDiario({});
        setAguaAtual(0);
      }
    },
    [apiBaseUrl, authToken]
  );

  useEffect(() => {
    loadDayData(currentDate);
  }, [currentDate, loadDayData]);

  // Date navigation
  const changeDay = (delta: number) => {
    const [y, m, d] = currentDate.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + delta);
    const ny = dt.getFullYear();
    const nm = String(dt.getMonth() + 1).padStart(2, '0');
    const nd = String(dt.getDate()).padStart(2, '0');
    setCurrentDate(`${ny}-${nm}-${nd}`);
  };

  // Water controls
  const updateWater = async (newAmount: number) => {
    const valid = Math.max(0, newAmount);
    setAguaAtual(valid);
    localStorage.setItem(`macrofit_agua_${currentDate}`, String(valid));

    if (authToken) {
      const base = apiBaseUrl.replace(/\/+$/, '');
      try {
        await fetch(`${base}/api/usuario/agua`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authToken,
          },
          body: JSON.stringify({ data: currentDate, quantidade: valid }),
        });
      } catch {
        // Keep local water
      }
    }
  };

  // Add Diary Entry
  const handleAddDiaryEntry = async (entry: Omit<DiaryEntry, 'id'>) => {
    const tempId = Date.now();
    const newEntry: DiaryEntry = { ...entry, id: tempId };

    setDiario((prev) => {
      const list = prev[entry.categoria] ? [...prev[entry.categoria]] : [];
      list.push(newEntry);
      const updated = { ...prev, [entry.categoria]: list };
      localStorage.setItem(`macrofit_diario_${currentDate}`, JSON.stringify(updated));
      return updated;
    });

    if (authToken) {
      const base = apiBaseUrl.replace(/\/+$/, '');
      try {
        const resp = await fetch(`${base}/api/usuario/refeicao`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authToken,
          },
          body: JSON.stringify({
            data: currentDate,
            categoria: entry.categoria,
            nome: entry.nome,
            marca: entry.marca,
            quantidade: entry.quantidade,
            unidade_desc: entry.unidadeDesc,
            calorias: entry.calorias,
            proteinas: entry.proteinas,
            carboidratos: entry.carboidratos,
            gorduras: entry.gorduras,
          }),
        });
        if (resp.ok) {
          const data = (await resp.json()) as { id?: number };
          if (data.id) {
            setDiario((prev) => {
              const catItems = (prev[entry.categoria] || []).map((item) =>
                item.id === tempId ? { ...item, id: data.id! } : item
              );
              const updated = { ...prev, [entry.categoria]: catItems };
              localStorage.setItem(`macrofit_diario_${currentDate}`, JSON.stringify(updated));
              return updated;
            });
          }
        }
      } catch {
        // Saved locally
      }
    }
  };

  // Remove Diary Entry
  const handleRemoveDiaryEntry = async (categoria: string, itemId: number | string) => {
    setDiario((prev) => {
      const filtered = (prev[categoria] || []).filter((item) => String(item.id) !== String(itemId));
      const updated = { ...prev, [categoria]: filtered };
      localStorage.setItem(`macrofit_diario_${currentDate}`, JSON.stringify(updated));
      return updated;
    });

    if (authToken) {
      const base = apiBaseUrl.replace(/\/+$/, '');
      try {
        await fetch(`${base}/api/usuario/refeicao/${encodeURIComponent(String(itemId))}`, {
          method: 'DELETE',
          headers: { Authorization: authToken },
        });
      } catch {
        // Removed locally
      }
    }
  };

  // Save Custom Food
  const handleSaveCustomFood = async (food: FoodItem) => {
    setCustomFoods((prev) => {
      const updated = [food, ...prev];
      localStorage.setItem('macrofit_custom_foods', JSON.stringify(updated));
      return updated;
    });

    const base = apiBaseUrl.replace(/\/+$/, '');
    try {
      await fetch(`${base}/api/alimentos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(food),
      });
    } catch {
      // Saved locally
    }
  };

  // Save Metabolic Goals
  const handleSaveMetas = async (newMetas: MetabolicGoals) => {
    setMetas(newMetas);
    localStorage.setItem('macrofit_metas', JSON.stringify(newMetas));

    if (authToken) {
      const base = apiBaseUrl.replace(/\/+$/, '');
      try {
        await fetch(`${base}/api/usuario/metas`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authToken,
          },
          body: JSON.stringify(newMetas),
        });
      } catch {
        // Saved locally
      }
    }
  };

  // Add Custom Meal Category
  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    if (!categories.includes(trimmed)) {
      const updated = [...categories, trimmed];
      setCategories(updated);
      localStorage.setItem('macrofit_categorias', JSON.stringify(updated));
    }
    setNewCategoryName('');
    setIsCategoryModalOpen(false);
  };

  const handleRemoveCategory = (catName: string) => {
    if (categories.length <= 1) return;
    const updated = categories.filter((c) => c !== catName);
    setCategories(updated);
    localStorage.setItem('macrofit_categorias', JSON.stringify(updated));
  };

  const totais = useMemo(() => calcularTotaisDiarios(diario, metas), [diario, metas]);
  const waterPercent = metas.agua > 0 ? Math.min(100, Math.round((aguaAtual / metas.agua) * 100)) : 0;

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 pb-24 lg:pb-12">
      {/* Top Bar Contract: Zone 1 Brand | Zone 2 Nav Links | Zone 3 Primary Action */}
      <header className="sticky top-0 z-30 bg-[#090D16]/90 backdrop-blur-md border-b border-slate-800/90">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#diario"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('diario');
            }}
            className="text-lg sm:text-xl font-extrabold tracking-tight text-white whitespace-nowrap shrink-0 font-display"
          >
            MacroFit Pro
          </a>

          {/* Zone 2: Clean single-line text navigation links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
            <button
              type="button"
              onClick={() => setActiveTab('diario')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 cursor-pointer ${
                activeTab === 'diario' ? 'text-emerald-400 underline underline-offset-8 decoration-2' : ''
              }`}
            >
              Diário & Água
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('metas')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 cursor-pointer ${
                activeTab === 'metas' ? 'text-emerald-400 underline underline-offset-8 decoration-2' : ''
              }`}
            >
              Metas & TMB
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('catalogo')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 cursor-pointer ${
                activeTab === 'catalogo' ? 'text-emerald-400 underline underline-offset-8 decoration-2' : ''
              }`}
            >
              Tabela TACO
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('conta')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 cursor-pointer ${
                activeTab === 'conta' ? 'text-emerald-400 underline underline-offset-8 decoration-2' : ''
              }`}
            >
              {currentUser ? `Conta (@${currentUser})` : 'Sincronizar Nuvem'}
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="flex items-center gap-3 shrink-0">
            {!isInstalled ? (
              <button
                type="button"
                onClick={() => setIsInstallModalOpen(true)}
                className="min-h-[40px] px-4 py-2 text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 rounded-xl transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5" />
                Baixar APK Android
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setFoodModalCategory(categories[0] || 'Café da Manhã')}
                className="min-h-[40px] px-4 py-2 text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 rounded-xl transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                Registrar Alimento
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-6 space-y-6">
        {activeTab === 'diario' && (
          <>
            {/* Date Navigation & Hydration Control Bar */}
            <section className="bg-[#111827] border border-slate-800/90 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Calendar Navigator */}
              <div className="flex items-center justify-between sm:justify-start gap-2">
                <button
                  type="button"
                  onClick={() => changeDay(-1)}
                  aria-label="Dia anterior"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 min-h-[44px]">
                  <input
                    type="date"
                    aria-label="Selecionar data do diário"
                    value={currentDate}
                    onChange={(e) => e.target.value && setCurrentDate(e.target.value)}
                    className="bg-transparent text-slate-100 text-xs sm:text-sm font-semibold font-mono outline-none cursor-pointer"
                  />
                  <span className="text-xs text-slate-400 hidden sm:inline">
                    · {formatPortugueseDate(currentDate)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => changeDay(1)}
                  aria-label="Próximo dia"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {currentDate !== getTodayISO() && (
                  <button
                    type="button"
                    onClick={() => setCurrentDate(getTodayISO())}
                    className="min-h-[44px] px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Hoje
                  </button>
                )}
              </div>

              {/* Hydration Quick Tracker */}
              <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 bg-slate-950/80 border border-slate-800/90 px-3.5 py-2.5 rounded-xl">
                <div className="flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-cyan-400 shrink-0" />
                  <div className="font-mono text-xs sm:text-sm">
                    <strong className="text-cyan-400 font-bold">{aguaAtual}</strong>
                    <span className="text-slate-400"> / {metas.agua} ml</span>
                    <span className="text-slate-500 ml-1.5 text-xs">({waterPercent}%)</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => updateWater(aguaAtual + 250)}
                    className="min-h-[40px] px-3 py-1.5 bg-cyan-950/70 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/60 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer whitespace-nowrap"
                  >
                    +250ml
                  </button>
                  <button
                    type="button"
                    onClick={() => updateWater(aguaAtual + 500)}
                    className="min-h-[40px] px-3 py-1.5 bg-cyan-950/70 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/60 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer whitespace-nowrap"
                  >
                    +500ml
                  </button>
                  <button
                    type="button"
                    onClick={() => updateWater(0)}
                    aria-label="Zerar consumo de água"
                    title="Zerar consumo de água"
                    className="min-h-[40px] min-w-[40px] flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-800 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </section>

            {/* Daily Energy & Macronutrient Summary Grid */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Calories Card */}
              <div className="col-span-2 sm:col-span-1 bg-[#111827] border border-slate-800/90 rounded-2xl p-4 sm:p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400">Calorias Diárias</span>
                  <Flame className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex items-baseline gap-1.5 font-mono">
                  <span className="text-2xl sm:text-3xl font-extrabold text-white">
                    {totais.calorias}
                  </span>
                  <span className="text-xs text-slate-400">/ {metas.kcal} kcal</span>
                </div>
                <div className="mt-3 w-full bg-slate-800/90 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full transition-transform duration-200 origin-left"
                    style={{ transform: `scaleX(${totais.percentKcal / 100})` }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-400 font-mono">
                  {totais.saldoKcal >= 0
                    ? `Restam ${totais.saldoKcal} kcal`
                    : `Excedeu ${Math.abs(totais.saldoKcal)} kcal`}
                </p>
              </div>

              {/* Protein Card */}
              <div className="bg-[#111827] border border-slate-800/90 rounded-2xl p-4 sm:p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-rose-400">Proteínas</span>
                  <span className="text-xs font-mono text-slate-400">{totais.percentProt}%</span>
                </div>
                <div className="flex items-baseline gap-1 font-mono">
                  <span className="text-xl sm:text-2xl font-bold text-white">{totais.proteinas}</span>
                  <span className="text-xs text-slate-400">/ {metas.prot}g</span>
                </div>
                <div className="mt-3 w-full bg-slate-800/90 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-rose-500 h-full transition-transform duration-200 origin-left"
                    style={{ transform: `scaleX(${totais.percentProt / 100})` }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-400 font-mono">
                  Meta: {Math.max(0, Math.round(metas.prot - totais.proteinas))}g restantes
                </p>
              </div>

              {/* Carbs Card */}
              <div className="bg-[#111827] border border-slate-800/90 rounded-2xl p-4 sm:p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-amber-400">Carboidratos</span>
                  <span className="text-xs font-mono text-slate-400">{totais.percentCarb}%</span>
                </div>
                <div className="flex items-baseline gap-1 font-mono">
                  <span className="text-xl sm:text-2xl font-bold text-white">
                    {totais.carboidratos}
                  </span>
                  <span className="text-xs text-slate-400">/ {metas.carb}g</span>
                </div>
                <div className="mt-3 w-full bg-slate-800/90 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full transition-transform duration-200 origin-left"
                    style={{ transform: `scaleX(${totais.percentCarb / 100})` }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-400 font-mono">
                  Meta: {Math.max(0, Math.round(metas.carb - totais.carboidratos))}g restantes
                </p>
              </div>

              {/* Fat Card */}
              <div className="col-span-2 sm:col-span-1 bg-[#111827] border border-slate-800/90 rounded-2xl p-4 sm:p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-sky-400">Gorduras</span>
                  <span className="text-xs font-mono text-slate-400">{totais.percentFat}%</span>
                </div>
                <div className="flex items-baseline gap-1 font-mono">
                  <span className="text-xl sm:text-2xl font-bold text-white">{totais.gorduras}</span>
                  <span className="text-xs text-slate-400">/ {metas.fat}g</span>
                </div>
                <div className="mt-3 w-full bg-slate-800/90 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-sky-500 h-full transition-transform duration-200 origin-left"
                    style={{ transform: `scaleX(${totais.percentFat / 100})` }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-400 font-mono">
                  Meta: {Math.max(0, Math.round(metas.fat - totais.gorduras))}g restantes
                </p>
              </div>
            </section>

            {/* Meal Categories Section Header */}
            <div className="flex items-center justify-between gap-4 pt-1">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-emerald-400" />
                  Refeições do Dia
                </h2>
                <p className="text-xs text-slate-400">
                  Toque em "+ Adicionar Alimento" em qualquer refeição ou crie categorias personalizadas
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(true)}
                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/90 text-xs font-semibold text-emerald-400 transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap"
              >
                <FolderPlus className="w-4 h-4" />
                Nova Categoria
              </button>
            </div>

            {/* Meal Categories Grid (2 columns on desktop, 1 on mobile) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {categories.map((categoria) => {
                const items = diario[categoria] || [];
                const catKcal = Math.round(
                  items.reduce((acc, i) => acc + (Number(i.calorias) || 0), 0)
                );
                const catProt = items
                  .reduce((acc, i) => acc + (Number(i.proteinas) || 0), 0)
                  .toFixed(1);
                const catCarb = items
                  .reduce((acc, i) => acc + (Number(i.carboidratos) || 0), 0)
                  .toFixed(1);
                const catFat = items
                  .reduce((acc, i) => acc + (Number(i.gorduras) || 0), 0)
                  .toFixed(1);

                return (
                  <div
                    key={categoria}
                    className="bg-[#111827] border border-slate-800/90 rounded-2xl p-4 sm:p-5 flex flex-col justify-between"
                  >
                    <div>
                      {/* Category Header */}
                      <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800/80">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-white">{categoria}</h3>
                            {!DEFAULT_CATEGORIES.includes(categoria) && (
                              <button
                                type="button"
                                onClick={() => handleRemoveCategory(categoria)}
                                aria-label={`Remover categoria ${categoria}`}
                                className="text-slate-500 hover:text-rose-400 p-1 rounded cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 font-mono mt-0.5">
                            {catKcal} kcal · P: {catProt}g · C: {catCarb}g · G: {catFat}g
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setFoodModalCategory(categoria)}
                          className="min-h-[42px] px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 border border-emerald-500/30 text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                          Adicionar Alimento
                        </button>
                      </div>

                      {/* Logged Food Rows */}
                      {items.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-500">
                          Nenhum alimento registrado em {categoria}.
                        </div>
                      ) : (
                        <ul className="divide-y divide-slate-800/60 my-1">
                          {items.map((item) => (
                            <li
                              key={item.id}
                              className="py-2.5 flex items-center justify-between gap-3"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-xs sm:text-sm font-semibold text-slate-100 truncate">
                                  {item.nome}
                                </p>
                                <p className="text-[11px] text-slate-400 font-mono truncate">
                                  {item.unidadeDesc} · {item.marca} · P:{item.proteinas}g · C:
                                  {item.carboidratos}g · G:{item.gorduras}g
                                </p>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs sm:text-sm font-mono font-bold text-emerald-400">
                                  {Math.round(item.calorias)} kcal
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDiaryEntry(categoria, item.id)}
                                  aria-label={`Remover ${item.nome} de ${categoria}`}
                                  className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {activeTab === 'metas' && (
          <MetabolicGoalsView metas={metas} onSaveMetas={handleSaveMetas} />
        )}

        {activeTab === 'catalogo' && (
          <TacoCatalogView
            customFoods={customFoods}
            onSaveCustomFood={handleSaveCustomFood}
            onQuickAddToMeal={(food) => {
              setActiveTab('diario');
              setFoodModalCategory(categories[0] || 'Café da Manhã');
              // Custom foods remain searchable immediately in modal
              if (!customFoods.some((f) => f.nome === food.nome)) {
                setCustomFoods((prev) => [food, ...prev]);
              }
            }}
          />
        )}

        {activeTab === 'conta' && (
          <AccountCloudView
            currentUser={currentUser}
            authToken={authToken}
            apiBaseUrl={apiBaseUrl}
            serverStatus={serverStatus}
            onLoginSuccess={(user, token) => {
              setCurrentUser(user);
              setAuthToken(token);
              localStorage.setItem('macrofit_usuario', user);
              localStorage.setItem('macrofit_token', token);
            }}
            onLogout={() => {
              setCurrentUser(null);
              setAuthToken(null);
              localStorage.removeItem('macrofit_usuario');
              localStorage.removeItem('macrofit_token');
            }}
            onUpdateApiBaseUrl={(url) => {
              setApiBaseUrl(url);
              localStorage.setItem('macrofit_backend_url', url);
            }}
            onTestConnection={testBackendConnection}
            onOpenInstallModal={() => setIsInstallModalOpen(true)}
          />
        )}
      </main>

      {/* Fixed Bottom Navigation Tab Bar for Android Ergonomics */}
      <nav
        aria-label="Navegação principal mobile"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#090D16]/95 backdrop-blur-md border-t border-slate-800/90 grid grid-cols-4 items-center h-16 px-2"
      >
        <button
          type="button"
          onClick={() => setActiveTab('diario')}
          className={`min-h-[48px] flex flex-col items-center justify-center rounded-xl transition-colors cursor-pointer ${
            activeTab === 'diario' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Utensils className="w-5 h-5" />
          <span className="text-[10px] font-semibold tracking-tight mt-1">Diário</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('metas')}
          className={`min-h-[48px] flex flex-col items-center justify-center rounded-xl transition-colors cursor-pointer ${
            activeTab === 'metas' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calculator className="w-5 h-5" />
          <span className="text-[10px] font-semibold tracking-tight mt-1">Metas TMB</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('catalogo')}
          className={`min-h-[48px] flex flex-col items-center justify-center rounded-xl transition-colors cursor-pointer ${
            activeTab === 'catalogo' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Database className="w-5 h-5" />
          <span className="text-[10px] font-semibold tracking-tight mt-1">Base TACO</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('conta')}
          className={`min-h-[48px] flex flex-col items-center justify-center rounded-xl transition-colors cursor-pointer ${
            activeTab === 'conta' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserCheck className="w-5 h-5" />
          <span className="text-[10px] font-semibold tracking-tight mt-1">
            {currentUser ? `@${currentUser.slice(0, 7)}` : 'Nuvem'}
          </span>
        </button>
      </nav>

      {/* Food Search & Portion Calculator Modal */}
      <FoodSearchModal
        isOpen={Boolean(foodModalCategory)}
        targetCategory={foodModalCategory || 'Café da Manhã'}
        customFoods={customFoods}
        apiBaseUrl={apiBaseUrl.replace(/\/+$/, '')}
        onClose={() => setFoodModalCategory(null)}
        onAddDiaryEntry={handleAddDiaryEntry}
        onSaveCustomFood={handleSaveCustomFood}
      />

      {/* New Custom Meal Category Modal */}
      {isCategoryModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cat-modal-title"
        >
          <form
            onSubmit={handleCreateCategory}
            className="w-full max-w-sm rounded-2xl bg-[#111827] border border-slate-800 p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 id="cat-modal-title" className="text-sm font-bold text-white flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-emerald-400" />
                Nova Categoria de Refeição
              </h3>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                aria-label="Fechar modal de categoria"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label htmlFor="new-cat-input" className="block text-xs text-slate-400 mb-1.5">
                Nome da Refeição
              </label>
              <input
                id="new-cat-input"
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Ex: Pré-Treino, Pós-Treino, Ceia..."
                className="w-full min-h-[44px] bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white outline-none focus:border-emerald-500"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="min-h-[42px] px-5 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold cursor-pointer"
              >
                Criar Categoria
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Android & iOS PWA Installation Guide Modal */}
      <PWAInstallModal isOpen={isInstallModalOpen} onClose={() => setIsInstallModalOpen(false)} />
    </div>
  );
}
