import type { Person, Trip } from '../models/types';

/** Keep roster ids, and adopt trip members the roster has not seen yet. */
export function mergeRoster(roster: Person[], trips: Trip[]): Person[] {
  const seen = new Set(roster.map((p) => p.id));
  const next = [...roster];
  for (const trip of trips) {
    for (const person of trip.people) {
      if (seen.has(person.id)) continue;
      seen.add(person.id);
      next.push({ id: person.id, name: person.name });
    }
  }
  return next;
}
