import React, { useState, useEffect } from 'react';
import { Calculator, Save, Activity, Flame, Droplets, Scale, User } from 'lucide-react';
import { calcularMetasMetabolicas, type MetabolicGoals } from '../utils/nutrition.ts';

interface MetabolicGoalsViewProps {
  metas: MetabolicGoals;
  onSaveMetas: (newMetas: MetabolicGoals) => Promise<void>;
}

export const MetabolicGoalsView: React.FC<MetabolicGoalsViewProps> = ({ metas, onSaveMetas }) => {
  const [genero, setGenero] = useState<'m' | 'f'>(metas.genero || 'm');
  const [idade, setIdade] = useState<string>(String(metas.idade || 30));
  const [peso, setPeso] = useState<string>(String(metas.peso || 75));
  const [altura, setAltura] = useState<string>(String(metas.altura || 175));
  const [atividade, setAtividade] = useState<string>(String(metas.atividade || 1.55));
  const [objetivo, setObjetivo] = useState<string>(String(metas.objetivo ?? 0));

  const [manualOverride, setManualOverride] = useState(false);
  const [customKcal, setCustomKcal] = useState<string>(String(metas.kcal));
  const [customProt, setCustomProt] = useState<string>(String(metas.prot));
  const [customCarb, setCustomCarb] = useState<string>(String(metas.carb));
  const [customFat, setCustomFat] = useState<string>(String(metas.fat));
  const [customAgua, setCustomAgua] = useState<string>(String(metas.agua));

  const [savedNotice, setSavedNotice] = useState(false);

  // Sync state when metas load from cloud
  useEffect(() => {
    setGenero(metas.genero || 'm');
    setIdade(String(metas.idade || 30));
    setPeso(String(metas.peso || 75));
    setAltura(String(metas.altura || 175));
    setAtividade(String(metas.atividade || 1.55));
    setObjetivo(String(metas.objetivo ?? 0));
    setCustomKcal(String(metas.kcal));
    setCustomProt(String(metas.prot));
    setCustomCarb(String(metas.carb));
    setCustomFat(String(metas.fat));
    setCustomAgua(String(metas.agua));
  }, [metas]);

  const previewCalculated = calcularMetasMetabolicas({
    genero,
    idade: parseFloat(idade) || 30,
    peso: parseFloat(peso) || 75,
    altura: parseFloat(altura) || 175,
    atividade: parseFloat(atividade) || 1.55,
    objetivo: parseFloat(objetivo) || 0,
  });

  const handleApplyAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalMetas: MetabolicGoals = manualOverride
      ? {
          ...previewCalculated,
          kcal: Math.max(800, Math.round(parseFloat(customKcal) || previewCalculated.kcal)),
          prot: Math.max(20, Math.round(parseFloat(customProt) || previewCalculated.prot)),
          carb: Math.max(20, Math.round(parseFloat(customCarb) || previewCalculated.carb)),
          fat: Math.max(15, Math.round(parseFloat(customFat) || previewCalculated.fat)),
          agua: Math.max(500, Math.round(parseFloat(customAgua) || previewCalculated.agua)),
        }
      : previewCalculated;

    await onSaveMetas(finalMetas);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#111827] border border-slate-800/90 rounded-2xl p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Calculator className="w-5 h-5 text-emerald-400" />
              Calculadora Metabólica (Mifflin-St Jeor)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Estime sua Taxa Metabólica Basal (TMB), Gasto Energético Total (GET) e divisão ideal de macros
            </p>
          </div>
        </div>

        <form onSubmit={handleApplyAndSave} className="space-y-5">
          {/* Biometric Inputs */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label htmlFor="prof-genero" className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" /> Sexo Biológico
              </label>
              <select
                id="prof-genero"
                value={genero}
                onChange={(e) => setGenero(e.target.value as 'm' | 'f')}
                className="w-full min-h-[44px] bg-slate-950 border border-slate-700/90 rounded-xl px-3 py-2 text-xs sm:text-sm text-white outline-none focus:border-emerald-500"
              >
                <option value="m">Masculino</option>
                <option value="f">Feminino</option>
              </select>
            </div>

            <div>
              <label htmlFor="prof-idade" className="block text-xs font-medium text-slate-300 mb-1.5">
                Idade (anos)
              </label>
              <input
                id="prof-idade"
                type="number"
                min="12"
                max="110"
                value={idade}
                onChange={(e) => setIdade(e.target.value)}
                className="w-full min-h-[44px] bg-slate-950 border border-slate-700/90 rounded-xl px-3 py-2 text-xs sm:text-sm text-white font-mono outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label htmlFor="prof-peso" className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-slate-400" /> Peso (kg)
              </label>
              <input
                id="prof-peso"
                type="number"
                step="0.1"
                min="30"
                max="300"
                value={peso}
                onChange={(e) => setPeso(e.target.value)}
                className="w-full min-h-[44px] bg-slate-950 border border-slate-700/90 rounded-xl px-3 py-2 text-xs sm:text-sm text-white font-mono outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label htmlFor="prof-altura" className="block text-xs font-medium text-slate-300 mb-1.5">
                Altura (cm)
              </label>
              <input
                id="prof-altura"
                type="number"
                min="100"
                max="250"
                value={altura}
                onChange={(e) => setAltura(e.target.value)}
                className="w-full min-h-[44px] bg-slate-950 border border-slate-700/90 rounded-xl px-3 py-2 text-xs sm:text-sm text-white font-mono outline-none focus:border-emerald-500"
              />
            </div>

            <div className="col-span-2 lg:col-span-1">
              <label htmlFor="prof-atividade" className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-slate-400" /> Nível de Atividade Física
              </label>
              <select
                id="prof-atividade"
                value={atividade}
                onChange={(e) => setAtividade(e.target.value)}
                className="w-full min-h-[44px] bg-slate-950 border border-slate-700/90 rounded-xl px-3 py-2 text-xs sm:text-sm text-white outline-none focus:border-emerald-500"
              >
                <option value="1.2">Sedentário (Pouco exercício)</option>
                <option value="1.375">Leve (1 a 3 dias/semana)</option>
                <option value="1.55">Moderado (3 a 5 dias/semana)</option>
                <option value="1.725">Intenso (6 a 7 dias/semana)</option>
                <option value="1.9">Atleta / Muito Pesado (2x/dia)</option>
              </select>
            </div>

            <div className="col-span-2 lg:col-span-1">
              <label htmlFor="prof-objetivo" className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-emerald-400" /> Objetivo Nutricional
              </label>
              <select
                id="prof-objetivo"
                value={objetivo}
                onChange={(e) => setObjetivo(e.target.value)}
                className="w-full min-h-[44px] bg-slate-950 border border-slate-700/90 rounded-xl px-3 py-2 text-xs sm:text-sm text-white outline-none focus:border-emerald-500"
              >
                <option value="-500">Cutting Agressivo (-500 kcal)</option>
                <option value="-400">Emagrecimento / Cutting (-400 kcal)</option>
                <option value="0">Manutenção de Peso (GET exato)</option>
                <option value="350">Ganho de Massa Limpo (+350 kcal)</option>
                <option value="500">Superávit Calórico (+500 kcal)</option>
              </select>
            </div>
          </div>

          {/* Calculated Metabolic Summary Strip */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <span className="text-xs font-semibold text-slate-300">
                Estimativa Automática (2.0g/kg Proteína · 0.8g/kg Gordura · 35ml/kg Água)
              </span>
              <span className="text-xs font-mono text-slate-400">
                TMB: <strong className="text-white">{previewCalculated.tmb} kcal</strong> · GET: <strong className="text-white">{previewCalculated.get} kcal</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono">
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/80">
                <span className="block text-[11px] font-sans text-slate-400">Meta Diária</span>
                <span className="text-lg font-bold text-emerald-400">{previewCalculated.kcal}</span>
                <span className="text-xs text-slate-500 ml-1">kcal</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/80">
                <span className="block text-[11px] font-sans text-slate-400">Proteínas</span>
                <span className="text-lg font-bold text-rose-400">{previewCalculated.prot}</span>
                <span className="text-xs text-slate-500 ml-1">g</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/80">
                <span className="block text-[11px] font-sans text-slate-400">Carboidratos</span>
                <span className="text-lg font-bold text-amber-400">{previewCalculated.carb}</span>
                <span className="text-xs text-slate-500 ml-1">g</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/80">
                <span className="block text-[11px] font-sans text-slate-400">Gorduras</span>
                <span className="text-lg font-bold text-sky-400">{previewCalculated.fat}</span>
                <span className="text-xs text-slate-500 ml-1">g</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/80 col-span-2 sm:col-span-1">
                <span className="block text-[11px] font-sans text-slate-400 flex items-center gap-1">
                  <Droplets className="w-3 h-3 text-cyan-400" /> Hidratação
                </span>
                <span className="text-lg font-bold text-cyan-400">{previewCalculated.agua}</span>
                <span className="text-xs text-slate-500 ml-1">ml</span>
              </div>
            </div>
          </div>

          {/* Optional Manual Target Adjustment */}
          <div className="pt-1">
            <label className="inline-flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={manualOverride}
                onChange={(e) => {
                  setManualOverride(e.target.checked);
                  if (e.target.checked) {
                    setCustomKcal(String(previewCalculated.kcal));
                    setCustomProt(String(previewCalculated.prot));
                    setCustomCarb(String(previewCalculated.carb));
                    setCustomFat(String(previewCalculated.fat));
                    setCustomAgua(String(previewCalculated.agua));
                  }
                }}
                className="w-4 h-4 rounded accent-emerald-500"
              />
              Ajustar gramas de macronutrientes ou calorias manualmente
            </label>

            {manualOverride && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <div>
                  <label htmlFor="cust-kcal" className="block text-[11px] text-slate-400 mb-1">
                    Calorias (kcal)
                  </label>
                  <input
                    id="cust-kcal"
                    type="number"
                    value={customKcal}
                    onChange={(e) => setCustomKcal(e.target.value)}
                    className="w-full min-h-[40px] bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="cust-prot" className="block text-[11px] text-slate-400 mb-1">
                    Proteínas (g)
                  </label>
                  <input
                    id="cust-prot"
                    type="number"
                    value={customProt}
                    onChange={(e) => setCustomProt(e.target.value)}
                    className="w-full min-h-[40px] bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="cust-carb" className="block text-[11px] text-slate-400 mb-1">
                    Carboidratos (g)
                  </label>
                  <input
                    id="cust-carb"
                    type="number"
                    value={customCarb}
                    onChange={(e) => setCustomCarb(e.target.value)}
                    className="w-full min-h-[40px] bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="cust-fat" className="block text-[11px] text-slate-400 mb-1">
                    Gorduras (g)
                  </label>
                  <input
                    id="cust-fat"
                    type="number"
                    value={customFat}
                    onChange={(e) => setCustomFat(e.target.value)}
                    className="w-full min-h-[40px] bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white font-mono"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label htmlFor="cust-agua" className="block text-[11px] text-slate-400 mb-1">
                    Água (ml)
                  </label>
                  <input
                    id="cust-agua"
                    type="number"
                    value={customAgua}
                    onChange={(e) => setCustomAgua(e.target.value)}
                    className="w-full min-h-[40px] bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            {savedNotice ? (
              <span className="text-xs font-semibold text-emerald-400">
                Metas metabólicas atualizadas e sincronizadas!
              </span>
            ) : (
              <span className="text-xs text-slate-400">
                As metas são salvas no dispositivo e na sua conta da nuvem.
              </span>
            )}

            <button
              type="submit"
              className="min-h-[48px] px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Recalcular & Salvar Metas
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
