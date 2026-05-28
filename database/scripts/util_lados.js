/**
 * Invierte la dirección geográfica de un lado.
 * arriba↔abajo, izquierda↔derecha
 */
export function invertLado(lado) {
  if (!lado) return null;
  const inv = { arriba: 'abajo', abajo: 'arriba', izquierda: 'derecha', derecha: 'izquierda' };
  return inv[lado] || lado;
}

/**
 * Invierte el tipo de encaje de una pestaña.
 * saliente↔abertura, plano→plano
 */
export function invertEncaje(encaje) {
  if (encaje === 'saliente') return 'abertura';
  if (encaje === 'abertura') return 'saliente';
  return encaje ?? 'desconocido';
}
