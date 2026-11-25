import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Icon,
  Select,
  Table,
  TextInput,
  withTableSorting,
  type TableColumnConfig,
} from '@gravity-ui/uikit';
import { DatePicker } from '@gravity-ui/date-components';
import { dateTime, dateTimeParse, type DateTime } from '@gravity-ui/date-utils';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Pulse } from '@gravity-ui/icons';
import MeasurementModal from '../components/MeasurementModal';
import { downloadCsv, downloadPdf, errorMessage, request } from '../lib/api';
import type { Dashboard, Device, RecordItem } from '../types';
import AnimatedContent from '@/components/react-bits/AnimatedContent'; // 👈 adjust path

const SortableTable = withTableSorting<RecordTableRow>(Table);

type PresetKey = '1w' | '1m' | '6m' | '1y';

const PERIOD_PRESETS: { key: PresetKey; label: string }[] = [
  { key: '1w', label: '1н' },
  { key: '1m', label: '1м' },
  { key: '6m', label: '6м' },
  { key: '1y', label: '1г' },
];

const SLOT_LABELS: Record<RecordItem['slot'], string> = {
  morning: 'Утро',
  day: 'День',
  evening: 'Вечер',
  unscheduled: 'Вне плана',
};

const CATEGORY_LABELS: Record<'low' | 'normal' | 'high', string> = {
  low: 'Заниженное',
  normal: 'Норма',
  high: 'Завышенное',
};

const SYMPTOM_LABELS: Record<string, string> = {
  headache: 'головная боль',
  weakness: 'слабость',
  drowsiness: 'сонливость',
  dizziness: 'головокружение',
  nausea: 'тошнота',
  palpitations: 'сердцебиение',
  chest_discomfort: 'дискомфорт в груди',
  shortness_of_breath: 'одышка',
  other: 'другое',
};

interface RecordTableRow {
  id: number;
  timestamp: number;
  dateFormatted: string;
  timeFormatted: string;
  slot: RecordItem['slot'];
  slotLabel: string;
  measurementsText: string;
  systolic: number;
  diastolic: number;
  pulse: number;
  category: 'low' | 'normal' | 'high';
  qualityFlag: boolean;
  deviceLabel: string;
  wellBeing: string;
}

/**
 * Хук для отображения данных графика окном в 1 месяц с переключением назад/вперёд.
 */
function useMonthlyWindow<T>(
  items: T[],
  getDateStr: (item: T) => string | null,
  boundFrom: string,
  boundTo: string,
) {
  const { minMonth, maxMonth } = useMemo(() => {
    const dates = items
      .map(getDateStr)
      .filter((d): d is string => Boolean(d))
      .sort();

    const first = boundFrom || dates[0] || dateTime().format('YYYY-MM-DD');
    const last = boundTo || dates[dates.length - 1] || dateTime().format('YYYY-MM-DD');

    const minDt = dateTimeParse(first)?.startOf('month') ?? dateTime().startOf('month');
    const maxDt = dateTimeParse(last)?.startOf('month') ?? dateTime().startOf('month');

    return { minMonth: minDt, maxMonth: maxDt };
  }, [items, getDateStr, boundFrom, boundTo]);

  const [currentMonth, setCurrentMonth] = useState<DateTime>(() => maxMonth);

  // При изменении границ или загрузке новых данных сдвигаем окно к актуальному месяцу
  useEffect(() => {
    setCurrentMonth(maxMonth);
  }, [maxMonth]);

  const monthKey = currentMonth.format('YYYY-MM');

  const slicedData = useMemo(() => {
    return items.filter((item) => {
      const raw = getDateStr(item);
      if (!raw) return false;
      const parsed = dateTimeParse(raw);
      return parsed ? parsed.format('YYYY-MM') === monthKey : false;
    });
  }, [items, getDateStr, monthKey]);

  const canPrev = currentMonth.isAfter(minMonth);
  const canNext = currentMonth.isBefore(maxMonth);

  const goPrev = useCallback(() => {
    setCurrentMonth((prev: any) => (prev.isAfter(minMonth, 'month') ? prev.subtract(1, 'month') : prev));
  }, [minMonth]);

  const goNext = useCallback(() => {
    setCurrentMonth((prev: any) => (prev.isBefore(maxMonth, 'month') ? prev.add(1, 'month') : prev));
  }, [maxMonth]);

  const label = useMemo(() => {
    const jsDate = new Date(currentMonth.valueOf());
    return jsDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  }, [currentMonth]);

  return { slicedData, label, canPrev, canNext, goPrev, goNext };
}

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Границы периода наблюдения (YYYY-MM-DD)
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [activePreset, setActivePreset] = useState<PresetKey | null>(null);

  // Фильтры таблицы (фронтенд)
  const [searchQuery, setSearchQuery] = useState('');
  const [slotFilter, setSlotFilter] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [qualityFilter, setQualityFilter] = useState<string[]>([]);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const text = params.toString();
    return text ? `?${text}` : '';
  }, [from, to]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [data, settings] = await Promise.all([
        request<Dashboard>(`/api/records/dashboard${query}`),
        request<{ config: unknown; devices: Device[] }>('/api/settings'),
      ]);
      setDashboard(data);
      setDevices(settings.devices ?? []);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  // Выбор пресета периода
  function applyPreset(preset: PresetKey) {
    const now = dateTime();
    let start = now;
    if (preset === '1w') start = now.subtract(1, 'week');
    if (preset === '1m') start = now.subtract(1, 'month');
    if (preset === '6m') start = now.subtract(6, 'month');
    if (preset === '1y') start = now.subtract(1, 'year');

    setFrom(start.format('YYYY-MM-DD'));
    setTo(now.format('YYYY-MM-DD'));
    setActivePreset(preset);
  }

  function resetPeriod() {
    setFrom('');
    setTo('');
    setActivePreset(null);
  }

  async function exportCsvData() {
    setExportingCsv(true);
    try {
      await downloadCsv(query);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setExportingCsv(false);
    }
  }

  async function exportPdfData() {
    setExportingPdf(true);
    try {
      await downloadPdf(query);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setExportingPdf(false);
    }
  }

  const records = dashboard?.records ?? [];
  const deviceNames = useMemo(
    () => new Map<number, string>(devices.map((device): [number, string] => [device.id, device.title])),
    [devices],
  );

  const chartData = useMemo(() => [...(dashboard?.timeseries ?? [])].reverse(), [dashboard]);
  const analyticChartData = useMemo(() => {
    const excludeFirstDay = dashboard?.method.excluded_first_day ?? false;
    const excludedDate = dashboard?.method.excluded_date ?? null;

    return chartData.filter(
      (point) => point.is_planned && (!excludeFirstDay || point.date !== excludedDate),
    );
  }, [chartData, dashboard]);

  // Помесячные окна для основных графиков
  const getPointDate = useCallback((p: Dashboard['timeseries'][number]) => p.date, []);
  const mainChartWindow = useMonthlyWindow(chartData, getPointDate, from, to);

  const getHeatmapDate = useCallback((d: Dashboard['heatmap'][number]) => d.date, []);
  const heatmapWindow = useMonthlyWindow(dashboard?.heatmap ?? [], getHeatmapDate, from, to);

  const getWeeklyDate = useCallback((w: Dashboard['weekly'][number]) => {
    // Если week приходит в формате YYYY-MM-DD или "YYYY-MM-DD — ...", берём первые 10 символов
    const match = String(w.week).match(/\d{4}-\d{2}-\d{2}/);
    return match ? match[0] : null;
  }, []);
  const weeklyWindow = useMonthlyWindow(dashboard?.weekly ?? [], getWeeklyDate, from, to);

  // Подготовка строк для Gravity UI Table + фильтрация
  const tableRows = useMemo<RecordTableRow[]>(() => {
    return records.map((record) => {
      const date = new Date(`${record.measured_at.replace(' ', 'T')}+03:00`);
      const metrics = record.metrics.point;
      const deviceLabel = record.device_id
        ? deviceNames.get(record.device_id) ?? `Прибор #${record.device_id}`
        : 'Не указан';

      const wellBeing = [
        ...(record.symptoms ?? []).map((code) => SYMPTOM_LABELS[code] ?? code),
        ...(record.notes ? [record.notes] : []),
      ].join(' · ');

      return {
        id: record.id,
        timestamp: date.getTime(),
        dateFormatted: date.toLocaleDateString('ru-RU'),
        timeFormatted: date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        slot: record.slot,
        slotLabel: SLOT_LABELS[record.slot],
        measurementsText: record.measurements.map((item) => `${item.systolic}/${item.diastolic}`).join(' · '),
        systolic: Math.round(metrics.systolic),
        diastolic: Math.round(metrics.diastolic),
        pulse: Math.round(metrics.pulse),
        category: record.metrics.category,
        qualityFlag: Boolean(record.quality_flag),
        deviceLabel,
        wellBeing: wellBeing || '—',
      };
    });
  }, [records, deviceNames]);

  const filteredTableRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tableRows.filter((row) => {
      if (slotFilter.length && !slotFilter.includes(row.slot)) return false;
      if (categoryFilter.length && !categoryFilter.includes(row.category)) return false;
      if (qualityFilter.length) {
        const qualityKey = row.qualityFlag ? 'low' : 'ok';
        if (!qualityFilter.includes(qualityKey)) return false;
      }
      if (q) {
        const haystack = `${row.dateFormatted} ${row.deviceLabel} ${row.wellBeing} ${row.measurementsText}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [tableRows, searchQuery, slotFilter, categoryFilter, qualityFilter]);

  const tableColumns = useMemo<TableColumnConfig<RecordTableRow>[]>(
    () => [
      {
        id: 'date',
        name: 'Дата / время',
        meta: { sort: (a: RecordTableRow, b: RecordTableRow) => a.timestamp - b.timestamp },
        template: (row) => (
          <div>
            <strong>{row.dateFormatted}</strong>{' '}
            <span style={{ opacity: 0.7 }}>{row.timeFormatted}</span>
          </div>
        ),
      },
      {
        id: 'slot',
        name: 'Слот',
        meta: { sort: (a: RecordTableRow, b: RecordTableRow) => a.slotLabel.localeCompare(b.slotLabel, 'ru') },
        template: (row) => <span className="slot-label">{row.slotLabel}</span>,
      },
      {
        id: 'measurements',
        name: 'Показания',
        template: (row) => row.measurementsText,
      },
      {
        id: 'point',
        name: 'Средняя точка',
        meta: { sort: (a: RecordTableRow, b: RecordTableRow) => a.systolic - b.systolic || a.diastolic - b.diastolic },
        template: (row) => (
          <strong>
            {row.systolic}/{row.diastolic}
          </strong>
        ),
      },
      {
        id: 'pulse',
        name: 'Пульс',
        meta: { sort: (a: RecordTableRow, b: RecordTableRow) => a.pulse - b.pulse },
        template: (row) => `${row.pulse} уд/мин`,
      },
      {
        id: 'status',
        name: 'Статус',
        meta: { sort: (a: RecordTableRow, b: RecordTableRow) => a.category.localeCompare(b.category) },
        template: (row) => <CategoryBadge category={row.category} />,
      },
      {
        id: 'quality',
        name: 'Качество',
        meta: { sort: (a: RecordTableRow, b: RecordTableRow) => Number(a.qualityFlag) - Number(b.qualityFlag) },
        template: (row) =>
          row.qualityFlag ? (
            <span className="quality-badge">Низкая</span>
          ) : (
            <span className="quality-ok">Норма</span>
          ),
      },
      {
        id: 'device',
        name: 'Тонометр',
        meta: { sort: (a: RecordTableRow, b: RecordTableRow) => a.deviceLabel.localeCompare(b.deviceLabel, 'ru') },
        template: (row) => row.deviceLabel,
      },
      {
        id: 'wellbeing',
        name: 'Самочувствие',
        template: (row) => <span className="wellbeing-cell">{row.wellBeing}</span>,
      },
    ],
    [],
  );

  const hasActiveTableFilters = Boolean(
    searchQuery || slotFilter.length || categoryFilter.length || qualityFilter.length,
  );

  return (
    <div className="dashboard-page container">
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">Ваши наблюдения</span>
          <h1>Дэшборд</h1>
          <p className="py-2">Серии измерений, динамика и исходные показания в одном месте</p>
        </div>
        <div className="dashboard-actions">
          <Button view="outlined" size="xl" onClick={exportCsvData} loading={exportingCsv}>
            ↓ Выгрузить CSV
          </Button>
          <Button view="outlined" size="xl" onClick={exportPdfData} loading={exportingPdf}>
            ↓ Выгрузить PDF
          </Button>
          <Button view="action" size="xl" onClick={() => setOpenModal(true)}>
            ＋ Добавить замер
          </Button>
        </div>
      </div>

      <Card className="filter-card">
        <div className="filter-info">
          <strong>Период наблюдения</strong>
          <span>Графики и таблица обновляются по выбранному диапазону</span>
        </div>

        <div className="period-presets" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {PERIOD_PRESETS.map((preset) => (
            <Button
              key={preset.key}
              size="l"
              view={activePreset === preset.key ? 'action' : 'outlined'}
              onClick={() => applyPreset(preset.key)}
            >
              {preset.label}
            </Button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4, opacity: 0.7 }}>С даты</div>
            <DatePicker
              size="l"
              format="DD.MM.YYYY"
              placeholder="Начало"
              value={from ? dateTimeParse(from) : null}
              maxValue={to ? dateTimeParse(to) : undefined}
              onUpdate={(val: any) => {
                setFrom(val ? val.format('YYYY-MM-DD') : '');
                setActivePreset(null);
              }}
              hasClear
            />
          </div>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4, opacity: 0.7 }}>По дату</div>
            <DatePicker
              size="l"
              format="DD.MM.YYYY"
              placeholder="Конец"
              value={to ? dateTimeParse(to) : null}
              minValue={from ? dateTimeParse(from) : undefined}
              onUpdate={(val: any) => {
                setTo(val ? val.format('YYYY-MM-DD') : '');
                setActivePreset(null);
              }}
              hasClear
            />
          </div>
          <Button view="flat" size="l" onClick={resetPeriod}>
            Сбросить
          </Button>
        </div>
      </Card>

      {error && <div className="inline-error">{error}</div>}
      {loading && !dashboard ? (
        <div className="dashboard-loading">
          <span className="spinner" /> Загружаем ваши данные…
        </div>
      ) : dashboard ? (
        <>
          {!dashboard.summary.series_count && (
            <Card className="empty-state">
              <div className="empty-illustration">
                <Icon data={Pulse} size={16} />
              </div>
              <h2>Здесь начнётся ваша история</h2>
              <p>
                Добавьте первую серию измерений. Для одной серии запишите два показания с интервалом 1–2 минуты
              </p>
              <Button view="action" size="xl" onClick={() => setOpenModal(true)}>
                Добавить первый замер
              </Button>
            </Card>
          )}

          {/* ⬇️ Metric cards with staggered reveal */}
          <AnimatedContent
            distance={60}
            direction="vertical"
            duration={0.7}
            ease="power3.out"
            stagger={0.1}
            threshold={0.1}
            once={true}
          >
            <div className="metric-grid">
              <MetricCard
                label="Среднее САД"
                value={formatMetric(dashboard.summary.average_systolic)}
                unit="мм рт. ст."
                hint="По плановым сериям"
                tone="blue"
              />
              <MetricCard
                label="Среднее ДАД"
                value={formatMetric(dashboard.summary.average_diastolic)}
                unit="мм рт. ст."
                hint="По плановым сериям"
                tone="green"
              />
              <MetricCard
                label="В целевых значениях"
                value={formatMetric(dashboard.summary.time_in_target_percent)}
                unit="%"
                hint="Доля нормальных серий"
                tone="violet"
              />
              <MetricCard
                label="Серий записано"
                value={String(dashboard.summary.series_count)}
                unit=""
                hint={`${dashboard.summary.planned_series_count} плановых · ${dashboard.summary.unscheduled_series_count} вне плана`}
                tone="dark"
              />
            </div>
          </AnimatedContent>

          {/* ⬇️ Chart grid – two cards reveal from opposite sides */}
          <div className="dashboard-chart-grid">
            <AnimatedContent
              distance={80}
              direction="horizontal"
              reverse={false}
              duration={0.8}
              ease="power3.out"
              threshold={0.1}
              once={true}
            >
              <Card className="chart-card primary-chart-card">
                {/* ... existing chart card content ... */}
                {/* (kept exactly as in original) */}
                <div className="chart-heading">
                  <div>
                    <h2>Динамика давления</h2>
                    <p>Точки — серии измерений. Линия — скользящее среднее САД за 7 дней</p>
                  </div>
                  <MonthPager
                    label={mainChartWindow.label}
                    canPrev={mainChartWindow.canPrev}
                    canNext={mainChartWindow.canNext}
                    onPrev={mainChartWindow.goPrev}
                    onNext={mainChartWindow.goNext}
                  />
                </div>
                {mainChartWindow.slicedData.length ? (
                  <div className="chart-area">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        data={mainChartWindow.slicedData}
                        margin={{ top: 12, right: 16, left: -12, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 4" vertical={false} stroke="#e9edf3" />
                        <XAxis
                          dataKey="date"
                          tick={{ fill: '#8490a1', fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                          minTickGap={28}
                        />
                        <YAxis
                          domain={['dataMin - 12', 'dataMax + 12']}
                          tick={{ fill: '#8490a1', fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            border: '1px solid #e7ebf1',
                            borderRadius: 12,
                            boxShadow: '0 12px 30px rgba(20,35,60,.08)',
                          }}
                          labelStyle={{ color: '#243149', fontWeight: 700 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="planned_systolic"
                          name="САД · плановые серии"
                          stroke="#5595ee"
                          strokeWidth={2.5}
                          dot={{ r: 3, fill: '#5595ee' }}
                          activeDot={{ r: 5 }}
                          connectNulls
                        />
                        <Line
                          type="monotone"
                          dataKey="planned_diastolic"
                          name="ДАД · плановые серии"
                          stroke="#27b58c"
                          strokeWidth={2.5}
                          dot={{ r: 3, fill: '#27b58c' }}
                          activeDot={{ r: 5 }}
                          connectNulls
                        />
                        <Line
                          type="monotone"
                          dataKey="rolling_systolic_7d"
                          name="САД · среднее 7 дней"
                          stroke="#193c72"
                          strokeWidth={3}
                          dot={false}
                          connectNulls
                        />
                        <Line
                          type="monotone"
                          dataKey="rolling_diastolic_7d"
                          name="ДАД · среднее 7 дней"
                          stroke="#24765f"
                          strokeWidth={3}
                          dot={false}
                          connectNulls
                        />
                        <Line
                          type="linear"
                          dataKey="unscheduled_systolic"
                          name="САД · вне плана"
                          stroke="transparent"
                          strokeWidth={0}
                          dot={{ r: 4, fill: '#9ba9bb', fillOpacity: 0.48, stroke: 'none' }}
                          activeDot={{ r: 6, fill: '#8090a5' }}
                          connectNulls={false}
                        />
                        <Line
                          type="linear"
                          dataKey="unscheduled_diastolic"
                          name="ДАД · вне плана"
                          stroke="transparent"
                          strokeWidth={0}
                          dot={{ r: 4, fill: '#9ba9bb', fillOpacity: 0.48, stroke: 'none' }}
                          activeDot={{ r: 6, fill: '#8090a5' }}
                          connectNulls={false}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <ChartEmpty />
                )}
                <div className="chart-legend">
                  <span>
                    <i className="legend-blue" /> САД
                  </span>
                  <span>
                    <i className="legend-green" /> ДАД
                  </span>
                  <span>
                    <i className="legend-navy" /> Среднее за 7 дней
                  </span>
                  <span>
                    <i className="legend-muted" /> Вне плана
                  </span>
                </div>
                <p className="chart-footnote">
                  Внеплановые серии показаны отдельными приглушёнными точками и не входят в плановые линии и средние.
                </p>
              </Card>
            </AnimatedContent>

            <AnimatedContent
              distance={80}
              direction="horizontal"
              reverse={true}
              duration={0.8}
              ease="power3.out"
              threshold={0.1}
              once={true}
            >
              <Card className="chart-card weekly-card">
                {/* ... existing weekly chart content ... */}
                <div className="chart-heading">
                  <div>
                    <h2>Категории по неделям</h2>
                    <p>Распределение плановых серий по порогам профиля</p>
                  </div>
                  <MonthPager
                    label={weeklyWindow.label}
                    canPrev={weeklyWindow.canPrev}
                    canNext={weeklyWindow.canNext}
                    onPrev={weeklyWindow.goPrev}
                    onNext={weeklyWindow.goNext}
                  />
                </div>
                {(weeklyWindow.slicedData.length ? weeklyWindow.slicedData : dashboard.weekly).length ? (
                  <div className="chart-area">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={weeklyWindow.slicedData.length ? weeklyWindow.slicedData : dashboard.weekly}
                        margin={{ top: 12, right: 8, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 4" vertical={false} stroke="#e9edf3" />
                        <XAxis dataKey="week" tick={{ fill: '#8490a1', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fill: '#8490a1', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip />
                        <Bar dataKey="normal" name="Норма" stackId="a" fill="#34c99a" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="low" name="Заниженное" stackId="a" fill="#80a9e9" />
                        <Bar dataKey="high" name="Завышенное" stackId="a" fill="#f28d85" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <ChartEmpty />
                )}
                <div className="category-legend">
                  <span>
                    <i className="category-dot normal" /> Норма
                  </span>
                  <span>
                    <i className="category-dot low" /> Заниженное
                  </span>
                  <span>
                    <i className="category-dot high" /> Завышенное
                  </span>
                </div>
              </Card>
            </AnimatedContent>
          </div>

          <div className="dashboard-lower-grid">
            <AnimatedContent
              distance={70}
              direction="vertical"
              duration={0.8}
              ease="power3.out"
              threshold={0.1}
              once={true}
            >
              <Card className="chart-card heatmap-card">
                {/* ... existing heatmap content ... */}
                <div className="chart-heading">
                  <div>
                    <h2>Календарь измерений</h2>
                    <p>Цвет показывает категорию серии в каждом временном слоте</p>
                  </div>
                  <MonthPager
                    label={heatmapWindow.label}
                    canPrev={heatmapWindow.canPrev}
                    canNext={heatmapWindow.canNext}
                    onPrev={heatmapWindow.goPrev}
                    onNext={heatmapWindow.goNext}
                  />
                </div>
                {heatmapWindow.slicedData.length ? (
                  <div className="heatmap-wrap">
                    <div className="heatmap-head">
                      <span>Дата</span>
                      <span>Утро</span>
                      <span>День</span>
                      <span>Вечер</span>
                    </div>
                    {heatmapWindow.slicedData.map((day) => (
                      <div className="heatmap-row" key={day.date}>
                        <span>
                          {new Date(`${day.date}T12:00:00`).toLocaleDateString('ru-RU', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </span>
                        {(['morning', 'day', 'evening'] as const).map((slot) => (
                          <span
                            key={slot}
                            className={`heat-cell ${day[slot] ? day[slot]!.category : 'empty'} ${
                              day[slot] && !day[slot]!.planned ? 'unplanned' : ''
                            }`}
                            title={
                              day[slot]
                                ? `${slot}: ${day[slot]!.category}${
                                    day[slot]!.quality_flag ? ', низкая достоверность' : ''
                                  }`
                                : 'Нет измерения'
                            }
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <ChartEmpty />
                )}
              </Card>
            </AnimatedContent>

            <AnimatedContent
              distance={70}
              direction="vertical"
              duration={0.8}
              delay={0.1}
              ease="power3.out"
              threshold={0.1}
              once={true}
            >
              <Card className="chart-card insight-card">
                {/* ... existing insight content ... */}
                <div className="chart-heading">
                  <div>
                    <h2>Статистика периода</h2>
                    <p>Показатели – не медицинское заключение</p>
                  </div>
                </div>
                <div className="insight-list">
                  <Insight label="Средняя ЧСС" value={formatMetric(dashboard.summary.average_pulse)} unit="уд/мин" />
                  <Insight label="SD САД" value={formatMetric(dashboard.summary.systolic_sd)} unit="мм рт. ст." />
                  <Insight label="CV САД" value={formatMetric(dashboard.summary.systolic_cv)} unit="%" />
                  <Insight
                    label="Серии вне нормы подряд"
                    value={String(dashboard.summary.consecutive_outside_target)}
                    unit=""
                  />
                </div>
                <div className="trend-note">
                  {dashboard.summary.trend_available ? (
                    <>
                      <strong>Тренд за период</strong>
                      <p>
                        САД: {formatSigned(dashboard.summary.trend_systolic_per_week)} мм рт. ст./нед. · ДАД:{' '}
                        {formatSigned(dashboard.summary.trend_diastolic_per_week)} мм рт. ст./нед.
                      </p>
                    </>
                  ) : (
                    <>
                      <strong>Тренд пока не рассчитывается</strong>
                      <p>
                        Нужно не менее 10 плановых серий. Сейчас в расчёте: {dashboard.summary.included_series_count}
                      </p>
                    </>
                  )}
                </div>
                {dashboard.method.excluded_first_day && (
                  <p className="chart-footnote">
                    Первый день наблюдения исключён из средних:{' '}
                    {dashboard.method.excluded_date ?? 'данные появятся после первой серии'}.
                  </p>
                )}
              </Card>
            </AnimatedContent>
          </div>

          <div className="dashboard-mini-grid">
            <MiniTrendCard
              title="Пульсовое давление (ПД)"
              description="САД − ДАД"
              data={analyticChartData}
              dataKey="pulse_pressure"
              color="#5d91e7"
              unit="мм рт. ст."
              boundFrom={from}
              boundTo={to}
            />
            <MiniTrendCard
              title="Среднее гемодинамическое АД"
              description="Справочный расчёт СГАД"
              data={analyticChartData}
              dataKey="map"
              color="#27a886"
              unit="мм рт. ст."
              boundFrom={from}
              boundTo={to}
            />
            <MiniTrendCard
              title="Частота сердечных сокращений"
              description="Пульс в каждой плановой серии"
              data={analyticChartData}
              dataKey="pulse"
              color="#9276d8"
              unit="уд/мин"
              boundFrom={from}
              boundTo={to}
            />
            <Card className="chart-card mini-chart-card">
              <div className="chart-heading">
                <div>
                  <h2>Распределение САД</h2>
                  <p>Гистограмма средних точек плановых серий</p>
                </div>
              </div>
              {dashboard.distribution.length ? (
                <div className="mini-chart-area">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboard.distribution} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                      <XAxis dataKey="range" tick={{ fill: '#8490a1', fontSize: 9 }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fill: '#8490a1', fontSize: 9 }} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Bar dataKey="count" name="Серий" fill="#7da7e8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <ChartEmpty />
              )}
            </Card>
          </div>

          <AnimatedContent
            distance={50}
            direction="vertical"
            duration={0.8}
            ease="power3.out"
            threshold={0.05}
            once={true}
          >
            <Card className="records-card">
              {/* ... existing records table content ... */}
              <div className="records-heading">
                <div>
                  <h2>Исходные данные</h2>
                  <p>Все показания серии сохранены отдельно. Клик по заголовку колонки сортирует таблицу</p>
                </div>
                <span>
                  {filteredTableRows.length} из {records.length} серий
                </span>
              </div>

              <div
                className="table-filters"
                style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}
              >
                <div style={{ minWidth: 220, flex: '1 1 220px' }}>
                  <TextInput
                    size="m"
                    placeholder="Поиск по симптомам, заметкам, прибору…"
                    value={searchQuery}
                    onUpdate={setSearchQuery}
                    hasClear
                  />
                </div>
                <Select
                  size="m"
                  multiple
                  placeholder="Слот"
                  value={slotFilter}
                  onUpdate={setSlotFilter}
                  options={[
                    { value: 'morning', content: 'Утро' },
                    { value: 'day', content: 'День' },
                    { value: 'evening', content: 'Вечер' },
                    { value: 'unscheduled', content: 'Вне плана' },
                  ]}
                />
                <Select
                  size="m"
                  multiple
                  placeholder="Статус"
                  value={categoryFilter}
                  onUpdate={setCategoryFilter}
                  options={[
                    { value: 'normal', content: 'Норма' },
                    { value: 'low', content: 'Заниженное' },
                    { value: 'high', content: 'Завышенное' },
                  ]}
                />
                <Select
                  size="m"
                  multiple
                  placeholder="Качество"
                  value={qualityFilter}
                  onUpdate={setQualityFilter}
                  options={[
                    { value: 'ok', content: 'Норма' },
                    { value: 'low', content: 'Низкая' },
                  ]}
                />
                {hasActiveTableFilters && (
                  <Button
                    size="m"
                    view="flat"
                    onClick={() => {
                      setSearchQuery('');
                      setSlotFilter([]);
                      setCategoryFilter([]);
                      setQualityFilter([]);
                    }}
                  >
                    Сбросить фильтры
                  </Button>
                )}
              </div>

              {filteredTableRows.length ? (
                <div className="table-scroll">
                  <SortableTable
                    data={filteredTableRows}
                    columns={tableColumns}
                    emptyMessage="Записей по выбранным фильтрам нет."
                  />
                </div>
              ) : (
                <div className="table-empty">
                  {records.length ? 'По заданным фильтрам ничего не найдено.' : 'Записей пока нет.'}
                </div>
              )}
            </Card>
          </AnimatedContent>

          <AnimatedContent
            distance={30}
            direction="vertical"
            duration={0.6}
            ease="power3.out"
            threshold={0.1}
            once={true}
          >
            <div className="medical-disclaimer">
              <strong>Важно</strong>
              <span>{dashboard.method.disclaimer}</span>
            </div>
          </AnimatedContent>
        </>
      ) : null}

      <MeasurementModal
        open={openModal}
        devices={devices}
        onClose={() => setOpenModal(false)}
        onSaved={() => void load()}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Ниже – вспомогательные компоненты (MonthPager, MetricCard и т.д.) */
/*  Они остаются без изменений.                                       */
/* ------------------------------------------------------------------ */

function MonthPager({
  label,
  canPrev,
  canNext,
  onPrev,
  onNext,
}: {
  label: string;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <Button size="s" view="outlined" disabled={!canPrev} onClick={onPrev} title="Предыдущий месяц">
        ←
      </Button>
      <span style={{ fontSize: 12, fontWeight: 600, minWidth: 108, textAlign: 'center', textTransform: 'capitalize' }}>
        {label}
      </span>
      <Button size="s" view="outlined" disabled={!canNext} onClick={onNext} title="Следующий месяц">
        →
      </Button>
    </div>
  );
}

function MetricCard({
  label,
  value,
  unit,
  hint,
  tone,
}: {
  label: string;
  value: string;
  unit: string;
  hint: string;
  tone: string;
}) {
  return (
    <Card className={`metric-card metric-${tone}`}>
      <span>{label}</span>
      <div>
        <strong>{value}</strong>
        <small>{unit}</small>
      </div>
      <p>{hint}</p>
    </Card>
  );
}

function MiniTrendCard({
  title,
  description,
  data,
  dataKey,
  color,
  unit,
  boundFrom,
  boundTo,
}: {
  title: string;
  description: string;
  data: Dashboard['timeseries'];
  dataKey: 'pulse_pressure' | 'map' | 'pulse';
  color: string;
  unit: string;
  boundFrom: string;
  boundTo: string;
}) {
  const getPointDate = useCallback((p: Dashboard['timeseries'][number]) => p.date, []);
  const monthWindow = useMonthlyWindow(data, getPointDate, boundFrom, boundTo);

  return (
    <Card className="chart-card mini-chart-card">
      <div className="chart-heading" style={{ flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <MonthPager
          label={monthWindow.label}
          canPrev={monthWindow.canPrev}
          canNext={monthWindow.canNext}
          onPrev={monthWindow.goPrev}
          onNext={monthWindow.goNext}
        />
      </div>
      {monthWindow.slicedData.length ? (
        <div className="mini-chart-area">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={monthWindow.slicedData} margin={{ top: 8, right: 5, left: -20, bottom: 0 }}>
              <XAxis dataKey="date" hide />
              <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
              <Tooltip
                formatter={(value) => [`${Number(value).toFixed(1)} ${unit}`, title]}
                labelFormatter={(label) => String(label)}
              />
              <Line
                type="monotone"
                dataKey={dataKey}
                name={title}
                stroke={color}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <ChartEmpty />
      )}
    </Card>
  );
}

function Insight({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="insight-row">
      <span>{label}</span>
      <strong>
        {value} <small>{unit}</small>
      </strong>
    </div>
  );
}

function CategoryBadge({ category }: { category: 'low' | 'normal' | 'high' }) {
  return <span className={`category-badge ${category}`}>{CATEGORY_LABELS[category]}</span>;
}

function ChartEmpty() {
  return <div className="chart-empty">Недостаточно данных для графика за выбранный месяц.</div>;
}

function formatMetric(value: number | null): string {
  return value === null ? '—' : String(Math.round(value * 10) / 10);
}

function formatSigned(value: number | null): string {
  return value === null ? '—' : `${value > 0 ? '+' : ''}${value}`;
}