/**
 * État partagé entre la scène 3D et l'interface du hero :
 * value = 0 → tout en plan d'architecte, 1 → tout réalisé.
 * manual = true dès que le visiteur touche le curseur (l'animation automatique s'arrête).
 */
export const split = {
  value: 0,
  manual: false,
  introDone: false
};

export function setSplit(v: number) {
  split.value = Math.min(1, Math.max(0, v));
  split.manual = true;
}
