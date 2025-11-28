export function lerp(p1: number, p2: number, t: number): number {
  return p1 + (p2 - p1) * t;
}

export function map(
  num: number,
  min1: number,
  max1: number,
  min2: number,
  max2: number,
  round: boolean = false
): number {
  const num1 = (num - min1) / (max1 - min1);
  const num2 = num1 * (max2 - min2) + min2;

  if (round) return Math.round(num2);

  return num2;
}

export function random(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

