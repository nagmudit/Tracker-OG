export interface SplitParticipant {
  id: string;
  eventId: string;
  name: string;
  isSelf: boolean;
  createdAt: string;
}

export interface SplitExpenseShare {
  id: string;
  expenseId: string;
  participantId: string;
  amount: number;
}

export interface SplitExpense {
  id: string;
  eventId: string;
  title: string;
  amount: number;
  payerParticipantId: string;
  category?: string;
  note?: string;
  date: string;
  createdAt: string;
  shares: SplitExpenseShare[];
}

export interface SplitSettlement {
  id: string;
  eventId: string;
  fromParticipantId: string;
  toParticipantId: string;
  amount: number;
  note?: string;
  date: string;
  createdAt: string;
}

export interface SplitBalance {
  participantId: string;
  name: string;
  paidForExpenses: number;
  owedShares: number;
  settlementsPaid: number;
  settlementsReceived: number;
  net: number;
}

export interface SplitSettlementSuggestion {
  fromParticipantId: string;
  fromName: string;
  toParticipantId: string;
  toName: string;
  amount: number;
}

export interface SplitEvent {
  id: string;
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  participants: SplitParticipant[];
  expenses: SplitExpense[];
  settlements: SplitSettlement[];
  balances: SplitBalance[];
  suggestedSettlements: SplitSettlementSuggestion[];
  totalSpent: number;
}

export type SplitMode = "equal" | "custom";
