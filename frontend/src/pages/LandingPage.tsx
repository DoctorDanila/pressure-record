import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Icon } from '@gravity-ui/uikit';
import { Link, useNavigate } from 'react-router-dom';
import {
  Pulse,
  CircleInfo,
  Microscope,
  Magnifier,
  Heart,
  ThumbsUpFill,
  HandOk,
  Rocket,
  ArrowDown,
  ChartMixed,
  ChartPie,
  Route,
} from '@gravity-ui/icons';

// React Bits + GSAP-анимации
import SplitText from '@/components/react-bits/SplitText';
import AnimatedContent from '@/components/react-bits/AnimatedContent';
import Magnet from '@/components/react-bits/Magnet';

const deadline = new Date(
  import.meta.env.VITE_EARLY_ACCESS_DEADLINE || '2027-05-23T23:59:59+03:00'
).getTime();

export default function LandingPage() {
  const navigate = useNavigate();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const countdown = useMemo(() => {
    const left = Math.max(0, deadline - now);
    return {
      days: Math.floor(left / 86_400_000),
      hours: Math.floor((left % 86_400_000) / 3_600_000),
      minutes: Math.floor((left % 3_600_000) / 60_000),
      seconds: Math.floor((left % 60_000) / 1000),
      expired: left === 0,
    };
  }, [now]);

  return (
    <div className="landing-page">
      {/* ─── HERO ──────────────────────────────────────────────── */}
      <section className="hero-section container">
        <AnimatedContent
          distance={80}
          direction="vertical"
          duration={0.9}
          delay={0.1}
          ease="power3.out"
        >
          <div className="hero-copy">
            <h1>
              <SplitText
                text="Cтатистика давления"
                tag="span"
                className="hero-title-line"
                effect="rise"
                splitType="chars"
                delay={40}
                duration={0.7}
                trigger="load"
                textAlign="left"
              />
              <br />
              <SplitText
                text="которую видно"
                tag="span"
                className="hero-title-line text-brand"
                effect="rise"
                splitType="chars"
                delay={90}
                duration={0.7}
                trigger="load"
                textAlign="left"
              />
            </h1>

            <SplitText
              text="Pressure Record помогает аккуратно собирать измерения, видеть изменения во времени и делиться понятной историей наблюдений с врачом"
              tag="p"
              className="hero-lead"
              effect="fade"
              splitType="words"
              delay={20}
              duration={0.6}
              trigger="load"
              textAlign="left"
            />

            <div className="hero-actions">
              <Magnet
                padding={25}
                magnetStrength={5}
                tilt={6}
                spring={{
                  stiffness: 100,
                  damping: 30,
                  mass: 1
                }}
                scale={1}
                axis="both"
                disabled={false}
                exclusive={true}
              >
                <Button
                  view="action"
                  size="xl"
                  onClick={() => navigate('/register')}
                >
                  Начать бесплатно
                  <Icon data={Rocket} size={16} />
                </Button>
              </Magnet>

              <Magnet
                padding={25}
                magnetStrength={5}
                tilt={6}
                spring={{
                  stiffness: 100,
                  damping: 30,
                  mass: 1
                }}
                scale={1}
                axis="both"
                disabled={false}
                exclusive={true}
              >
                <a className="text-link flex" href="#method">
                  Как это работает
                  <span className="text-brand">
                    <Icon data={ArrowDown} size={16} />
                  </span>
                </a>
              </Magnet>
            </div>

            <div className="hero-note">
              <span className="note-icon">
                <Icon data={HandOk} />
              </span>{' '}
              Регистрация сейчас закрепит бесплатный доступ на всё время
            </div>
          </div>
        </AnimatedContent>

        <AnimatedContent
          distance={100}
          direction="vertical"
          duration={1}
          delay={0.25}
          ease="power3.out"
        >
          <div
            className="hero-visual"
            aria-label="Иллюстрация графика измерений давления"
          >
            <div className="visual-orbit orbit-one" />
            <div className="visual-orbit orbit-two" />

            <Card className="mock-card">
              <div className="mock-top">
                <span>Последние измерения</span>
                <span className="mock-period">7 дней</span>
              </div>
              <div className="mock-reading">
                <strong>
                  126<span>/</span>81
                </strong>
                <i>Всё в порядке</i>
              </div>
              <div className="mock-chart">
                {[44, 55, 48, 67, 59, 72, 64, 78, 68, 84, 75, 88].map(
                  (height, index) => (
                    <span key={index} style={{ height: `${height}%` }} />
                  )
                )}
              </div>
              <div className="mock-legend">
                <span>
                  <i className="legend-blue" /> САД
                </span>
                <span>
                  <i className="legend-green" /> ДАД
                </span>
              </div>
            </Card>
          </div>
        </AnimatedContent>
      </section>

      {/* ─── TRUST STRIP ────────────────────────────────────────── */}
      <section className="trust-strip">
        <AnimatedContent
          distance={40}
          direction="vertical"
          duration={0.6}
          delay={0.1}
          stagger={0.08}
          once={false}
        >
          <div className="container trust-grid">
            <div>
              <strong>2–3</strong>
              <span>замера в серии</span>
            </div>
            <div>
              <strong>7 дней</strong>
              <span>окно скользящего среднего</span>
            </div>
            <div>
              <strong>100%</strong>
              <span>исходных измерений сохраняется</span>
            </div>
            <div>
              <strong>CSV/PDF</strong>
              <span>данные для обсуждения с врачом</span>
            </div>
          </div>
        </AnimatedContent>
      </section>

      {/* ─── METHOD ─────────────────────────────────────────────── */}
      <section className="section container" id="method">
        <AnimatedContent
          distance={60}
          direction="vertical"
          duration={0.7}
          delay={0.1}
        >
          <div className="section-heading">
            <span className="eyebrow">Понятная методика</span>
            <h2>
              Не просто записывать цифры
              <br />
              <span>Понимать, что происходит</span>
            </h2>
            <p>
              Один случайный замер мало что рассказывает
              <br />
              Мы сохраняем серию показаний и анализируем её в контексте
              времени, самочувствия и выбранных порогов
            </p>
          </div>
        </AnimatedContent>

        <AnimatedContent
          distance={50}
          direction="vertical"
          duration={0.6}
          delay={0.2}
          stagger={0.12}
        >
          <div className="method-grid">
            <Card className="method-card">
              <div className="method-number">01</div>
              <div className="method-icon icon-blue">
                <Icon data={Route} />
              </div>
              <h3>Измеряйте последовательно</h3>
              <p>
                Утром, днём или вечером
                <br />
                После пяти минут покоя, сидя, с интервалом 1–2 минуты между
                показаниями
              </p>
            </Card>
            <Card className="method-card">
              <div className="method-number">02</div>
              <div className="method-icon icon-green">
                <Icon data={ChartPie} />
              </div>
              <h3>Смотрите на серию</h3>
              <p>
                Два показания — основа
                <br />
                Если первые результаты сильно отличаются добавляем третье
              </p>
            </Card>
            <Card className="method-card">
              <div className="method-number">03</div>
              <div className="method-icon icon-violet">
                <Icon data={ChartMixed} />
              </div>
              <h3>Обсуждайте динамику</h3>
              <p>
                Средние значения, вариабельность, тренд и исходные показания
                складываются в отчёт для врача
              </p>
            </Card>
          </div>
        </AnimatedContent>

        <p className="method-footnote">
          Методика сервиса — инструмент самоконтроля
          <br />
          Пороговые значения можно настроить совместно с лечащим врачом
        </p>
      </section>

      {/* ─── FEATURE ────────────────────────────────────────────── */}
      <section className="section feature-section">
        <div className="container feature-layout">
          <AnimatedContent
            distance={70}
            direction="vertical"
            duration={0.8}
            delay={0.1}
          >
            <div>
              <span className="eyebrow">Всё в одном месте</span>
              <h2>
                История, которую удобно <span>показывать врачу</span>
              </h2>
              <p>
                Вместо разрозненных заметок — понятная структура: серии,
                симптомы, прибор и конфигурация порогов, по которым
                рассчитана аналитика
              </p>
              <ul className="feature-list">
                <li>
                  <span>
                    <Icon data={ThumbsUpFill} />
                  </span>{' '}
                  Графики САД и ДАД со скользящим средним за 7 дней
                </li>
                <li>
                  <span>
                    <Icon data={ThumbsUpFill} />
                  </span>{' '}
                  Категории по неделям и календарь измерений
                </li>
                <li>
                  <span>
                    <Icon data={ThumbsUpFill} />
                  </span>{' '}
                  Отдельная отметка внеплановых измерений
                </li>
                <li>
                  <span>
                    <Icon data={ThumbsUpFill} />
                  </span>{' '}
                  Выгрузка исходных данных и параметров методики
                </li>
              </ul>
              <Button
                view="action"
                size="xl"
                onClick={() => navigate('/register')}
              >
                Попробовать сервис
              </Button>
            </div>
          </AnimatedContent>

          <AnimatedContent
            distance={90}
            direction="horizontal"
            duration={0.9}
            delay={0.2}
          >
            <div className="feature-visual">
              <div className="feature-topline">
                <span>Ваши наблюдения</span>
                <span>Пример данных</span>
              </div>
              <div className="feature-stats">
                <div>
                  <span>Среднее САД</span>
                  <strong>128</strong>
                  <em>за выбранный период</em>
                </div>
                <div>
                  <span>В целевых значениях</span>
                  <strong>
                    76<small>%</small>
                  </strong>
                  <em>плановых серий</em>
                </div>
              </div>
              <div className="feature-bars">
                {[55, 70, 49, 82, 62, 74, 58, 88, 68, 76, 61, 83].map(
                  (value, index) => (
                    <span key={index} style={{ height: `${value}%` }} />
                  )
                )}
              </div>
              <div className="feature-axis">
                <span>Пн</span>
                <span>Вт</span>
                <span>Ср</span>
                <span>Чт</span>
                <span>Пт</span>
                <span>Сб</span>
                <span>Вс</span>
              </div>
              <div className="feature-disclaimer">
                Демонстрационные значения — не медицинская оценка
              </div>
            </div>
          </AnimatedContent>
        </div>
      </section>

      {/* ─── AUDIENCE ───────────────────────────────────────────── */}
      <section className="section container audience-section">
        <AnimatedContent
          distance={60}
          direction="vertical"
          duration={0.7}
          delay={0.1}
        >
          <div className="section-heading centered">
            <span className="eyebrow">Кому подойдёт</span>
            <h2>
              Для тех, кто хочет наблюдать <span>осознанно</span>
            </h2>
          </div>
        </AnimatedContent>

        <AnimatedContent
          distance={50}
          direction="vertical"
          duration={0.6}
          delay={0.2}
          stagger={0.12}
        >
          <div className="audience-grid">
            <div>
              <span className="audience-icon">
                <Icon data={Heart} />
              </span>
              <h3>Людям, ведущим СКАД</h3>
              <p>
                Кто измеряет давление дома и хочет не терять историю
                наблюдений
              </p>
            </div>
            <div>
              <span className="audience-icon">
                <Icon data={Magnifier} />
              </span>
              <h3>Тем, кто готовится к приёму</h3>
              <p>
                Кто хочет принести врачу полную картину, а не вспоминать
                цифры по памяти
              </p>
            </div>
            <div>
              <span className="audience-icon">
                <Icon data={Microscope} />
              </span>
              <h3>Врачам и близким</h3>
              <p>
                Кому важно видеть исходные показания и понимать, как
                получились сводные числа
              </p>
            </div>
          </div>
        </AnimatedContent>
      </section>

      {/* ─── EARLY ACCESS ───────────────────────────────────────── */}
      <section className="early-access-section">
        <div className="container early-access-content">
          <AnimatedContent
            distance={70}
            direction="vertical"
            duration={0.8}
            delay={0.1}
          >
            <div>
              <span className="eyebrow eyebrow-light">Ранний доступ</span>
              <h2>
                Сейчас — бесплатно
                <br />
                <span>И это можно закрепить</span>
              </h2>
              <p className='py-3'>
                Поддержите развитие проекта ранней регистрацией: в будущем
                сервис станет платным для новых пользователей, а аккаунты,
                созданные до окончания раннего доступа, сохранят бесплатный
                тариф
              </p>
              <Magnet
                padding={25}
                magnetStrength={5}
                tilt={6}
                spring={{
                  stiffness: 100,
                  damping: 30,
                  mass: 1
                }}
                scale={1}
                axis="both"
                disabled={false}
              >
                <Button
                  view="action"
                  size="xl"
                  onClick={() => navigate('/register')}
                >
                  Зарегистрироваться сейчас
                  <Icon data={Rocket} size={16} />
                </Button>
              </Magnet>
            </div>
          </AnimatedContent>

          <AnimatedContent
            distance={80}
            direction="vertical"
            duration={0.8}
            delay={0.25}
          >
            <div className="countdown-card">
              <span className="countdown-caption">
                До завершения раннего доступа
              </span>
              {countdown.expired ? (
                <strong className="expired-text">Период завершён</strong>
              ) : (
                <div className="countdown-grid">
                  <div>
                    <strong>{String(countdown.days).padStart(3, '0')}</strong>
                    <span>дней</span>
                  </div>
                  <div>
                    <strong>{String(countdown.hours).padStart(2, '0')}</strong>
                    <span>часов</span>
                  </div>
                  <div>
                    <strong>
                      {String(countdown.minutes).padStart(2, '0')}
                    </strong>
                    <span>минут</span>
                  </div>
                  <div>
                    <strong>
                      {String(countdown.seconds).padStart(2, '0')}
                    </strong>
                    <span>секунд</span>
                  </div>
                </div>
              )}
              <p>
                Успейте зарегистрироваться, чтобы сохранить бесплатный доступ
                <br />
                Дата окончания:{' '}
                {new Date(deadline).toLocaleDateString('ru-RU')}
              </p>
            </div>
          </AnimatedContent>
        </div>
      </section>

      {/* ─── DISCLAIMER ─────────────────────────────────────────── */}
      <AnimatedContent
        distance={30}
        direction="vertical"
        duration={0.5}
        delay={0.1}
      >
        <section className="disclaimer-section container">
          <Icon data={CircleInfo} size={20} />
          <div>
            <strong>Важно о назначении сервиса</strong>
            <p>
              Pressure Record не ставит диагнозов, не назначает лечение и не
              заменяет консультацию врача
              <br />
              Самостоятельная коррекция терапии по данным дневника
              недопустима! Индивидуальные пороги согласуйте с лечащим врачом
            </p>
          </div>
        </section>
      </AnimatedContent>

      {/* ─── BOTTOM CTA ─────────────────────────────────────────── */}
      <AnimatedContent
        distance={50}
        direction="vertical"
        duration={0.6}
        delay={0.1}
      >
        <section className="bottom-cta container">
          <h2>
            Начните собирать историю <span>сегодня</span>
          </h2>
          <Magnet
            padding={25}
            magnetStrength={5}
            tilt={6}
            spring={{
              stiffness: 100,
              damping: 30,
              mass: 1
            }}
            scale={1}
            axis="both"
            disabled={false}
          >
            <Button
              view="action"
              size="xl"
              onClick={() => navigate('/register')}
            >
              Создать бесплатный аккаунт
            </Button>
          </Magnet>
        </section>
      </AnimatedContent>
    </div>
  );
}