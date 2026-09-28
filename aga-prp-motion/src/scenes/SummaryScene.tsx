import React from 'react';
import {SceneFrame} from '../components/SceneFrame';
import {Bullets} from '../components/Bullets';
import {Reveal} from '../components/Reveal';
import {colors} from '../theme';

export const SummaryScene: React.FC<{index: number; total: number}> = ({index, total}) => {
  return (
    <SceneFrame index={index} total={total} kicker="Итог" title="Что важно помнить" accent={colors.teal}>
      <div style={{display: 'flex', gap: 60, height: '100%'}}>
        <div style={{flex: 1}}>
          <Bullets
            marker="check"
            start={10}
            step={26}
            fontSize={27}
            gap={24}
            accent={colors.teal}
            items={[
              {
                text: 'АГА — полигенная, DHT‑зависимая прогрессирующая миниатюризация',
                sub: 'Фолликулы сохраняются до поздних стадий → терапевтическое окно',
              },
              {
                text: 'Основа лечения: финастерид / дутастерид + миноксидил',
                sub: 'Уровень A; трансплантация — на фоне медикаментозной стабилизации',
              },
              {
                text: 'PRP: факторы роста → дермальный сосочек, Wnt/β‑catenin, ангиогенез',
                sub: 'Механизм подтверждён преимущественно преклинически; причину (DHT) не устраняет',
              },
              {
                text: 'Эффект умеренный: ≈ +15…+30 волос/см² и ↑ диаметра',
                sub: 'GRADE низкий–умеренный; протоколы не стандартизированы',
              },
              {
                text: 'Практика: 3 сеанса с интервалом 4 нед → поддержка каждые 3–6 мес',
                sub: 'Трихоскопический контроль; отбор пациентов с ранними стадиями и реалистичными ожиданиями',
              },
              {
                text: 'Роль PRP — адъювант, не замена базовой терапии',
                color: colors.amber,
              },
            ]}
          />
        </div>
        <Reveal delay={150} from="scale" style={{flex: 'none', width: 520, display: 'flex', alignItems: 'center'}}>
          <div
            style={{
              width: '100%',
              padding: 34,
              borderRadius: 24,
              background: `linear-gradient(180deg, ${colors.teal}22, ${colors.blue}12)`,
              border: `1.5px solid ${colors.teal}`,
            }}
          >
            <div style={{fontSize: 22, color: colors.muted, letterSpacing: 3, textTransform: 'uppercase', fontWeight: 600}}>
              Формула
            </div>
            <div style={{fontSize: 40, fontWeight: 800, marginTop: 14, lineHeight: 1.2}}>
              Базовая терапия
              <span style={{color: colors.teal}}> + PRP</span>
            </div>
            <div style={{fontSize: 22, color: colors.text, marginTop: 14, lineHeight: 1.4}}>
              стабилизация + умеренное уплотнение, а не восстановление при Norwood VI–VII
            </div>
            <div style={{fontSize: 16, color: colors.dim, marginTop: 26, lineHeight: 1.45}}>
              Ключевые источники: Giordano 2017 · Gupta 2019 · Mao 2019 · Evans 2020 · Kanti 2018 (S3) · Gentile 2015 ·
              Garza 2011 · Kaufman 2002
            </div>
          </div>
        </Reveal>
      </div>
    </SceneFrame>
  );
};
