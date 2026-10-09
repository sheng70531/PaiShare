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
    const winNets = nets.filter((n) => n > 0);
    const lossNets = nets.filter((n) => n < 0);
    const wins = winNets.length;
    const losses = lossNets.length;
    const best = winNets.length ? Math.max(...winNets) / 100 : 0;
    const worst = lossNets.length ? Math.min(...lossNets) / 100 : 0;
    out.push({
      personId,
      name,
      sessions: nets.length,
      wins,
      losses,
      pushes: nets.filter((n) => n === 0).length,
      net: netCents / 100,
      best,
      worst,
    });
  }

  out.sort((a, b) => {
    const byNet = Math.round(b.net * 100) - Math.round(a.net * 100);
    if (byNet !== 0) return byNet;
    return a.name.localeCompare(b.name, 'zh-Hant');
  });
  return out;
}

export type PokerSheetSession = {
  id: string;
  label: string;
  /** Dollars. Absent person did not play that session. */
  nets: Record<string, number>;
};

export type PokerSheet = {
  people: { personId: string; name: string; net: number }[];
  sessions: PokerSheetSession[];
};

/** One row per ledger expense, oldest first. People follow the summary ranking. */
export function pokerSheet(trips: Trip[], roster: Person[]): PokerSheet {
  const people = summarizePoker(trips, roster).map((row) => ({
    personId: row.personId,
    name: row.name,
    net: row.net,
  }));

  const raw: { key: string; label: string; nets: Record<string, number>; sort: string }[] = [];
  trips.forEach((trip, tripIndex) => {
    trip.expenses.forEach((expense, expenseIndex) => {
      if (expense.type !== 'ledger' || expense.lines.length === 0) return;
      const centsById: Record<string, number> = {};
      for (const line of expense.lines) {
        centsById[line.personId] = (centsById[line.personId] ?? 0) + ledgerLineNetCents(line);
      }
      const nets: Record<string, number> = {};
      for (const [personId, cents] of Object.entries(centsById)) nets[personId] = cents / 100;
      const label = trip.title === expense.title ? trip.title : `${trip.title} · ${expense.title}`;
      const when = expense.createdAt || trip.createdAt;
      raw.push({
        key: `${trip.id}:${expense.id}`,
        label,
        nets,
        sort: when ? `${when}` : `${String(tripIndex).padStart(6, '0')}:${String(expenseIndex).padStart(6, '0')}`,
      });
    });
  });

  raw.sort((a, b) => (a.sort < b.sort ? -1 : a.sort > b.sort ? 1 : 0));
  return {
    people,
    sessions: raw.map(({ key, label, nets }) => ({ id: key, label, nets })),
  };
}
