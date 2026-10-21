import { WINDS, type Wind, type WindDraw } from '../models/types';

/** 暫定座位，從擲骰者起逆時針。 */
export const SEAT_ROLES = ['擲骰者', '下家', '對家', '上家'] as const;

export function shuffleWinds(random: () => number = Math.random): Wind[] {
  const winds: Wind[] = [...WINDS];
  for (let i = winds.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const swap = winds[i];
    winds[i] = winds[j];
    winds[j] = swap;
  }
  return winds;
}

/** 三顆骰合計 3–18。從擲骰者算 1，逆時針：(合計 - 1) % 4。 */
export function startSeatIndex(sum: number): number | null {
  if (!Number.isInteger(sum) || sum < 3 || sum > 18) return null;
  return (sum - 1) % 4;
}

function isWind(value: string): value is Wind {
  return (WINDS as readonly string[]).includes(value);
}

/** 四人都在這一趟、四風各一、骰面合法才留下。 */
export function normalizeWindDraw(
  draw: WindDraw,
  memberIds: readonly string[],
): WindDraw | null {
  const members = new Set(memberIds);
  if (draw.order.length !== 4 || new Set(draw.order).size !== 4) return null;
  if (!draw.order.every((id) => members.has(id))) return null;

  const [a, b, c] = draw.dice;
  if (![a, b, c].every((n) => Number.isInteger(n) && n >= 1 && n <= 6)) return null;
  if (startSeatIndex(a + b + c) === null) return null;

  if (draw.seats.length !== 4) return null;
  if (!draw.seats.every((s) => isWind(s.wind))) return null;
  if (new Set(draw.seats.map((s) => s.wind)).size !== 4) return null;

  const ids = draw.seats.map((s) => s.personId);
  if (new Set(ids).size !== 4) return null;
  const orderSet = new Set(draw.order);
  if (!ids.every((id) => orderSet.has(id))) return null;

  return {
    order: [...draw.order],
    dice: [a, b, c],
    seats: draw.seats.map((s) => ({ personId: s.personId, wind: s.wind })),
  };
}

export function eastPersonId(draw: WindDraw): string | undefined {
  return draw.seats.find((s) => s.wind === '東')?.personId;
}

/** 從東開始，沿逆時針：東、南、西、北各是誰。 */
export function windCycle(seats: WindDraw['seats']): string[] | null {
  const ids = WINDS.map((wind) => seats.find((s) => s.wind === wind)?.personId);
  if (ids.some((id) => !id)) return null;
  return ids as string[];
}

/** 兩組都是逆時針座位，只是起點不同就算同一順序。鏡像不算。 */
export function sameSeatOrder(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== 4 || b.length !== 4) return false;
  if (new Set(a).size !== 4 || new Set(b).size !== 4) return false;
  const ring = `${a.join('\0')}\0${a.join('\0')}`;
  return ring.includes(b.join('\0'));
}

/** 手機平放：0 下、1 右、2 上、3 左。start 是東風位在哪一邊。 */
export function chairWind(start: number, chair: number): Wind | null {
  if (!Number.isInteger(start) || !Number.isInteger(chair)) return null;
  if (start < 0 || start > 3 || chair < 0 || chair > 3) return null;
  return WINDS[(chair - start + 4) % 4];
}
