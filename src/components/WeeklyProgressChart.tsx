import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import type { WeeklyDayPoint, WeeklyProgressSummary } from '../utils/nutrition.ts';

interface WeeklyProgressChartProps {
  summary: WeeklyProgressSummary;
  onSelectDate: (dateISO: string) => void;
}

type ChartMode = 'calorias' | 'macros';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: WeeklyDayPoint }>;
}

const CustomChartTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const day = payload[0].payload;
  const diffKcal = day.calorias - day.metaKcal;

  return (
    <div className="rounded-xl bg-slate-950/95 border border-slate-700/90 p-3 shadow-xl text-xs space-y-1.5 min-w-[195px]">
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-1.5">
        <span className="font-bold text-white">
          {day.weekdayShort}, {day.dayMonth}
        </span>
        <span className="font-mono text-[11px] text-slate-400">
          {day.isCurrentDate ? 'Dia selecionado' : day.dateISO}
        </span>
      </div>

      <div className="flex items-baseline justify-between font-mono tabular-nums pt-0.5">
        <span className="text-slate-300">Calorias:</span>
        <span className="font-bold text-emerald-400">
          {day.calorias} <span className="text-slate-500 font-normal">/ {day.metaKcal} kcal</span>
        </span>
      </div>

      {day.calorias > 0 && (
        <div className="text-[11px] font-mono tabular-nums text-slate-400">
          {diffKcal === 0
            ? 'Exatamente na meta'
            : diffKcal > 0
              ? `+${diffKcal} kcal acima da meta`
              : `${Math.abs(diffKcal)} kcal abaixo da meta`}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 pt-1.5 border-t border-slate-800/90 font-mono tabular-nums text-[11px]">
        <div>
          <span className="block text-rose-400 font-semibold">Prot</span>
          <span className="text-white font-bold">{day.proteinas}g</span>
          <span className="block text-[10px] text-slate-500">/{day.metaProt}g</span>
        </div>
        <div>
          <span className="block text-amber-400 font-semibold">Carb</span>
          <span className="text-white font-bold">{day.carboidratos}g</span>
          <span className="block text-[10px] text-slate-500">/{day.metaCarb}g</span>
        </div>
        <div>
          <span className="block text-sky-400 font-semibold">Gord</span>
          <span className="text-white font-bold">{day.gorduras}g</span>
          <span className="block text-[10px] text-slate-500">/{day.metaFat}g</span>
        </div>
      </div>
    </div>
  );
};

export const WeeklyProgressChart: React.FC<WeeklyProgressChartProps> = ({
  summary,
  onSelectDate,
}) => {
  const [chartMode, setChartMode] = useState<ChartMode>('calorias');
  const { dias, mediaCalorias, mediaProteinas, mediaCarboidratos, mediaGorduras, diasRegistrados, diasNaMeta, consistenciaPercent } = summary;

  return (
    <section
      aria-label="Progresso dos últimos 7 dias"
      className="bg-[#111827] border border-slate-800/90 rounded-2xl p-4 sm:p-5 space-y-4"
    >
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-400 shrink-0" />
            <h2 className="text-base sm:text-lg font-bold text-white">
              Consistência dos Últimos 7 Dias
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 font-mono tabular-nums">
            <span>{diasRegistrados}/7 dias registrados ({consistenciaPercent}%)</span>
            <span aria-hidden="true"> · </span>
            <span>{diasNaMeta} na meta</span>
            <span aria-hidden="true"> · </span>
            <span>Média: {mediaCalorias} kcal/dia</span>
          </p>
        </div>

        {/* Interactive Segmented Control */}
        <div
          role="group"
          aria-label="Modo de visualização do gráfico semanal"
          className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl self-start sm:self-auto"
        >
          <button
            type="button"
            onClick={() => setChartMode('calorias')}
            className={`min-h-[36px] px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              chartMode === 'calorias'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Calorias (kcal)
          </button>
          <button
            type="button"
            onClick={() => setChartMode('macros')}
            className={`min-h-[36px] px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              chartMode === 'macros'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Macronutrientes (g)
          </button>
        </div>
      </div>

      {/* Legend & Weekly Averages */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 border-b border-slate-800/80 pb-3">
        {chartMode === 'calorias' ? (
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
              <span>Na faixa da meta (±15%)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-sky-500 inline-block" />
              <span>Abaixo da meta</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
              <span>Acima da meta</span>
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />
              <span>Proteínas (Média: {mediaProteinas}g)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
              <span>Carboidratos (Média: {mediaCarboidratos}g)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-sky-500 inline-block" />
              <span>Gorduras (Média: {mediaGorduras}g)</span>
            </span>
          </div>
        )}

        <span className="font-mono tabular-nums text-[11px] text-slate-400">
          Meta diária: {dias[0]?.metaKcal || 2000} kcal · P: {dias[0]?.metaProt || 150}g · C: {dias[0]?.metaCarb || 200}g · G: {dias[0]?.metaFat || 60}g
        </span>
      </div>

      {/* Recharts BarChart Container */}
      <div className="w-full h-56 sm:h-64" data-testid="weekly-progress-recharts">
        <ResponsiveContainer width="100%" height="100%">
          {chartMode === 'calorias' ? (
            <BarChart
              key="calorias"
              data={dias}
              margin={{ top: 12, right: 12, left: -16, bottom: 4 }}
              onClick={(state) => {
                const payload = (state as { activePayload?: Array<{ payload?: { dateISO?: string } }> })?.activePayload;
                if (payload && payload[0]?.payload?.dateISO) {
                  onSelectDate(payload[0].payload.dateISO);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="shortLabel"
                tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                axisLine={{ stroke: '#1e293b' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={<CustomChartTooltip />}
                cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
              />
              <ReferenceLine
                y={dias[0]?.metaKcal || 2000}
                stroke="#10b981"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `Meta ${dias[0]?.metaKcal || 2000} kcal`,
                  position: 'insideTopRight',
                  fill: '#34d399',
                  fontSize: 11,
                }}
              />
              <Bar
                dataKey="calorias"
                name="Calorias (kcal)"
                radius={[6, 6, 0, 0]}
                maxBarSize={44}
                isAnimationActive={false}
              >
                {dias.map((entry) => {
                  let fillColor = '#0ea5e9'; // sky-500 (below target)
                  if (entry.atingiuMetaKcal) {
                    fillColor = '#10b981'; // emerald-500 (on target)
                  } else if (entry.calorias > entry.metaKcal * 1.15) {
                    fillColor = '#f59e0b'; // amber-500 (above target)
                  }
                  return (
                    <Cell
                      key={entry.dateISO}
                      fill={fillColor}
                      fillOpacity={entry.isCurrentDate ? 1 : 0.78}
                      stroke={entry.isCurrentDate ? '#ffffff' : 'none'}
                      strokeWidth={entry.isCurrentDate ? 1.5 : 0}
                      className="cursor-pointer"
                    />
                  );
                })}
              </Bar>
            </BarChart>
          ) : (
            <BarChart
              key="macros"
              data={dias}
              margin={{ top: 12, right: 12, left: -16, bottom: 4 }}
              onClick={(state) => {
                const payload = (state as { activePayload?: Array<{ payload?: { dateISO?: string } }> })?.activePayload;
                if (payload && payload[0]?.payload?.dateISO) {
                  onSelectDate(payload[0].payload.dateISO);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="shortLabel"
                tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                axisLine={{ stroke: '#1e293b' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                axisLine={false}
                tickLine={false}
                unit="g"
              />
              <Tooltip
                content={<CustomChartTooltip />}
                cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
              />
              <Bar
                dataKey="proteinas"
                name="Proteínas (g)"
                fill="#f43f5e"
                radius={[4, 4, 0, 0]}
                maxBarSize={18}
                isAnimationActive={false}
              />
              <Bar
                dataKey="carboidratos"
                name="Carboidratos (g)"
                fill="#f59e0b"
                radius={[4, 4, 0, 0]}
                maxBarSize={18}
                isAnimationActive={false}
              />
              <Bar
                dataKey="gorduras"
                name="Gorduras (g)"
                fill="#0ea5e9"
                radius={[4, 4, 0, 0]}
                maxBarSize={18}
                isAnimationActive={false}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Interactive 7-Day Selector Strip */}
      <div className="grid grid-cols-7 gap-1.5 pt-1">
        {dias.map((d) => (
          <button
            key={d.dateISO}
            type="button"
            onClick={() => onSelectDate(d.dateISO)}
            aria-label={`Selecionar dia ${d.weekdayShort} ${d.dayMonth} (${d.calorias} kcal)`}
            className={`min-h-[48px] py-1.5 px-1 rounded-xl border text-center transition-colors cursor-pointer flex flex-col items-center justify-center ${
              d.isCurrentDate
                ? 'bg-emerald-500/15 border-emerald-500/60 text-white'
                : 'bg-slate-950/70 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <span className="text-[10px] font-semibold whitespace-nowrap">{d.weekdayShort}</span>
            <span className="text-[11px] font-mono tabular-nums font-bold text-slate-200">
              {d.dayMonth.split('/')[0]}
            </span>
            <span
              className={`text-[10px] font-mono tabular-nums mt-0.5 ${
                d.calorias === 0
                  ? 'text-slate-600'
                  : d.atingiuMetaKcal
                    ? 'text-emerald-400'
                    : 'text-amber-400'
              }`}
            >
              {d.calorias > 0 ? `${d.calorias}` : '—'}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
};
