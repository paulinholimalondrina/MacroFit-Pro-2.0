import React, { useState, useMemo } from 'react';
import { Search, Plus, Database, CheckCircle2 } from 'lucide-react';
import type { FoodItem } from '../data/tacoDatabase.ts';
import { BASE_TACO_EXPANDIDA } from '../data/tacoDatabase.ts';
import { filterFoodsByQuery } from '../utils/nutrition.ts';

interface TacoCatalogViewProps {
  customFoods: FoodItem[];
  onSaveCustomFood: (food: FoodItem) => Promise<void>;
  onQuickAddToMeal: (food: FoodItem) => void;
}

export const TacoCatalogView: React.FC<TacoCatalogViewProps> = ({
  customFoods,
  onSaveCustomFood,
  onQuickAddToMeal,
}) => {
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const [nome, setNome] = useState('');
  const [marca, setMarca] = useState('');
  const [kcal, setKcal] = useState('');
  const [prot, setProt] = useState('');
  const [carb, setCarb] = useState('');
  const [fat, setFat] = useState('');
  const [formMsg, setFormMsg] = useState('');

  const allFoods = useMemo(() => [...customFoods, ...BASE_TACO_EXPANDIDA], [customFoods]);

  const filteredFoods = useMemo(() => {
    if (search.trim().length < 2) return allFoods;
    return filterFoodsByQuery(allFoods, search);
  }, [allFoods, search]);

  const handleCreateFood = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || kcal === '') {
      setFormMsg('Preencha pelo menos o nome e as calorias por 100g.');
      return;
    }

    const novo: FoodItem = {
      nome: nome.trim(),
      marca: marca.trim() || 'Manual',
      calorias: Math.max(0, parseFloat(kcal) || 0),
      proteinas: Math.max(0, parseFloat(prot) || 0),
      carboidratos: Math.max(0, parseFloat(carb) || 0),
      gorduras: Math.max(0, parseFloat(fat) || 0),
      fonte: 'MANUAL',
    };

    await onSaveCustomFood(novo);
    setNome('');
    setMarca('');
    setKcal('');
    setProt('');
    setCarb('');
    setFat('');
    setShowAddForm(false);
    setFormMsg('Alimento adicionado ao catálogo com sucesso!');
    setTimeout(() => setFormMsg(''), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#111827] border border-slate-800/90 rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-400" />
              Catálogo Nutricional TACO & Marcas ({allFoods.length} itens)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Valores nutricionais padronizados por 100g/100ml · Funciona 100% offline no Android
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            {showAddForm ? 'Fechar Cadastro' : 'Cadastrar Alimento'}
          </button>
        </div>

        {formMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            {formMsg}
          </div>
        )}

        {showAddForm && (
          <form
            onSubmit={handleCreateFood}
            className="mb-6 p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-4"
          >
            <h3 className="text-sm font-bold text-white">Novo Alimento Personalizado (por 100g/100ml)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="cat-nome" className="block text-xs text-slate-400 mb-1">
                  Nome do Alimento *
                </label>
                <input
                  id="cat-nome"
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Crepioca de Frango"
                  className="w-full min-h-[44px] bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label htmlFor="cat-marca" className="block text-xs text-slate-400 mb-1">
                  Marca ou Categoria
                </label>
                <input
                  id="cat-marca"
                  type="text"
                  value={marca}
                  onChange={(e) => setMarca(e.target.value)}
                  placeholder="Ex: Receita Caseira, Growth, Nestlé..."
                  className="w-full min-h-[44px] bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label htmlFor="cat-kcal" className="block text-xs text-slate-400 mb-1">
                  Calorias (kcal) *
                </label>
                <input
                  id="cat-kcal"
                  type="number"
                  step="any"
                  value={kcal}
                  onChange={(e) => setKcal(e.target.value)}
                  placeholder="180"
                  className="w-full min-h-[44px] bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label htmlFor="cat-prot" className="block text-xs text-slate-400 mb-1">
                  Proteínas (g)
                </label>
                <input
                  id="cat-prot"
                  type="number"
                  step="any"
                  value={prot}
                  onChange={(e) => setProt(e.target.value)}
                  placeholder="15"
                  className="w-full min-h-[44px] bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label htmlFor="cat-carb" className="block text-xs text-slate-400 mb-1">
                  Carboidratos (g)
                </label>
                <input
                  id="cat-carb"
                  type="number"
                  step="any"
                  value={carb}
                  onChange={(e) => setCarb(e.target.value)}
                  placeholder="22"
                  className="w-full min-h-[44px] bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label htmlFor="cat-fat" className="block text-xs text-slate-400 mb-1">
                  Gorduras (g)
                </label>
                <input
                  id="cat-fat"
                  type="number"
                  step="any"
                  value={fat}
                  onChange={(e) => setFat(e.target.value)}
                  placeholder="4.5"
                  className="w-full min-h-[44px] bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="min-h-[42px] px-5 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold cursor-pointer"
              >
                Salvar no Catálogo
              </button>
            </div>
          </form>
        )}

        {/* Filter Bar */}
        <div className="relative mb-4">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Filtrar catálogo de alimentos"
            placeholder="Filtrar alimentos na tabela TACO ou marcas (ex: arroz, patinho, vigor, growth)..."
            className="w-full min-h-[46px] bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-emerald-500"
          />
        </div>

        {/* Food List Table / Cards */}
        <div className="divide-y divide-slate-800/80 border border-slate-800/80 rounded-xl overflow-hidden bg-slate-950/40 max-h-[520px] overflow-y-auto custom-scrollbar">
          {filteredFoods.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Nenhum alimento encontrado para "{search}". Use o botão "Cadastrar Alimento" acima para incluí-lo.
            </div>
          ) : (
            filteredFoods.map((food, i) => (
              <div
                key={`${food.nome}-${food.marca}-${i}`}
                className="p-3.5 sm:px-4 flex items-center justify-between gap-3 hover:bg-slate-900/70 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate">{food.nome}</p>
                  <p className="text-xs text-slate-400 truncate">
                    {food.marca} · Porção base 100g ·{' '}
                    <span className="font-mono text-slate-300">
                      P: {food.proteinas}g · C: {food.carboidratos}g · G: {food.gorduras}g
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right font-mono">
                    <span className="text-sm font-bold text-emerald-400 block">
                      {Math.round(food.calorias)} kcal
                    </span>
                    <span className="text-[10px] text-slate-500">por 100g</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onQuickAddToMeal(food)}
                    aria-label={`Usar ${food.nome} no diário`}
                    className="min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-emerald-500 text-slate-200 hover:text-slate-950 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                  >
                    + Diário
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
