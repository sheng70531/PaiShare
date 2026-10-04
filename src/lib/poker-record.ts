import type { Person, Trip } from '../models/types';
import { ledgerLineNetCents } from './settlement';

export type PokerSummary = {
  personId: string;
  name: string;
  sessions: number;
  wins: number;
  losses: number;
  pushes: number;
  net: number;
  best: number;
  worst: number;
};

/** One ledger expense is one session. Grouped by person id, not by display name. */
export function summarizePoker(trips: Trip[], roster: Person[]): PokerSummary[] {
  const rosterName = new Map(roster.map((p) => [p.id, p.name]));
  const byId = new Map<string, { name: string; nets: number[] }>();

  for (const trip of trips) {
    const tripName = new Map(trip.people.map((p) => [p.id, p.name]));
    for (const expense of trip.expenses) {
      if (expense.type !== 'ledger') continue;
      for (const line of expense.lines) {
        const cents = ledgerLineNetCents(line);
        const name = rosterName.get(line.personId) ?? tripName.get(line.personId) ?? '?';
        const cur = byId.get(line.personId) ?? { name, nets: [] };
        cur.name = rosterName.get(line.personId) ?? cur.name;
        cur.nets.push(cents);
        byId.set(line.personId, cur);
      }
    }
  }

  const out: PokerSummary[] = [];
  for (const [personId, { name, nets }] of byId) {
    const netCents = nets.reduce((sum, n) => sum + n, 0);
    out.push({
      personId,
      name,
      sessions: nets.length,
      wins: nets.filter((n) => n > 0).length,
      losses: nets.filter((n) => n < 0).length,
      pushes: nets.filter((n) => n === 0).length,
      net: netCents / 100,
      best: Math.max(...nets) / 100,
      worst: Math.min(...nets) / 100,
    });
  }

  out.sort((a, b) => {
    const byNet = Math.round(b.net * 100) - Math.round(a.net * 100);
    if (byNet !== 0) return byNet;
    return a.name.localeCompare(b.name, 'zh-Hant');
  });
  return out;
}
