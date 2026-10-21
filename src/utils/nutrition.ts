import type { FoodItem } from '../data/tacoDatabase.ts';

export interface MetabolicProfile {
  genero: 'm' | 'f';
  idade: number;
  peso: number;
  altura: number;
  atividade: number; // 1.2, 1.375, 1.55, 1.725, 1.9
  objetivo: number; // -400 (cutting), 0 (manutenção), +350 (bulking)
}

export interface MetabolicGoals {
  kcal: number;
  prot: number;
  carb: number;
  fat: number;
  agua: number;
  tmb: number;
  get: number;
  genero: 'm' | 'f';
  idade: number;
  peso: number;
  altura: number;
  atividade: number;
  objetivo: number;
}

export interface DiaryEntry {
  id: number | string;
  categoria: string;
  nome: string;
  marca: string;
  quantidade: number;
  unidadeDesc: string;
  calorias: number;
  proteinas: number;
  carboidratos: number;
  gorduras: number;
}

export interface DailyTotals {
  calorias: number;
  proteinas: number;
  carboidratos: number;
  gorduras: number;
  saldoKcal: number;
  percentKcal: number;
  percentProt: number;
  percentCarb: number;
  percentFat: number;
}

export const PORTION_UNITS: { label: string; gramsPerUnit: number; shortUnit: string }[] = [
  { label: 'Gramas (g)', gramsPerUnit: 1, shortUnit: 'g' },
  { label: 'Mililitros (ml)', gramsPerUnit: 1, shortUnit: 'ml' },
  { label: 'Colher de sopa (~15g)', gramsPerUnit: 15, shortUnit: 'col. sopa' },
  { label: 'Colher de chá (~5g)', gramsPerUnit: 5, shortUnit: 'col. chá' },
  { label: 'Scoop / Dosador (~30g)', gramsPerUnit: 30, shortUnit: 'scoop' },
  { label: 'Unidade média (~50g)', gramsPerUnit: 50, shortUnit: 'unid.' },
  { label: 'Fatia média (~30g)', gramsPerUnit: 30, shortUnit: 'fatia' },
  { label: 'Xícara / Copo (~200ml)', gramsPerUnit: 200, shortUnit: 'xíc.' },
  { label: 'Porção de 100g', gramsPerUnit: 100, shortUnit: 'porção 100g' },
];

/**
 * Remove accents and normalize string for accent-insensitive search.
 */
export function removerAcentos(texto: string): string {
  if (!texto) return '';
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Search food items across an array of foods with multi-word accent-insensitive matching.
 */
export function filterFoodsByQuery(foods: FoodItem[], query: string): FoodItem[] {
  const cleanQuery = removerAcentos(query);
  if (cleanQuery.length < 2) return [];
  const words = cleanQuery.split(/\s+/).filter(Boolean);

  return foods.filter((item) => {
    const cleanName = removerAcentos(item.nome);
    const cleanBrand = removerAcentos(item.marca || '');
    return words.every((w) => cleanName.includes(w) || cleanBrand.includes(w));
  });
}

/**
 * Calculate TMB (Mifflin-St Jeor), GET, and recommended daily macros + hydration.
 */
export function calcularMetasMetabolicas(profile: MetabolicProfile): MetabolicGoals {
  const peso = Math.max(20, Number(profile.peso) || 75);
  const altura = Math.max(100, Number(profile.altura) || 175);
  const idade = Math.max(10, Number(profile.idade) || 30);
  const atividade = Number(profile.atividade) || 1.55;
  const objetivo = Number(profile.objetivo) || 0;
  const genero = profile.genero === 'f' ? 'f' : 'm';

  let tmb = 10 * peso + 6.25 * altura - 5 * idade;
  tmb += genero === 'm' ? 5 : -161;

  const get = tmb * atividade;
  const kcal = Math.max(1000, Math.round(get + objetivo));
  const prot = Math.round(peso * 2.0);
  const fat = Math.round(peso * 0.8);
  const carb = Math.max(50, Math.round((kcal - prot * 4 - fat * 9) / 4));
  const agua = Math.round(peso * 35);

  return {
    kcal,
    prot,
    carb,
    fat,
    agua,
    tmb: Math.round(tmb),
    get: Math.round(get),
    genero,
    idade,
    peso,
    altura,
    atividade,
    objetivo,
  };
}

/**
 * Calculate proportional macros for a given food item, quantity, and unit multiplier.
 */
export function calcularPorcaoAlimento(
  alimento: Pick<FoodItem, 'calorias' | 'proteinas' | 'carboidratos' | 'gorduras'>,
  quantidade: number,
  gramsPerUnit: number
): { calorias: number; proteinas: number; carboidratos: number; gorduras: number; gramasTotais: number } {
  const qtdValida = Math.max(0, Number(quantidade) || 0);
  const multValido = Math.max(0.1, Number(gramsPerUnit) || 1);
  const gramasTotais = qtdValida * multValido;
  const fator = gramasTotais / 100.0;

  return {
    calorias: Math.round(alimento.calorias * fator),
    proteinas: Number((alimento.proteinas * fator).toFixed(1)),
    carboidratos: Number((alimento.carboidratos * fator).toFixed(1)),
    gorduras: Number((alimento.gorduras * fator).toFixed(1)),
    gramasTotais: Math.round(gramasTotais * 10) / 10,
  };
}

/**
 * Parse a FatSecret food_description string into per-100g macros.
 * Typical format: "Por 100g - Calorias: 150kcal | Gord: 2.5g | Carb: 20g | Prot: 10g"
 * or "Per 100g - Calories: 150kcal | Fat: 2.5g | Carbs: 20g | Protein: 10g"
 */
export function parseFatSecretDescription(desc: string): {
  calorias: number;
  proteinas: number;
  carboidratos: number;
  gorduras: number;
} {
  if (!desc) return { calorias: 0, proteinas: 0, carboidratos: 0, gorduras: 0 };

  let kcal = 0;
  let prot = 0;
  let carb = 0;
  let fat = 0;

  const extractNumber = (raw: string): number => {
    const cleaned = raw.replace(',', '.');
    const match = cleaned.match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
  };

  const parts = desc.split('-').slice(1).join('-').split('|');
  for (const part of parts) {
    const lower = part.toLowerCase();
    if (lower.includes('calorias:') || lower.includes('calories:')) {
      kcal = extractNumber(lower.split(':')[1] || '');
    } else if (lower.includes('gord:') || lower.includes('fat:')) {
      fat = extractNumber(lower.split(':')[1] || '');
    } else if (lower.includes('carb:') || lower.includes('carbs:')) {
      carb = extractNumber(lower.split(':')[1] || '');
    } else if (lower.includes('prot:') || lower.includes('protein:')) {
      prot = extractNumber(lower.split(':')[1] || '');
    }
  }

  return {
    calorias: Math.round(kcal * 10) / 10,
    proteinas: Math.round(prot * 10) / 10,
    carboidratos: Math.round(carb * 10) / 10,
    gorduras: Math.round(fat * 10) / 10,
  };
}

/**
 * Calculate aggregated daily totals across all meal categories against goals.
 */
export function calcularTotaisDiarios(
  diario: Record<string, DiaryEntry[]>,
  metas: Pick<MetabolicGoals, 'kcal' | 'prot' | 'carb' | 'fat'>
): DailyTotals {
  let calorias = 0;
  let proteinas = 0;
  let carboidratos = 0;
  let gorduras = 0;

  for (const items of Object.values(diario)) {
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      if (item.nome === '__CAT_DEF__') continue;
      calorias += Number(item.calorias) || 0;
      proteinas += Number(item.proteinas) || 0;
      carboidratos += Number(item.carboidratos) || 0;
      gorduras += Number(item.gorduras) || 0;
    }
  }

  calorias = Math.round(calorias);
  proteinas = Number(proteinas.toFixed(1));
  carboidratos = Number(carboidratos.toFixed(1));
  gorduras = Number(gorduras.toFixed(1));

  const saldoKcal = metas.kcal - calorias;

  const calcPercent = (val: number, goal: number) =>
    goal > 0 ? Math.min(100, Math.round((val / goal) * 100)) : 0;

  return {
    calorias,
    proteinas,
    carboidratos,
    gorduras,
    saldoKcal,
    percentKcal: calcPercent(calorias, metas.kcal),
    percentProt: calcPercent(proteinas, metas.prot),
    percentCarb: calcPercent(carboidratos, metas.carb),
    percentFat: calcPercent(gorduras, metas.fat),
  };
}

/**
 * Clean and validate an EAN-8 / UPC-A / EAN-13 / GTIN-14 barcode string.
 */
export function normalizeBarcode(raw: string): string {
  return String(raw || '').replace(/\D+/g, '').trim();
}

/**
 * Parse an OpenFoodFacts API v0/v2 product payload into a normalized FoodItem (per 100g).
 */
export function parseOpenFoodFactsProduct(
  payload: unknown,
  barcode: string
): FoodItem | null {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as {
    status?: number | string;
    product?: {
      product_name_pt?: string;
      product_name?: string;
      generic_name_pt?: string;
      brands?: string;
      nutriments?: Record<string, unknown>;
    };
  };

  if (record.status === 0 || record.status === 'status_not_found' || !record.product) {
    return null;
  }

  const p = record.product;
  const nome = String(
    p.product_name_pt || p.product_name || p.generic_name_pt || ''
  ).trim();
  if (!nome) return null;

  const marcaRaw = String(p.brands || 'Comercial').split(',')[0]?.trim() || 'Comercial';
  const nutri = p.nutriments || {};

  const num = (v: unknown): number => {
    const parsed = Number(v);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  };

  let kcal =
    num(nutri['energy-kcal_100g']) ||
    num(nutri['energy-kcal_value']) ||
    num(nutri['energy-kcal']) ||
    0;

  if (kcal === 0 && num(nutri['energy-kj_100g']) > 0) {
    kcal = num(nutri['energy-kj_100g']) / 4.184;
  }

  const prot =
    num(nutri['proteins_100g']) ||
    num(nutri['proteins_value']) ||
    num(nutri['proteins']) ||
    0;
  const carb =
    num(nutri['carbohydrates_100g']) ||
    num(nutri['carbohydrates_value']) ||
    num(nutri['carbohydrates']) ||
    0;
  const fat =
    num(nutri['fat_100g']) ||
    num(nutri['fat_value']) ||
    num(nutri['fat']) ||
    0;

  return {
    nome,
    marca: marcaRaw,
    calorias: Math.round(kcal * 10) / 10,
    proteinas: Math.round(prot * 10) / 10,
    carboidratos: Math.round(carb * 10) / 10,
    gorduras: Math.round(fat * 10) / 10,
    fonte: 'BARCODE',
    codigoBarras: normalizeBarcode(barcode),
  };
}

export interface WeeklyDayPoint {
  dateISO: string;
  shortLabel: string;
  weekdayShort: string;
  dayMonth: string;
  calorias: number;
  proteinas: number;
  carboidratos: number;
  gorduras: number;
  metaKcal: number;
  metaProt: number;
  metaCarb: number;
  metaFat: number;
  atingiuMetaKcal: boolean;
  isCurrentDate: boolean;
}

export interface WeeklyProgressSummary {
  dias: WeeklyDayPoint[];
  mediaCalorias: number;
  mediaProteinas: number;
  mediaCarboidratos: number;
  mediaGorduras: number;
  diasRegistrados: number;
  diasNaMeta: number;
  consistenciaPercent: number;
}

const WEEKDAY_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/**
 * Return an array of 7 ISO date strings (YYYY-MM-DD) ending on referenceDateISO (inclusive),
 * ordered chronologically from oldest (D-6) to referenceDateISO (D).
 */
export function getUltimos7DiasISO(referenceDateISO: string): string[] {
  const [y, m, d] = referenceDateISO.split('-').map(Number);
  const baseDate = new Date(y || 2026, (m || 1) - 1, d || 1);
  const dates: string[] = [];

  for (let offset = 6; offset >= 0; offset--) {
    const dt = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() - offset);
    const yr = dt.getFullYear();
    const mo = String(dt.getMonth() + 1).padStart(2, '0');
    const da = String(dt.getDate()).padStart(2, '0');
    dates.push(`${yr}-${mo}-${da}`);
  }

  return dates;
}

/**
 * Compute 7-day caloric and macronutrient progress and diet consistency metrics.
 */
export function calcularProgressoSemanal(
  referenceDateISO: string,
  diariosPorData: Record<string, Record<string, DiaryEntry[]>>,
  metas: Pick<MetabolicGoals, 'kcal' | 'prot' | 'carb' | 'fat'>,
  selectedDateISO: string = referenceDateISO
): WeeklyProgressSummary {
  const dates = getUltimos7DiasISO(referenceDateISO);

  const dias: WeeklyDayPoint[] = dates.map((dateISO) => {
    const [y, m, d] = dateISO.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const weekdayShort = WEEKDAY_PT[dt.getDay()] || '';
    const dayMonth = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
    const diarioDia = diariosPorData[dateISO] || {};
    const totais = calcularTotaisDiarios(diarioDia, metas);

    const lowerBound = metas.kcal * 0.85;
    const upperBound = metas.kcal * 1.15;
    const atingiuMetaKcal =
      totais.calorias > 0 && totais.calorias >= lowerBound && totais.calorias <= upperBound;

    return {
      dateISO,
      shortLabel: `${weekdayShort} ${String(d).padStart(2, '0')}`,
      weekdayShort,
      dayMonth,
      calorias: totais.calorias,
      proteinas: totais.proteinas,
      carboidratos: totais.carboidratos,
      gorduras: totais.gorduras,
      metaKcal: metas.kcal,
      metaProt: metas.prot,
      metaCarb: metas.carb,
      metaFat: metas.fat,
      atingiuMetaKcal,
      isCurrentDate: dateISO === selectedDateISO,
    };
  });

  const diasComRegistro = dias.filter((d) => d.calorias > 0);
  const diasRegistrados = diasComRegistro.length;
  const diasNaMeta = dias.filter((d) => d.atingiuMetaKcal).length;
  const divisor = diasRegistrados > 0 ? diasRegistrados : 1;

  const mediaCalorias =
    diasRegistrados > 0
      ? Math.round(diasComRegistro.reduce((acc, d) => acc + d.calorias, 0) / divisor)
      : 0;
  const mediaProteinas =
    diasRegistrados > 0
      ? Number((diasComRegistro.reduce((acc, d) => acc + d.proteinas, 0) / divisor).toFixed(1))
      : 0;
  const mediaCarboidratos =
    diasRegistrados > 0
      ? Number((diasComRegistro.reduce((acc, d) => acc + d.carboidratos, 0) / divisor).toFixed(1))
      : 0;
  const mediaGorduras =
    diasRegistrados > 0
      ? Number((diasComRegistro.reduce((acc, d) => acc + d.gorduras, 0) / divisor).toFixed(1))
      : 0;

  const consistenciaPercent = Math.round((diasRegistrados / 7) * 100);

  return {
    dias,
    mediaCalorias,
    mediaProteinas,
    mediaCarboidratos,
    mediaGorduras,
    diasRegistrados,
    diasNaMeta,
    consistenciaPercent,
  };
}


