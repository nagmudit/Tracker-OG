import {
  SplitBalance,
  SplitEvent,
  SplitExpense,
  SplitParticipant,
  SplitSettlement,
  SplitSettlementSuggestion,
} from "@/types/split";

const cents = (amount: number) => Math.round(amount * 100);
const rupees = (amountInCents: number) => amountInCents / 100;

export function calculateSplitBalances(
  participants: SplitParticipant[],
  expenses: SplitExpense[],
  settlements: SplitSettlement[]
): SplitBalance[] {
  const balances = new Map<string, SplitBalance>();

  participants.forEach((participant) => {
    balances.set(participant.id, {
      participantId: participant.id,
      name: participant.name,
      paidForExpenses: 0,
      owedShares: 0,
      settlementsPaid: 0,
      settlementsReceived: 0,
      net: 0,
    });
  });

  expenses.forEach((expense) => {
    const payer = balances.get(expense.payerParticipantId);
    if (payer) {
      payer.paidForExpenses += expense.amount;
    }

    expense.shares.forEach((share) => {
      const participant = balances.get(share.participantId);
      if (participant) {
        participant.owedShares += share.amount;
      }
    });
  });

  settlements.forEach((settlement) => {
    const from = balances.get(settlement.fromParticipantId);
    const to = balances.get(settlement.toParticipantId);

    if (from) {
      from.settlementsPaid += settlement.amount;
    }
    if (to) {
      to.settlementsReceived += settlement.amount;
    }
  });

  return [...balances.values()].map((balance) => ({
    ...balance,
    paidForExpenses: rupees(cents(balance.paidForExpenses)),
    owedShares: rupees(cents(balance.owedShares)),
    settlementsPaid: rupees(cents(balance.settlementsPaid)),
    settlementsReceived: rupees(cents(balance.settlementsReceived)),
    net: rupees(
      cents(balance.paidForExpenses) -
        cents(balance.owedShares) -
        cents(balance.settlementsPaid) +
        cents(balance.settlementsReceived)
    ),
  }));
}

export function suggestSplitSettlements(
  balances: SplitBalance[]
): SplitSettlementSuggestion[] {
  const debtors = balances
    .filter((balance) => cents(balance.net) < 0)
    .map((balance) => ({ ...balance, remaining: Math.abs(cents(balance.net)) }))
    .sort((a, b) => b.remaining - a.remaining);
  const creditors = balances
    .filter((balance) => cents(balance.net) > 0)
    .map((balance) => ({ ...balance, remaining: cents(balance.net) }))
    .sort((a, b) => b.remaining - a.remaining);
  const suggestions: SplitSettlementSuggestion[] = [];

  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amount = Math.min(debtor.remaining, creditor.remaining);

    if (amount > 0) {
      suggestions.push({
        fromParticipantId: debtor.participantId,
        fromName: debtor.name,
        toParticipantId: creditor.participantId,
        toName: creditor.name,
        amount: rupees(amount),
      });
    }

    debtor.remaining -= amount;
    creditor.remaining -= amount;

    if (debtor.remaining === 0) debtorIndex += 1;
    if (creditor.remaining === 0) creditorIndex += 1;
  }

  return suggestions;
}

export function hydrateSplitEvent(
  event: Omit<
    SplitEvent,
    "balances" | "suggestedSettlements" | "totalSpent"
  >
): SplitEvent {
  const balances = calculateSplitBalances(
    event.participants,
    event.expenses,
    event.settlements
  );

  return {
    ...event,
    balances,
    suggestedSettlements: suggestSplitSettlements(balances),
    totalSpent: event.expenses.reduce((sum, expense) => sum + expense.amount, 0),
  };
}
