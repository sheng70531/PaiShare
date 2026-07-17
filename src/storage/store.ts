import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type {
  Expense,
  Person,
  SettlementMark,
  SplitExpense,
  TransferExpense,
  Trip,
} from '../models/types';
import { tripAfterRemovingPerson } from '../lib/remove-person';

const STORAGE_KEY = 'paishare-v1';

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

type ExpenseInput =
  | Omit<SplitExpense, 'id' | 'createdAt'>
  | Omit<TransferExpense, 'id' | 'createdAt'>;

type TripStore = {
  trips: Trip[];
  hydrated: boolean;
  setHydrated: (v: boolean) => void;
  createTrip: (title: string, peopleNames: string[]) => string;
  updateTripTitle: (tripId: string, title: string) => void;
  deleteTrip: (tripId: string) => void;
  addPerson: (tripId: string, name: string) => void;
  removePerson: (tripId: string, personId: string) => void;
  addExpense: (tripId: string, expense: ExpenseInput) => void;
  updateExpense: (tripId: string, expense: Expense) => void;
  deleteExpense: (tripId: string, expenseId: string) => void;
  setSettlementMarks: (tripId: string, marks: SettlementMark[]) => void;
  toggleSettlementPaid: (tripId: string, fromId: string, toId: string, amount: number) => void;
  getTrip: (tripId: string) => Trip | undefined;
};

function mapTrip(trips: Trip[], tripId: string, fn: (t: Trip) => Trip): Trip[] {
  return trips.map((t) => (t.id === tripId ? fn({ ...t, updatedAt: nowIso() }) : t));
}

export const useTripStore = create<TripStore>()(
  persist(
    (set, get) => ({
      trips: [],
      hydrated: false,
      setHydrated: (v) => set({ hydrated: v }),

      getTrip: (tripId) => get().trips.find((t) => t.id === tripId),

      createTrip: (title, peopleNames) => {
        const people: Person[] = peopleNames
          .map((n) => n.trim())
          .filter(Boolean)
          .map((name) => ({ id: uid('p'), name }));
        if (people.length < 2) return '';
        const id = uid('trip');
        const trip: Trip = {
          id,
          title: title.trim() || '未命名行程',
          createdAt: nowIso(),
          updatedAt: nowIso(),
          people,
          expenses: [],
          settlementMarks: [],
        };
        set((s) => ({ trips: [trip, ...s.trips] }));
        return id;
      },

      updateTripTitle: (tripId, title) =>
        set((s) => ({
          trips: mapTrip(s.trips, tripId, (t) => ({
            ...t,
            title: title.trim() || t.title,
          })),
        })),

      deleteTrip: (tripId) =>
        set((s) => ({ trips: s.trips.filter((t) => t.id !== tripId) })),

      addPerson: (tripId, name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        set((s) => ({
          trips: mapTrip(s.trips, tripId, (t) => ({
            ...t,
            people: [...t.people, { id: uid('p'), name: trimmed }],
          })),
        }));
      },

      removePerson: (tripId, personId) =>
        set((s) => ({
          trips: s.trips.map((t) => {
            if (t.id !== tripId) return t;
            const next = tripAfterRemovingPerson(t, personId);
            return next ? { ...next, updatedAt: nowIso() } : t;
          }),
        })),

      addExpense: (tripId, expense) =>
        set((s) => ({
          trips: mapTrip(s.trips, tripId, (t) => ({
            ...t,
            expenses: [
              {
                ...expense,
                id: uid('exp'),
                createdAt: nowIso(),
              },
              ...t.expenses,
            ],
            settlementMarks: [],
          })),
        })),

      updateExpense: (tripId, expense) =>
        set((s) => ({
          trips: mapTrip(s.trips, tripId, (t) => ({
            ...t,
            expenses: t.expenses.map((e) => (e.id === expense.id ? expense : e)),
            settlementMarks: [],
          })),
        })),

      deleteExpense: (tripId, expenseId) =>
        set((s) => ({
          trips: mapTrip(s.trips, tripId, (t) => ({
            ...t,
            expenses: t.expenses.filter((e) => e.id !== expenseId),
            settlementMarks: [],
          })),
        })),

      setSettlementMarks: (tripId, marks) =>
        set((s) => ({
          trips: mapTrip(s.trips, tripId, (t) => ({
            ...t,
            settlementMarks: marks,
          })),
        })),

      toggleSettlementPaid: (tripId, fromId, toId, amount) =>
        set((s) => ({
          trips: mapTrip(s.trips, tripId, (t) => {
            const key = (m: SettlementMark) =>
              m.fromId === fromId &&
              m.toId === toId &&
              Math.round(m.amount * 100) === Math.round(amount * 100);
            const existing = t.settlementMarks.find(key);
            if (existing) {
              return {
                ...t,
                settlementMarks: t.settlementMarks.map((m) =>
                  key(m) ? { ...m, paid: !m.paid } : m,
                ),
              };
            }
            return {
              ...t,
              settlementMarks: [
                ...t.settlementMarks,
                { fromId, toId, amount, paid: true },
              ],
            };
          }),
        })),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
      partialize: (s) => ({ trips: s.trips }),
    },
  ),
);
