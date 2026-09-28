import React from 'react';
import {SceneFrame} from '../components/SceneFrame';
import {Reveal} from '../components/Reveal';
import {Badge} from '../components/Badge';
import {Card} from '../components/Card';
import {colors} from '../theme';

type Item = {text: string; tag?: string; tagColor?: string};

const adverse: Item[] = [
  {text: 'Боль / жжение во время инъекций', tag: 'очень часто, транзиторно', tagColor: colors.amber},
  {text: 'Эритема, отёк, точечные кровоизлияния', tag: 'часто, 1–3 дня', tagColor: colors.amber},
  {text: 'Головная боль, зуд, чувство стягивания', tag: 'нечасто', tagColor: colors.blue},
  {text: 'Инфекция, гематома', tag: 'редко при асептике', tagColor: colors.blue},
  {text: 'Аллергия / иммуногенность', tag: 'не характерно — аутологичный препарат', tagColor: colors.green},
];

const absolute: Item[] = [
  {text: 'Тромбоцитопения (< 100–150 × 10⁹/л) или дисфункция тромбоцитов'},
  {text: 'Сепсис, активная инфекция кожи скальпа'},
  {text: 'Гемобластозы; активное злокачественное новообразование'},
  {text: 'Гемодинамическая нестабильность, тяжёлая анемия'},
];

const relative: Item[] = [
  {text: 'Антикоагулянты, двойная антиагрегантная терапия'},
  {text: 'Декомпенсированные заболевания печени, хроническая почечная недостаточность'},
  {text: 'Беременность, лактация — данных нет'},
  {text: 'НПВС в последние 5–7 дней (снижение функции тромбоцитов)'},
  {text: 'Рубцовые алопеции — не показание; курение — вероятное ↓ ответа'},
];

const List: React.FC<{items: Item[]; start: number; color: string}> = ({items, start, color}) => (
  <div style={{display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14}}>
    {items.map((it, i) => (
      <Reveal key={it.text} delay={start + i * 12} from="left">
        <div style={{display: 'flex', gap: 12, alignItems: 'flex-start'}}>
          <div style={{width: 10, height: 10, borderRadius: 5, background: color, marginTop: 10, flex: 'none'}} />
          <div style={{flex: 1}}>
            <div style={{fontSize: 21, lineHeight: 1.3}}>{it.text}</div>
            {it.tag ? (
              <div style={{fontSize: 16, color: it.tagColor ?? colors.muted, marginTop: 3, fontWeight: 600}}>{it.tag}</div>
            ) : null}
          </div>
        </div>
      </Reveal>
    ))}
  </div>
);

export const SafetyScene: React.FC<{index: number; total: number}> = ({index, total}) => {
  return (
    <SceneFrame index={index} total={total} kicker="Часть 8 · Безопасность" title="Нежелательные явления и противопоказания" accent={colors.amber}>
      <div style={{display: 'flex', gap: 24, height: '100%'}}>
        <Reveal delay={6} style={{flex: 1}}>
          <Card accent={colors.green} style={{height: 560}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
              <div style={{fontSize: 27, fontWeight: 800}}>Нежелательные явления</div>
              <Badge kind="clinical" size={14} />
            </div>
            <List items={adverse} start={20} color={colors.green} />
            <Reveal delay={100}>
              <div style={{marginTop: 24, fontSize: 18, color: colors.muted, lineHeight: 1.35}}>
                Серьёзные НЯ при PRP по поводу АГА в литературе — единичные описания. Профиль безопасности благоприятный
                при соблюдении асептики и закрытых систем приготовления.
              </div>
            </Reveal>
          </Card>
        </Reveal>
        <Reveal delay={40} style={{flex: 1}}>
          <Card accent={colors.red} style={{height: 560}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
              <div style={{fontSize: 27, fontWeight: 800}}>Абсолютные противопоказания</div>
              <Badge kind="expert" size={14} />
            </div>
            <List items={absolute} start={60} color={colors.red} />
            <Reveal delay={130}>
              <div style={{marginTop: 22, fontSize: 17, color: colors.muted, lineHeight: 1.35}}>
                Пороговые значения тромбоцитов — экспертные; единых регуляторных критериев нет.
              </div>
            </Reveal>
          </Card>
        </Reveal>
        <Reveal delay={70} style={{flex: 1}}>
          <Card accent={colors.amber} style={{height: 560}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
              <div style={{fontSize: 27, fontWeight: 800}}>Относительные</div>
              <Badge kind="expert" size={14} />
            </div>
            <List items={relative} start={100} color={colors.amber} />
          </Card>
        </Reveal>
      </div>
    </SceneFrame>
  );
};
