export type Person = {
  id: string;
  name: string;
};

export type SplitExpense = {
  id: string;
  type: 'split';
  title: string;
  amount: number;
  paidById: string;
  participantIds: string[];
  createdAt: string;
};

export type TransferExpense = {
  id: string;
  type: 'transfer';
  title: string;
  amount: number;
  fromId: string;
  toId: string;
  createdAt: string;
};

export type Expense = SplitExpense | TransferExpense;

export type SettlementMark = {
  fromId: string;
  toId: string;
  amount: number;
  paid: boolean;
};

export type Trip = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  people: Person[];
  expenses: Expense[];
  settlementMarks: SettlementMark[];
};

export type TransferSuggestion = {
  fromId: string;
  toId: string;
  amount: number;
};
