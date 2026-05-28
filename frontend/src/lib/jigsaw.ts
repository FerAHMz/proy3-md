import type { Lado } from '../types';

// Path SVG de una pieza tipo jigsaw en coords locales (0,0)-(W,H).
// Los tabs (saliente) y slots (abertura) son curvas espejo, de modo que el
// saliente de una pieza encaja con la abertura de su vecina.

const TAB_RATIO = 0.22;
const NECK_RATIO = 0.32;
const CURVE_GAIN = 1.55;

type Sides = {
  arriba?: Lado;
  abajo?: Lado;
  izquierda?: Lado;
  derecha?: Lado;
};

function topSide(W: number, type: Lado): string {
  if (type !== 'saliente' && type !== 'abertura') return `l ${W} 0`;
  const dir = type === 'saliente' ? -1 : 1;
  const T = W * TAB_RATIO;
  const neck = W * NECK_RATIO;
  const tab = W - 2 * neck;
  return [
    `l ${neck} 0`,
    `c ${tab * 0.15} ${dir * T * CURVE_GAIN} ${tab * 0.85} ${dir * T * CURVE_GAIN} ${tab} 0`,
    `l ${neck} 0`,
  ].join(' ');
}

function rightSide(H: number, type: Lado): string {
  if (type !== 'saliente' && type !== 'abertura') return `l 0 ${H}`;
  const dir = type === 'saliente' ? 1 : -1;
  const T = H * TAB_RATIO;
  const neck = H * NECK_RATIO;
  const tab = H - 2 * neck;
  return [
    `l 0 ${neck}`,
    `c ${dir * T * CURVE_GAIN} ${tab * 0.15} ${dir * T * CURVE_GAIN} ${tab * 0.85} 0 ${tab}`,
    `l 0 ${neck}`,
  ].join(' ');
}

function bottomSide(W: number, type: Lado): string {
  if (type !== 'saliente' && type !== 'abertura') return `l ${-W} 0`;
  const dir = type === 'saliente' ? 1 : -1;
  const T = W * TAB_RATIO;
  const neck = W * NECK_RATIO;
  const tab = W - 2 * neck;
  return [
    `l ${-neck} 0`,
    `c ${-tab * 0.15} ${dir * T * CURVE_GAIN} ${-tab * 0.85} ${dir * T * CURVE_GAIN} ${-tab} 0`,
    `l ${-neck} 0`,
  ].join(' ');
}

function leftSide(H: number, type: Lado): string {
  if (type !== 'saliente' && type !== 'abertura') return `l 0 ${-H}`;
  const dir = type === 'saliente' ? -1 : 1;
  const T = H * TAB_RATIO;
  const neck = H * NECK_RATIO;
  const tab = H - 2 * neck;
  return [
    `l 0 ${-neck}`,
    `c ${dir * T * CURVE_GAIN} ${-tab * 0.15} ${dir * T * CURVE_GAIN} ${-tab * 0.85} 0 ${-tab}`,
    `l 0 ${-neck}`,
  ].join(' ');
}

export function jigsawPath(W: number, H: number, sides: Sides): string {
  return [
    'M 0 0',
    topSide(W, sides.arriba ?? null),
    rightSide(H, sides.derecha ?? null),
    bottomSide(W, sides.abajo ?? null),
    leftSide(H, sides.izquierda ?? null),
    'Z',
  ].join(' ');
}
