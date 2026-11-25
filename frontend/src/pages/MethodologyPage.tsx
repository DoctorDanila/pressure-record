import { useMemo, useState } from 'react';
import { Button, Card, Icon, Label, TextInput } from '@gravity-ui/uikit';
import { useNavigate } from 'react-router-dom';
import {
  CircleInfo,
  ChartLine,
  Calendar,
  Clock,
  Pulse,
  Magnifier,
  ArrowLeft,
  Heart,
  ThumbsUpFill,
  BookOpen,
} from '@gravity-ui/icons';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// React Bits + GSAP
import SplitText from '@/components/react-bits/SplitText';
import AnimatedContent from '@/components/react-bits/AnimatedContent';
import Magnet from '@/components/react-bits/Magnet';

//@ts-ignore
function MathFormula({ math, block = false }) {
  const html = useMemo(
    () =>
      katex.renderToString(math, {
        displayMode: block,
        throwOnError: false,
        strict: false,
      }),
    [math, block]
  );

  if (block) {
    return (
      <div
        className="math-formula-block"
        style={{
          overflowX: 'auto',
          padding: '12px 16px',
          margin: '12px 0',
          borderRadius: '8px',
          backgroundColor: 'var(--g-color-base-generic)',
          border: '1px solid var(--g-color-line-generic)',
          fontSize: '15px',
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

const MATH_BLOCKS = [
  {
    title: '1. Валидация серии (размах)',
    formula: 'R = \\max(x) - \\min(x), \\quad R > 10\\text{ мм рт. ст.}',
    description:
      'Для замеров внутри одной серии вычисляется размах R. Если разброс превышает 10 мм рт. ст., серия не удаляется, а помечается флагом низкой достоверности.',
  },
  {
    title: '2. Точка данных серии',
    formula: '\\bar{x} = \\frac{x_1 + x_2 + x_3}{3}',
    description:
      'Базово берётся среднее арифметическое 2–3 замеров (отдельно для САД, ДАД и ЧСС). При флаге качества (R > 10) используется медиана — она устойчива к одиночному выбросу прибора. В базе хранятся все исходные замеры.',
  },
  {
    title: '3. Производные показатели (ПД и СГАД)',
    formula:
      '\\text{ПД} = \\text{САД} - \\text{ДАД}, \\qquad \\text{СГАД} = \\text{ДАД} + \\frac{\\text{САД} - \\text{ДАД}}{3}',
    description:
      'Пульсовое давление (ориентир ~40 мм рт. ст.) и среднегемодинамическое давление (MAP) рассчитываются автоматически как справочные метрики и выводятся на отдельных мини-панелях.',
  },
  {
    title: '4. Скользящее среднее (7 дней)',
    formula: '\\bar{x}_t = \\frac{1}{n} \\sum_{i \\in [t-6,\\, t]} x_i',
    description:
      'Усреднение по плановым сериям за окно в 7 календарных дней (n — число серий в окне). Усредняется именно по сериям, чтобы день с тремя сериями не «перетягивал» пропущенные дни.',
  },
  {
    title: '5. Вариабельность (SD и CV)',
    formula:
      'SD = \\sqrt{\\frac{\\sum_{i=1}^{n}(x_i - \\bar{x})^2}{n - 1}}, \\qquad CV = \\frac{SD}{\\bar{x}} \\cdot 100\\%',
    description:
      'Стандартное отклонение (SD) и коэффициент вариации (CV) показывают стабильность давления между сериями и днями. Значение CV выше 10–12% указывает на нестабильную картину.',
  },
  {
    title: '6. Линейный тренд (наклон)',
    formula:
      'y = a \\cdot t + b, \\qquad a = \\frac{\\sum (t_i - \\bar{t})(y_i - \\bar{y})}{\\sum (t_i - \\bar{t})^2}',
    description:
      'Коэффициент a задаёт скорость изменения показателя (мм рт. ст. в сутки / неделю). До накопления 10–14 серий тренд не отображается, чтобы избежать статистического шума.',
  },
];

const DASHBOARD_CHARTS = [
  {
    title: 'Основной линейный график',
    tag: '',
    description:
      'Линии САД и ДАД по плановым сериям, цветовая заливка зон порогов, жирная линия 7-дневного скользящего среднего и ось Y от 40–50 мм рт. ст. Внеплановые замеры отображаются полупрозрачным фоном.',
  },
  {
    title: 'Категории по неделям (Stacked bar)',
    tag: '',
    description:
      'Недельные столбцы с долями серий «Норма / Заниженное / Завышенное» и бейджем серий вне нормы подряд (например, «3 подряд вне нормы»).',
  },
  {
    title: 'Календарь-heatmap',
    tag: '',
    description:
      'Сетка «дни × слоты (утро / день / вечер)», где цвет ячейки отражает категорию серии. Помогает быстро увидеть пропуски и суточный ритм.',
  },
  {
    title: 'Спарклайны ПД, СГАД и ЧСС',
    tag: '',
    description:
      'Вынесены в отдельные панели под основным графиком, так как пульсовое давление, перфузионное давление и пульс имеют разную клиническую природу.',
  },
  {
    title: 'Гистограмма и скаттер ЧСС × САД',
    tag: '',
    description:
      'Гистограмма показывает «центр тяжести» и хвосты распределения САД за период, а диаграмма рассеяния помогает оценить согласованность пульса и давления.',
  },
  {
    title: 'Выгрузка PDF для врача',
    tag: '',
    description:
      'Включает период, модель прибора, актуальные пороги, таблицу всех исходных серий с симптомами, сводные метрики (средние, Time in target, SD/CV, тренд), графики и блок «Методика расчёта».',
  },
];

const GLOSSARY_ITEMS = [
  {
    term: 'ВГАД',
    synonym: 'САД — систолическое артериальное давление («верхнее»)',
    description:
      'Давление в артериях в момент сокращения сердца (систолы). В интерфейсе допустимо рабочее название «ВГАД», в документации и выгрузках используется официальный термин САД.',
  },
  {
    term: 'НГАД',
    synonym: 'ДАД — диастолическое артериальное давление («нижнее»)',
    description:
      'Давление в момент расслабления сердца (диастолы). Рабочий термин — «НГАД», официальный — ДАД.',
  },
  {
    term: 'ЧСС',
    synonym: 'Частота сердечных сокращений; пульс',
    description:
      'Число ударов сердца в минуту (уд/мин). Тонометры регистрируют ЧСС одновременно с измерением давления.',
  },
  {
    term: 'мм рт. ст.',
    synonym: 'Миллиметры ртутного столба',
    description:
      'Стандартная единица измерения артериального давления в клинической практике.',
  },
  {
    term: 'СКАД',
    synonym: 'Самоконтроль АД; ДМАД (домашнее мониторирование АД)',
    description:
      'Метод самостоятельного измерения давления дома бытовым тонометром. Домашние пороги строже офисных: 135/85 дома соответствует 140/90 в кабинете врача.',
  },
  {
    term: 'СМАД',
    synonym: 'Суточное мониторирование артериального давления',
    description:
      'Автоматическое измерение АД прибором в течение 24 часов. Не входит в объём сервиса, упоминается как эталонный внеофисный метод для сопоставления терминологии.',
  },
  {
    term: 'Серия измерений',
    synonym: '2–3 последовательных замера',
    description:
      'Термин сервиса: 2–3 замера, выполненные подряд в один временной слот (утро / день / вечер / вне плана). Из серии вычисляется одна точка данных для аналитики.',
  },
  {
    term: 'Плановое / внеплановое измерение',
    synonym: 'Режим слота измерения',
    description:
      'Плановое — замер в запланированный слот. Внеплановое — замер по субъективному самочувствию. Внеплановые серии не входят в тренды и средние, отображаются отдельным слоем.',
  },
  {
    term: 'Пороговые значения (пороги)',
    synonym: 'Индивидуальные границы категорий',
    description:
      'Границы категорий «Заниженное / Норма / Завышенное», задаваемые пользователем в настройках совместно с врачом. По умолчанию используются референсные домашние пороги.',
  },
  {
    term: 'Норма / Заниженное / Завышенное',
    synonym: 'Категория уровня АД',
    description:
      'Классификация среднего по серии по паре САД/ДАД (берётся худшая категория). Референсный домашний порог повышенного АД: ≥ 135 и/или ≥ 85 мм рт. ст. (ESC 2024, РФ 2024).',
  },
  {
    term: 'Пульсовое давление (ПД)',
    synonym: 'Pulse pressure',
    formula: '\\text{ПД} = \\text{САД} - \\text{ДАД}',
    description:
      'Ориентировочная норма ~40 мм рт. ст. Хронически повышенное ПД ассоциировано с жёсткостью сосудов. В сервисе отображается исключительно как справочная производная.',
  },
  {
    term: 'Среднегемодинамическое АД (СГАД)',
    synonym: 'MAP — mean arterial pressure; перфузионное давление',
    formula: '\\text{СГАД} = \\text{ДАД} + \\frac{\\text{САД} - \\text{ДАД}}{3}',
    description:
      'Расчётное среднее давление за весь сердечный цикл. В сервисе носит справочный характер; клинически интерпретируется только врачом.',
  },
  {
    term: 'Среднее по серии',
    synonym: 'Арифметическое среднее замеров',
    formula: '\\bar{x} = \\frac{1}{k}\\sum_{j=1}^{k} x_j',
    description:
      'Среднее арифметическое 2–3 замеров внутри серии (рассчитывается отдельно для САД, ДАД и ЧСС). Основная точка данных на графиках.',
  },
  {
    term: 'Медиана по серии',
    synonym: 'Средний по величине замер',
    description:
      'Устойчива к одиночному выбросу (например, ошибке прибора или движению руки), поэтому используется как резервная точка при размытых сериях.',
  },
  {
    term: 'Размах серии (R)',
    synonym: 'Range',
    formula: 'R = \\max(x) - \\min(x)',
    description:
      'Разница между максимальным и минимальным замером внутри серии. Критерий качества: при R > 10 мм рт. ст. серия помечается как низкодостоверная.',
  },
  {
    term: 'Вариабельность АД',
    synonym: 'BP variability',
    description:
      'Разброс значений АД между сериями и днями. Оценивается стандартным отклонением (SD) и коэффициентом вариации (CV). В сервисе трактуется как описательная метрика.',
  },
  {
    term: 'SD',
    synonym: 'Стандартное отклонение',
    formula: 'SD = \\sqrt{\\frac{\\sum (x_i - \\bar{x})^2}{n - 1}}',
    description:
      'Мера разброса значений средних по сериям вокруг общего среднего за выбранный период (в мм рт. ст.).',
  },
  {
    term: 'CV',
    synonym: 'Коэффициент вариации',
    formula: 'CV = \\frac{SD}{\\bar{x}} \\cdot 100\\%',
    description:
      'Относительная мера разброса в процентах. Значение CV по артериальному давлению выше ~10–12% считается признаком нестабильной картины.',
  },
  {
    term: 'Скользящее среднее (7 дней)',
    synonym: 'Rolling / moving average',
    description:
      'Среднее значений плановых серий за скользящее окно в 7 календарных дней. Сглаживает суточный шум и проявляет реальный тренд.',
  },
  {
    term: 'Тренд (наклон)',
    synonym: 'Линейный тренд, slope',
    description:
      'Наклон линии линейной регрессии — скорость изменения показателя (мм рт. ст. в сутки или неделю). До накопления 10–14 серий не выводится из-за статистического шума.',
  },
  {
    term: 'Time in target',
    synonym: 'Индекс времени в цели',
    description:
      'Доля серий, попавших в целевые пороги («Норма»), за выбранный период. Родственен показателю «индекс времени гипертензии» в СМАД.',
  },
  {
    term: 'Утренний подъём',
    synonym: 'Morning surge (в СМАД)',
    description:
      'Стабильная разница между утренними и вечерними значениями АД («утро − вечер»). Важный признак для врача; сервис только вычисляет и отображает разницу.',
  },
  {
    term: 'Эффект белого халата',
    synonym: 'Изолированная офисная (клиническая) гипертензия',
    description:
      'Повышение АД только на приёме у врача из-за волнения при нормальных показателях дома. Домашний самоконтроль (СКАД) — основной способ его выявления.',
  },
  {
    term: 'Маскированная гипертензия',
    synonym: 'Изолированная амбулаторная гипертензия',
    description:
      'Обратная ситуация: в кабинете врача давление в норме, а в повседневной жизни повышено. Выявляется с помощью домашнего или суточного мониторирования.',
  },
  {
    term: 'Первый день мониторинга',
    synonym: 'Исключение первого дня из расчётов',
    description:
      'Замеры первого дня часто завышены из-за адаптации к процедуре. Клинические рекомендации (NICE, РФ) советуют исключать их из средних. В сервисе это настраиваемая опция; исходные записи не удаляются.',
  },
  {
    term: 'Прибор (тонометр)',
    synonym: 'Справочник измерительных устройств',
    description:
      'Модель тонометра (плечевая или запястная манжета, дата поверки при наличии), добавляемая пользователем в конфиг. Позволяет строить срезы аналитики по приборам и выявлять смещения.',
  },
];

const CLINICAL_SOURCES = [
  {
    name: 'ESC 2024',
    detail:
      'Guidelines for the management of elevated blood pressure and hypertension — домашний порог 135/85 мм рт. ст. соответствует офисному 140/90; «повышенное АД» дома 120–135 / 70–84.',
  },
  {
    name: 'Минздрав РФ, 2024',
    detail:
      'Клинические рекомендации «Артериальная гипертензия у взрослых» — терминология СКАД/ДМАД, правила измерения, пороги и разграничение гипертензии «белого халата» и маскированной.',
  },
  {
    name: 'РНПЦ «Кардиология» (Беларусь)',
    detail:
      'Методика 7-дневного домашнего мониторирования: 2 замера с интервалом 1–2 минуты, исключение первого дня, порог > 135/85, запрет самостоятельной коррекции терапии.',
  },
  {
    name: 'NICE (Великобритания)',
    detail:
      'Hypertension in adults: минимум 4 дня (оптимально 7), исключение первого дня мониторинга, целевой домашний порог 135/85 для лиц до 80 лет.',
  },
  {
    name: 'ISH 2020',
    detail:
      'International Society of Hypertension Global Hypertension Practice Guidelines — протокол 3–7 дней, 2 измерения на слот, среднее без первого дня ≥ 135/85.',
  },
  {
    name: 'Исследование динамики ДМАД (PMC10113611)',
    detail:
      'Прогностическая ценность растёт с 1-го по 7-й день; при периоде ≥ 4 дней исключение первого дня слабо меняет классификацию — обоснование сделать это опцией конфига.',
  },
  {
    name: 'Обзоры по СМАД / СКАД (valenta.spb.ru, RMJ Кардио Digest)',
    detail:
      'Градации АД, соотношение офисных и внеофисных порогов, роль СКАД в контроле терапии.',
  },
];

export default function MethodologyPage() {
  const navigate = useNavigate();
  const [glossaryQuery, setGlossaryQuery] = useState('');

  const filteredGlossary = useMemo(() => {
    const q = glossaryQuery.trim().toLowerCase();
    if (!q) return GLOSSARY_ITEMS;
    return GLOSSARY_ITEMS.filter(
      (item) =>
        item.term.toLowerCase().includes(q) ||
        item.synonym.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
    );
  }, [glossaryQuery]);

  return (
    <div className="landing-page methodology-page">
      {/* ─── HERO ──────────────────────────────────────────────── */}
      <section className="hero-section container grid-cols-1!" style={{ paddingBottom: '40px' }}>
        <div className="hero-copy" style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <AnimatedContent distance={50} direction="vertical" duration={0.8} delay={0.1}>
            <span className="eyebrow" style={{ display: 'inline-block', marginBottom: '16px' }}>
              Прозрачность и логика
            </span>
          </AnimatedContent>

          <h1>
            <SplitText
              text="Как работает"
              tag="span"
              effect="rise"
              splitType="chars"
              delay={40}
              duration={0.7}
              trigger="load"
              textAlign="center"
            />
            <br />
            <SplitText
              text="Pressure Record"
              tag="span"
              className="text-brand"
              effect="rise"
              splitType="chars"
              delay={90}
              duration={0.7}
              trigger="load"
              textAlign="center"
            />
          </h1>

          <SplitText
            text="Мы создали этот сервис, чтобы вы могли вести аккуратный дневник самоконтроля. Здесь мы подробно объясняем, как собираются данные, по каким формулам считаются показатели и строятся графики, чтобы вы могли доверять своим наблюдениям и показать их врачу."
            tag="p"
            className="hero-lead"
            effect="fade"
            splitType="words"
            delay={20}
            duration={0.6}
            trigger="load"
            textAlign="center"
          />

          <div style={{ marginTop: '32px' }}>
            <Button view="outlined" size="xl" onClick={() => navigate(-1)}>
              <Icon data={ArrowLeft} size={16} /> Вернуться назад
            </Button>
          </div>
        </div>
      </section>

      {/* ─── DISCLAIMER WARNING ────────────────────────────────── */}
      <section className="container" style={{ marginBottom: '60px' }}>
        <AnimatedContent distance={40} direction="vertical" duration={0.6} delay={0.2}>
          <Card
            style={{
              backgroundColor: '#fff3cd',
              borderColor: '#ffe69c',
              padding: '24px',
              display: 'flex',
              gap: '16px',
              alignItems: 'flex-start',
            }}
          >
            <Icon data={CircleInfo} size={24} style={{ color: '#856404', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: '#856404', display: 'block', marginBottom: '8px', fontSize: '18px' }}>
                Важный момент
              </strong>
              <p style={{ color: '#856404', margin: 0, lineHeight: 1.55 }}>
                Сервис является инструментом <b>самоконтроля и накопления данных</b>. Он не ставит диагнозов и не
                заменяет консультацию врача. Пороговые значения по умолчанию — референсные; индивидуальные пороги
                согласуются с лечащим врачом. <b>Самостоятельная коррекция терапии по данным дневника недопустима</b> —
                это ограничение прямо зафиксировано в клинических рекомендациях и интерфейсе.
              </p>
            </div>
          </Card>
        </AnimatedContent>
      </section>

      {/* ─── SECTION 1: HOW TO MEASURE ──────────────────────────── */}
      <section className="section container" id="measure">
        <AnimatedContent distance={60} direction="vertical" duration={0.7} delay={0.1}>
          <div className="section-heading">
            <span className="eyebrow">Метод исследования</span>
            <h2>
              Как собирать данные, чтобы они были <span>достоверными</span>
            </h2>
            <p>
              Мы придерживаемся стандартов домашнего мониторирования (СКАД / ДМАД). Время каждой записи фиксируется по
              МСК, к замеру можно прикрепить прибор, симптомы и комментарий.
            </p>
          </div>
        </AnimatedContent>

        <AnimatedContent distance={50} direction="vertical" duration={0.6} delay={0.2} stagger={0.12}>
          <div className="method-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
            <Card className="method-card">
              <div className="method-number">01</div>
              <div className="method-icon icon-blue">
                <Icon data={Clock} />
              </div>
              <h3>Время и покой</h3>
              <p>
                Плановые слоты: <b>утро, день и вечер</b>. Перед серией посидите в покое <b>5 минут</b>, опираясь на
                спинку стула, не скрещивая ноги.
              </p>
            </Card>
            <Card className="method-card">
              <div className="method-number">02</div>
              <div className="method-icon icon-green">
                <Icon data={Pulse} />
              </div>
              <h3>Серия из 2–3 замеров</h3>
              <p>
                Делайте по <b>2 замера</b> с интервалом <b>1–2 минуты</b>. Если разница между первым и вторым превышает{' '}
                <MathFormula math="10\text{ мм рт. ст.}" />, выполните третий замер.
              </p>
            </Card>
            <Card className="method-card">
              <div className="method-number">03</div>
              <div className="method-icon icon-violet">
                <Icon data={Magnifier} />
              </div>
              <h3>Внеплановые замеры и симптомы</h3>
              <p>
                При недомогании отметьте флаг <b>«вне плана»</b>, укажите симптомы (головная боль, слабость, сонливость)
                и прибор. Такие записи сохраняются, но не искажают средние и тренды.
              </p>
            </Card>
          </div>
        </AnimatedContent>
      </section>

      {/* ─── SECTION 2: OVERVIEW & VISUAL ──────────────────────── */}
      <section className="section feature-section">
        <div className="container feature-layout">
          <AnimatedContent distance={70} direction="vertical" duration={0.8} delay={0.1}>
            <div>
              <span className="eyebrow">Математика графиков</span>
              <h2>Как мы считаем <span>показатели</span></h2>
              <p>Мы не усредняем всё подряд. Наша математика учитывает клинические рекомендации и исключает случайные ошибки.</p>
              
              <ul className="feature-list">
                <li>
                  <span><Icon data={ThumbsUpFill}/></span>
                  <div><b>Среднее по серии.</b> Из 2-3 замеров выводится одна точка (среднее арифметическое). Если разброс в серии слишком большой (R &gt; 10), точка помечается как «низкодостоверная», а для графика берется медиана.</div>
                </li>
                <li>
                  <span><Icon data={ThumbsUpFill}/></span>
                  <div><b>Скользящее среднее (7 дней).</b> Чтобы график не прыгал из-за случайных скачков, мы сглаживаем его за последние 7 дней. Это показывает реальный тренд.</div>
                </li>
                <li>
                  <span><Icon data={ThumbsUpFill}/></span>
                  <div><b>Первый день.</b> По умолчанию мы исключаем первый день из средних расчетов, так как в начале наблюдений давление часто завышено из-за волнения.</div>
                </li>
                <li>
                  <span><Icon data={ThumbsUpFill}/></span>
                  <div><b>Тренд.</b> Если у вас накопилось более 10 серий, мы строим линию тренда (наклон), чтобы понять, растет давление, падает или стабильно.</div>
                </li>
              </ul>
            </div>
          </AnimatedContent>

          <AnimatedContent distance={90} direction="horizontal" duration={0.9} delay={0.2}>
            <div className="feature-visual">
              <div className="feature-topline"><span>Пример основного графика</span><span>7 дней</span></div>
              <div className="feature-stats">
                <div>
                  <span>САД (верхнее)</span>
                  <strong>126</strong>
                  <em>среднее за период</em>
                </div>
                <div>
                  <span>ДАД (нижнее)</span>
                  <strong>81</strong>
                  <em>среднее за период</em>
                </div>
              </div>
              {/* Имитация графика с точками и линией тренда */}
              <div style={{ position: 'relative', height: '120px', marginTop: '20px', display: 'flex', alignItems: 'flex-end', gap: '8px', paddingBottom: '20px', borderBottom: '1px solid var(--g-color-line-generic)' }}>
                 <div style={{ position: 'absolute', top: '20%', left: 0, right: 0, borderTop: '2px dashed var(--g-color-line-warning)', opacity: 0.5 }}></div>
                 <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, borderTop: '2px dashed var(--g-color-line-success)', opacity: 0.5 }}></div>
                 {[60, 45, 70, 55, 80, 65, 75].map((val, i) => (
                   <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                     <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--g-color-base-brand)', marginBottom: `${val}px` }}></div>
                     <span style={{ fontSize: '12px', color: 'var(--g-color-text-secondary)' }}>Д{i+1}</span>
                   </div>
                 ))}
              </div>
            </div>
          </AnimatedContent>
        </div>
      </section>

      {/* ─── SECTION 3: MATH FORMULAS (KATEX) ──────────────────── */}
      <section className="section container" id="math">
        <AnimatedContent distance={60} direction="vertical" duration={0.7} delay={0.1}>
          <div className="section-heading">
            <span className="eyebrow">Математика процесса</span>
            <h2>
              Формулы расчёта <span>показателей</span>
            </h2>
            <p>
              Все расчётные метрики дэшборда и PDF-отчёта воспроизводимы и строятся по прозрачным математическим
              формулам.
            </p>
          </div>
        </AnimatedContent>

        <AnimatedContent distance={50} direction="vertical" duration={0.6} delay={0.15} stagger={0.08}>
          <div
            className="audience-grid"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}
          >
            {MATH_BLOCKS.map((item) => (
              <Card key={item.title} style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ marginTop: 0, marginBottom: '4px', color: 'var(--g-color-text-brand)' }}>{item.title}</h3>
                <MathFormula math={item.formula} block />
                <p style={{ margin: '4px 0 0', lineHeight: 1.55, color: 'var(--g-color-text-secondary)' }}>
                  {item.description}
                </p>
              </Card>
            ))}
          </div>
        </AnimatedContent>
      </section>

      {/* ─── SECTION 4: CHARTS & PDF EXPORT ────────────────────── */}
      <section className="section container" id="charts">
        <AnimatedContent distance={60} direction="vertical" duration={0.7} delay={0.1}>
          <div className="section-heading">
            <span className="eyebrow">Визуализация и отчётность</span>
            <h2>
              Графики дэшборда и <span>выгрузка PDF</span>
            </h2>
            <p>Каждый график отвечает на конкретный вопрос о динамике давления и не перегружает соседние панели.</p>
          </div>
        </AnimatedContent>

        <AnimatedContent distance={50} direction="vertical" duration={0.6} delay={0.15} stagger={0.08}>
          <div
            className="audience-grid"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}
          >
            {DASHBOARD_CHARTS.map((chart) => (
              <Card key={chart.title} style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icon data={chart.tag === 'Отчёт' ? BookOpen : chart.tag === 'MVP' ? ChartLine : Heart} size={18} />
                    {chart.title}
                  </h3>
                  <Label theme={chart.tag === 'MVP' ? 'info' : chart.tag === 'Отчёт' ? 'success' : 'normal'}>
                    {chart.tag}
                  </Label>
                </div>
                <p style={{ margin: 0, lineHeight: 1.55, color: 'var(--g-color-text-secondary)' }}>
                  {chart.description}
                </p>
              </Card>
            ))}
          </div>
        </AnimatedContent>
      </section>

      {/* ─── SECTION 5: FULL GLOSSARY ──────────────────────────── */}
      <section className="section container" id="glossary">
        <AnimatedContent distance={60} direction="vertical" duration={0.7} delay={0.1}>
          <div className="section-heading centered">
            <span className="eyebrow">Терминология</span>
            <h2>
              Глоссарий <span>пациента</span>
            </h2>
            <p>
              Полный словарь всех {GLOSSARY_ITEMS.length} терминов, метрик и клинических понятий, используемых в
              методике и интерфейсе.
            </p>
          </div>
        </AnimatedContent>

        <div style={{ maxWidth: '480px', margin: '0 auto 28px' }}>
          <TextInput
            size="l"
            hasClear
            value={glossaryQuery}
            onUpdate={setGlossaryQuery}
            placeholder="Поиск по термину, синониму или описанию..."
            startContent={<Icon data={Magnifier} size={16} style={{ marginLeft: '10px', color: 'var(--g-color-text-secondary)' }} />}
          />
        </div>

        <AnimatedContent distance={40} direction="vertical" duration={0.6} delay={0.1}>
          <div
            className="audience-grid"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '20px' }}
          >
            {filteredGlossary.map((item) => (
              <Card key={item.term} style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <h3 style={{ margin: 0, color: 'var(--g-color-text-brand)' }}>{item.term}</h3>
                  {item.synonym && (
                    <div
                      style={{
                        fontSize: '13px',
                        color: 'var(--g-color-text-secondary)',
                        marginTop: '4px',
                        fontWeight: 500,
                      }}
                    >
                      {item.synonym}
                    </div>
                  )}
                </div>

                {item.formula && <MathFormula math={item.formula} block />}

                <p style={{ margin: 0, lineHeight: 1.55 }}>{item.description}</p>
              </Card>
            ))}
          </div>

          {filteredGlossary.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--g-color-text-secondary)' }}>
              По запросу «{glossaryQuery}» термины не найдены.
            </div>
          )}
        </AnimatedContent>
      </section>

      {/* ─── SECTION 6: CLINICAL SOURCES ───────────────────────── */}
      <section className="section container" id="sources">
        <AnimatedContent distance={60} direction="vertical" duration={0.7} delay={0.1}>
          <div className="section-heading">
            <span className="eyebrow">Доказательная база</span>
            <h2>
              Источники клинических <span>рекомендаций</span>
            </h2>
            <p>
              Методика самоконтроля и референсные пороги адаптированы на основе актуальных международных и российских
              рекомендаций.
            </p>
          </div>
        </AnimatedContent>

        <AnimatedContent distance={40} direction="vertical" duration={0.6} delay={0.15}>
          <Card style={{ padding: '28px' }}>
            <ol style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {CLINICAL_SOURCES.map((source) => (
                <li key={source.name} style={{ lineHeight: 1.55 }}>
                  <b>{source.name}</b> — {source.detail}
                </li>
              ))}
            </ol>
            <div
              style={{
                marginTop: '20px',
                paddingTop: '16px',
                borderTop: '1px solid var(--g-color-line-generic)',
                fontSize: '13px',
                color: 'var(--g-color-text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Icon data={Calendar} size={16} />
              <span>
                Ограничение выводов: рекомендации описывают диагностику и контроль терапии под наблюдением врача; любые
                клинические решения остаются в зоне ответственности лечащего врача.
              </span>
            </div>
          </Card>
        </AnimatedContent>
      </section>

      {/* ─── BOTTOM CTA ─────────────────────────────────────────── */}
      <AnimatedContent distance={50} direction="vertical" duration={0.6} delay={0.1}>
        <section className="bottom-cta container" style={{ paddingBottom: '80px' }}>
          <h2>
            Готовы начать вести <span>дневник?</span>
          </h2>
          <p style={{ marginBottom: '24px', color: 'var(--g-color-text-secondary)' }}>
            Все ваши данные будут структурированы и готовы к передаче врачу.
          </p>
          <Magnet
            padding={25}
            magnetStrength={5}
            tilt={6}
            spring={{
              stiffness: 100,
              damping: 30,
              mass: 1,
            }}
            scale={1}
            axis="both"
            disabled={false}
            exclusive={true}
          >
            <Button view="action" size="xl" onClick={() => navigate('/register')}>
              Создать бесплатный аккаунт
            </Button>
          </Magnet>
        </section>
      </AnimatedContent>
    </div>
  );
}