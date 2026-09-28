import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {SceneFrame} from '../components/SceneFrame';
import {Reveal} from '../components/Reveal';
import {Badge} from '../components/Badge';
import {Card} from '../components/Card';
import {BadgeKind, colors} from '../theme';

type Therapy = {
  name: string;
  dose: string;
  mech: string;
  note: string;
  badges: BadgeKind[];
  dht?: number; // % DHT reduction to visualise
  color: string;
};

const therapies: Therapy[] = [
  {
    name: 'Финастерид',
    dose: '1 мг/сут per os',
    mech: 'Ингибитор 5α-редуктазы II → ↓ DHT в скальпе ≈ 60–70%',
    note: '5 лет: стабилизация ≈ 90%, видимый прирост ≈ 2/3 (Kaufman 2002). У женщин — off-label, только с контрацепцией',
    badges: ['A'],
    dht: 65,
    color: colors.green,
  },
  {
    name: 'Миноксидил местно',
    dose: '5% раствор / пена, 1–2 р/сут',
    mech: 'Пролекарство (SULT1A1 фолликула) → открытие K‑ATP‑каналов, ↑ VEGF, ↑ PGE₂, пролонгация анагена',
    note: 'Одобрен для мужчин и женщин. Эффект — через 4–6 мес, требует постоянного применения',
    badges: ['A'],
    color: colors.green,
  },
  {
    name: 'Дутастерид',
    dose: '0,5 мг/сут per os',
    mech: 'Ингибитор 5αR I + II → ↓ DHT ≈ 90%',
    note: 'Эффективнее финастерида в РКИ (Gubelin Harcha 2014). Зарегистрирован при АГА в Японии и Ю. Корее',
    badges: ['A', 'offlabel'],
    dht: 90,
    color: colors.blue,
  },
  {
    name: 'Миноксидил per os',
    dose: '0,25–5 мг/сут',
    mech: 'Системный вазодилататор, тот же фолликулярный механизм; не зависит от SULT1A1',
    note: 'Растущая база: ретроспективные серии + малые РКИ. Побочные: гипертрихоз, отёки, тахикардия',
    badges: ['B', 'offlabel'],
    color: colors.amber,
  },
  {
    name: 'Трансплантация',
    dose: 'FUE / FUT',
    mech: 'Перенос андроген‑независимых окципитальных фолликулов',
    note: 'На фоне медикаментозной стабилизации; не останавливает прогрессирование в нативных зонах',
    badges: ['expert'],
    color: colors.violet,
  },
  {
    name: 'LLLT',
    dose: '650–680 нм, 3 р/нед',
    mech: 'Фотобиомодуляция; предполагаемо — ↑ митохондриальной активности, ↑ анагена',
    note: 'FDA‑cleared устройства; умеренный эффект в РКИ, высокая гетерогенность приборов',
    badges: ['B'],
    color: colors.teal,
  },
];

const DhtBar: React.FC<{value: number; delay: number}> = ({value, delay}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: frame - delay, fps, config: {damping: 200}, durationInFrames: 40});
  const w = interpolate(p, [0, 1], [100, 100 - value]);
  return (
    <div style={{marginTop: 12}}>
      <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 16, color: colors.muted}}>
        <span>DHT в скальпе</span>
        <span style={{color: colors.amber, fontWeight: 700}}>−{Math.round(value * p)}%</span>
      </div>
      <div style={{height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.08)', marginTop: 6, overflow: 'hidden'}}>
        <div style={{height: '100%', width: `${w}%`, background: colors.amber, borderRadius: 4}} />
      </div>
    </div>
  );
};

export const StandardTherapyScene: React.FC<{index: number; total: number}> = ({index, total}) => {
  return (
    <SceneFrame index={index} total={total} kicker="Часть 4 · Стандарт" title="Базовая терапия АГА" accent={colors.green}>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 22}}>
        {therapies.map((t, i) => (
          <Reveal key={t.name} delay={10 + i * 16} from="scale">
            <Card accent={t.color} style={{height: 292}} padding={22}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10}}>
                <div>
                  <div style={{fontSize: 28, fontWeight: 800}}>{t.name}</div>
                  <div style={{fontSize: 18, color: t.color, fontWeight: 600, marginTop: 2}}>{t.dose}</div>
                </div>
                <div style={{display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end'}}>
                  {t.badges.map((b) => (
                    <Badge key={b} kind={b} size={14} />
                  ))}
                </div>
              </div>
              <div style={{fontSize: 19, marginTop: 12, lineHeight: 1.35}}>{t.mech}</div>
              <div style={{fontSize: 17, color: colors.muted, marginTop: 10, lineHeight: 1.35}}>{t.note}</div>
              {t.dht ? <DhtBar value={t.dht} delay={40 + i * 16} /> : null}
            </Card>
          </Reveal>
        ))}
      </div>
      <Reveal delay={150}>
        <div
          style={{
            marginTop: 26,
            padding: '18px 26px',
            borderRadius: 16,
            background: `${colors.teal}14`,
            border: `1.5px solid ${colors.teal}`,
            display: 'flex',
            alignItems: 'center',
            gap: 20,
          }}
        >
          <Badge kind="expert" size={16} />
          <div style={{fontSize: 24, lineHeight: 1.3}}>
            <b style={{color: colors.teal}}>PRP — адъювант</b>, а не замена базовой терапии: в руководствах позиционируется как дополнительная опция
            при недостаточном ответе или непереносимости стандартных средств.
          </div>
        </div>
      </Reveal>
    </SceneFrame>
  );
};
