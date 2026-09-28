export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const TRANSITION = 18;

export const SCENES = {
  title: 150,
  basics: 300,
  pathway: 390,
  miniaturization: 330,
  classification: 300,
  standard: 330,
  prpPrep: 330,
  prpMechanism: 360,
  protocol: 300,
  evidence: 390,
  safety: 300,
  summary: 300,
} as const;

export type SceneKey = keyof typeof SCENES;

export const SCENE_ORDER: SceneKey[] = [
  'title',
  'basics',
  'pathway',
  'miniaturization',
  'classification',
  'standard',
  'prpPrep',
  'prpMechanism',
  'protocol',
  'evidence',
  'safety',
  'summary',
];

export const TOTAL_DURATION =
  SCENE_ORDER.reduce((acc, key) => acc + SCENES[key], 0) -
  TRANSITION * (SCENE_ORDER.length - 1);
