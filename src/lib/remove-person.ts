import type { Expense, Trip } from '../models/types';

/** Strip person from splits; drop expenses where they are payer or transfer party. */
export function expensesAfterRemovingPerson(
  expenses: Expense[],
  personId: string,
): Expense[] {
  return expenses.flatMap((e): Expense[] => {
    if (e.type === 'split') {
      if (e.paidById === personId) return [];
      const participantIds = e.participantIds.filter((id) => id !== personId);
      if (participantIds.length === 0) return [];
      if (participantIds.length === e.participantIds.length) return [e];
      return [{ ...e, participantIds }];
    }
    if (e.fromId === personId || e.toId === personId) return [];
    return [e];
  });
}

/** Derived from the same transform — preview cannot drift from apply. */
export function impactOfRemovingPerson(expenses: Expense[], personId: string) {
  const next = expensesAfterRemovingPerson(expenses, personId);
  const nextById = new Map(next.map((e) => [e.id, e]));
  let deleted = 0;
  let trimmed = 0;
  for (const e of expenses) {
    const kept = nextById.get(e.id);
    if (!kept) {
      deleted += 1;
      continue;
    }
    if (
      e.type === 'split' &&
      kept.type === 'split' &&
      kept.participantIds.length < e.participantIds.length
    ) {
      trimmed += 1;
    }
  }
  return { deleted, trimmed };
}

/** Returns null when trip must keep at least two people. */
export function tripAfterRemovingPerson(trip: Trip, personId: string): Trip | null {
  if (trip.people.length <= 2) return null;
  if (!trip.people.some((p) => p.id === personId)) return trip;
  return {
    ...trip,
    people: trip.people.filter((p) => p.id !== personId),
    expenses: expensesAfterRemovingPerson(trip.expenses, personId),
    settlementMarks: [],
  };
}
