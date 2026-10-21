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

export type LedgerLine = {
  personId: string;
  buyIn: number;
  cashOut: number;
};

export type LedgerExpense = {
  id: string;
  type: 'ledger';
  title: string;
  lines: LedgerLine[];
  createdAt: string;
};

export type Expense = SplitExpense | TransferExpense | LedgerExpense;

export type SettlementMark = {
  fromId: string;
  toId: string;
  amount: number;
  paid: boolean;
};

export const WINDS = ['東', '南', '西', '北'] as const;
export type Wind = (typeof WINDS)[number];

export type WindSeat = {
  personId: string;
  wind: Wind;
};

/** order: 擲骰者、下家、對家、上家。dice: 三顆骰。seats: 每人抽到的風。 */
export type WindDraw = {
  order: string[];
  dice: [number, number, number];
  seats: WindSeat[];
};

export type Trip = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  people: Person[];
  expenses: Expense[];
  settlementMarks: SettlementMark[];
  windDraw?: WindDraw;
};

export type TransferSuggestion = {
  fromId: string;
  toId: string;
  amount: number;
};
