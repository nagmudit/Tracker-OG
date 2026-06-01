"use client";

import React, { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  CalendarDays,
  Check,
  Edit3,
  HandCoins,
  IndianRupee,
  MoreVertical,
  Plus,
  ReceiptText,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  SplitEvent,
  SplitExpense,
  SplitMode,
  SplitSettlement,
} from "@/types/split";
import { formatCurrency } from "@/utils/expense-utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type EventFormState = {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  participants: string;
};

type ExpenseFormState = {
  title: string;
  amount: string;
  payerParticipantId: string;
  category: string;
  note: string;
  date: string;
  splitMode: SplitMode;
  participantIds: string[];
  customShares: Record<string, string>;
};

type SettlementFormState = {
  fromParticipantId: string;
  toParticipantId: string;
  amount: string;
  note: string;
  date: string;
};

type DeleteTarget =
  | { type: "event"; id: string; label: string }
  | { type: "expense"; id: string; label: string }
  | { type: "settlement"; id: string; label: string };

const today = () => new Date().toISOString().split("T")[0];

const defaultEventForm = (): EventFormState => ({
  name: "",
  description: "",
  startDate: "",
  endDate: "",
  participants: "",
});

const defaultExpenseForm = (event?: SplitEvent): ExpenseFormState => {
  const participantIds = event?.participants.map((item) => item.id) || [];
  const self = event?.participants.find((item) => item.isSelf);

  return {
    title: "",
    amount: "",
    payerParticipantId: self?.id || participantIds[0] || "",
    category: "",
    note: "",
    date: today(),
    splitMode: "equal",
    participantIds,
    customShares: Object.fromEntries(participantIds.map((id) => [id, ""])),
  };
};

const defaultSettlementForm = (event?: SplitEvent): SettlementFormState => ({
  fromParticipantId: event?.suggestedSettlements[0]?.fromParticipantId || "",
  toParticipantId: event?.suggestedSettlements[0]?.toParticipantId || "",
  amount: event?.suggestedSettlements[0]?.amount
    ? String(event.suggestedSettlements[0].amount)
    : "",
  note: "",
  date: today(),
});

function parseParticipants(value: string) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function isEqualishExpense(expense: SplitExpense) {
  if (expense.shares.length === 0) return false;
  const amounts = expense.shares.map((share) => Math.round(share.amount * 100));
  return Math.max(...amounts) - Math.min(...amounts) <= 1;
}

const SplitBills: React.FC = () => {
  const [events, setEvents] = useState<SplitEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isEventSheetOpen, setIsEventSheetOpen] = useState(false);
  const [isExpenseSheetOpen, setIsExpenseSheetOpen] = useState(false);
  const [isSettlementSheetOpen, setIsSettlementSheetOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<SplitEvent | null>(null);
  const [editingExpense, setEditingExpense] = useState<SplitExpense | null>(null);
  const [editingSettlement, setEditingSettlement] =
    useState<SplitSettlement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [eventForm, setEventForm] = useState<EventFormState>(defaultEventForm);
  const [expenseForm, setExpenseForm] =
    useState<ExpenseFormState>(defaultExpenseForm);
  const [settlementForm, setSettlementForm] =
    useState<SettlementFormState>(defaultSettlementForm);
  const [error, setError] = useState("");

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) || events[0],
    [events, selectedEventId]
  );

  const participantById = useMemo(() => {
    return new Map(
      selectedEvent?.participants.map((participant) => [
        participant.id,
        participant,
      ]) || []
    );
  }, [selectedEvent]);

  const selfBalance = selectedEvent?.balances.find((balance) => {
    const participant = participantById.get(balance.participantId);
    return participant?.isSelf;
  });

  const customShareTotal = useMemo(() => {
    return expenseForm.participantIds.reduce((sum, participantId) => {
      const amount = Number.parseFloat(expenseForm.customShares[participantId] || "0");
      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0);
  }, [expenseForm.customShares, expenseForm.participantIds]);

  const loadEvents = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/split-events", {
        credentials: "include",
      });
      if (!response.ok) return;

      const data = await response.json();
      const nextEvents = data.events || [];
      setEvents(nextEvents);
      if (!selectedEventId && nextEvents[0]) {
        setSelectedEventId(nextEvents[0].id);
      }
    } catch (error) {
      console.error("Failed to load split events:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const replaceEvent = (event: SplitEvent) => {
    setEvents((prev) => prev.map((item) => (item.id === event.id ? event : item)));
    setSelectedEventId(event.id);
  };

  const openNewEvent = () => {
    setEditingEvent(null);
    setEventForm(defaultEventForm());
    setError("");
    setIsEventSheetOpen(true);
  };

  const openEditEvent = (event: SplitEvent) => {
    setEditingEvent(event);
    setEventForm({
      name: event.name,
      description: event.description || "",
      startDate: event.startDate || "",
      endDate: event.endDate || "",
      participants: "",
    });
    setError("");
    setIsEventSheetOpen(true);
  };

  const openNewExpense = () => {
    setEditingExpense(null);
    setExpenseForm(defaultExpenseForm(selectedEvent));
    setError("");
    setIsExpenseSheetOpen(true);
  };

  const openEditExpense = (expense: SplitExpense) => {
    setEditingExpense(expense);
    setExpenseForm({
      title: expense.title,
      amount: String(expense.amount),
      payerParticipantId: expense.payerParticipantId,
      category: expense.category || "",
      note: expense.note || "",
      date: expense.date,
      splitMode: isEqualishExpense(expense) ? "equal" : "custom",
      participantIds: expense.shares.map((share) => share.participantId),
      customShares: Object.fromEntries(
        expense.shares.map((share) => [share.participantId, String(share.amount)])
      ),
    });
    setError("");
    setIsExpenseSheetOpen(true);
  };

  const openNewSettlement = () => {
    setEditingSettlement(null);
    setSettlementForm(defaultSettlementForm(selectedEvent));
    setError("");
    setIsSettlementSheetOpen(true);
  };

  const openEditSettlement = (settlement: SplitSettlement) => {
    setEditingSettlement(settlement);
    setSettlementForm({
      fromParticipantId: settlement.fromParticipantId,
      toParticipantId: settlement.toParticipantId,
      amount: String(settlement.amount),
      note: settlement.note || "",
      date: settlement.date,
    });
    setError("");
    setIsSettlementSheetOpen(true);
  };

  const submitEvent = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!eventForm.name.trim()) {
      setError("Event name is required.");
      return;
    }

    if (!editingEvent && parseParticipants(eventForm.participants).length === 0) {
      setError("Add at least one other person.");
      return;
    }

    const payload = {
      name: eventForm.name,
      description: eventForm.description,
      startDate: eventForm.startDate,
      endDate: eventForm.endDate,
      participants: parseParticipants(eventForm.participants),
    };

    try {
      const response = await fetch("/api/split-events", {
        method: editingEvent ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(editingEvent ? { id: editingEvent.id, ...payload } : payload),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not save event.");
        return;
      }

      if (editingEvent) {
        replaceEvent(data.event);
      } else {
        setEvents((prev) => [data.event, ...prev]);
        setSelectedEventId(data.event.id);
      }
      toast.success(editingEvent ? "Event updated" : "Event created");
      setIsEventSheetOpen(false);
      setEditingEvent(null);
    } catch (error) {
      console.error("Failed to save split event:", error);
    }
  };

  const submitExpense = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedEvent) return;

    const amount = Number.parseFloat(expenseForm.amount);
    if (!expenseForm.title.trim()) {
      setError("Expense title is required.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (expenseForm.participantIds.length === 0) {
      setError("Choose at least one participant.");
      return;
    }
    if (
      expenseForm.splitMode === "custom" &&
      Math.round(customShareTotal * 100) !== Math.round(amount * 100)
    ) {
      setError("Custom shares must equal the bill amount.");
      return;
    }

    const payload = {
      title: expenseForm.title,
      amount,
      payerParticipantId: expenseForm.payerParticipantId,
      category: expenseForm.category,
      note: expenseForm.note,
      date: expenseForm.date,
      splitMode: expenseForm.splitMode,
      shares: expenseForm.participantIds.map((participantId) => ({
        participantId,
        amount:
          expenseForm.splitMode === "custom"
            ? Number.parseFloat(expenseForm.customShares[participantId] || "0")
            : 0,
      })),
    };

    try {
      const response = await fetch(
        `/api/split-events/${selectedEvent.id}/expenses`,
        {
          method: editingExpense ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(
            editingExpense ? { id: editingExpense.id, ...payload } : payload
          ),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not save expense.");
        return;
      }

      replaceEvent(data.event);
      toast.success(editingExpense ? "Expense updated" : "Expense added");
      setIsExpenseSheetOpen(false);
      setEditingExpense(null);
    } catch (error) {
      console.error("Failed to save split expense:", error);
    }
  };

  const submitSettlement = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedEvent) return;

    const amount = Number.parseFloat(settlementForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (settlementForm.fromParticipantId === settlementForm.toParticipantId) {
      setError("Choose two different people.");
      return;
    }

    const payload = {
      fromParticipantId: settlementForm.fromParticipantId,
      toParticipantId: settlementForm.toParticipantId,
      amount,
      note: settlementForm.note,
      date: settlementForm.date,
    };

    try {
      const response = await fetch(
        `/api/split-events/${selectedEvent.id}/settlements`,
        {
          method: editingSettlement ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(
            editingSettlement ? { id: editingSettlement.id, ...payload } : payload
          ),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not save settlement.");
        return;
      }

      replaceEvent(data.event);
      toast.success(editingSettlement ? "Settlement updated" : "Settlement added");
      setIsSettlementSheetOpen(false);
      setEditingSettlement(null);
    } catch (error) {
      console.error("Failed to save settlement:", error);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || !selectedEvent) return;

    const url =
      deleteTarget.type === "event"
        ? `/api/split-events?id=${deleteTarget.id}`
        : deleteTarget.type === "expense"
          ? `/api/split-events/${selectedEvent.id}/expenses?id=${deleteTarget.id}`
          : `/api/split-events/${selectedEvent.id}/settlements?id=${deleteTarget.id}`;

    try {
      const response = await fetch(url, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Could not delete item");
        return;
      }

      if (deleteTarget.type === "event") {
        const nextEvents = events.filter((item) => item.id !== deleteTarget.id);
        setEvents(nextEvents);
        setSelectedEventId(nextEvents[0]?.id || "");
      } else {
        replaceEvent(data.event);
      }
      toast.success("Deleted");
      setDeleteTarget(null);
    } catch (error) {
      console.error("Failed to delete split item:", error);
    }
  };

  const participantName = (id: string) => participantById.get(id)?.name || "Someone";

  const renderEventList = () => (
    <Card className="app-card lg:sticky lg:top-8 lg:max-h-[calc(100dvh-4rem)]">
      <CardHeader className="border-b border-border pb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-2xl">Events</CardTitle>
            <CardDescription>Trips, journeys, and shared plans.</CardDescription>
          </div>
          <Button type="button" size="icon-sm" onClick={openNewEvent}>
            <Plus />
            <span className="sr-only">Create event</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading events...</p>
        ) : events.length === 0 ? (
          <Empty className="border border-dashed border-border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Users />
              </EmptyMedia>
              <EmptyTitle>No split events</EmptyTitle>
              <EmptyDescription>Create one for a trip or shared bill.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          events.map((event) => {
            const isActive = selectedEvent?.id === event.id;
            const unsettled = event.balances.filter(
              (balance) => Math.abs(balance.net) >= 0.01
            ).length;

            return (
              <button
                key={event.id}
                type="button"
                className={
                  isActive
                    ? "rounded-lg border border-primary bg-secondary p-4 text-left"
                    : "rounded-lg border border-border bg-card p-4 text-left hover:bg-muted"
                }
                onClick={() => setSelectedEventId(event.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold text-foreground">
                      {event.name}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {event.startDate || event.endDate
                        ? `${event.startDate || "Start"} - ${
                            event.endDate || "Now"
                          }`
                        : "No dates set"}
                    </p>
                  </div>
                  <Badge variant={unsettled ? "outline" : "secondary"}>
                    {unsettled ? "Open" : "Settled"}
                  </Badge>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">
                    {event.participants.length} people
                  </span>
                  <span className="finance-amount font-bold">
                    {formatCurrency(event.totalSpent)}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-muted-foreground">Shared money</p>
          <h2 className="text-4xl font-bold text-primary sm:text-3xl sm:text-foreground">
            Split Bills
          </h2>
        </div>
        <Button type="button" onClick={openNewEvent}>
          <Plus data-icon="inline-start" />
          New event
        </Button>
      </header>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[22rem_1fr]">
        {renderEventList()}

        {!selectedEvent ? (
          <Empty className="min-h-96 border border-dashed border-border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ReceiptText />
              </EmptyMedia>
              <EmptyTitle>Select or create an event</EmptyTitle>
              <EmptyDescription>
                Split group spending without touching your personal ledger.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="flex flex-col gap-5">
            <Card className="app-card">
              <CardHeader className="border-b border-border pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <CardTitle className="truncate text-3xl">
                      {selectedEvent.name}
                    </CardTitle>
                    <CardDescription>
                      {selectedEvent.description || "Shared event ledger"}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={<Button type="button" variant="ghost" size="icon-sm" />}
                    >
                      <MoreVertical />
                      <span className="sr-only">Event actions</span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuGroup>
                        <DropdownMenuItem onClick={() => openEditEvent(selectedEvent)}>
                          <Edit3 />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() =>
                            setDeleteTarget({
                              type: "event",
                              id: selectedEvent.id,
                              label: selectedEvent.name,
                            })
                          }
                        >
                          <Trash2 />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-border bg-muted/45 p-4">
                  <p className="finance-label text-xs text-muted-foreground">
                    Total spent
                  </p>
                  <p className="finance-amount mt-2 text-2xl font-bold">
                    {formatCurrency(selectedEvent.totalSpent)}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/45 p-4">
                  <p className="finance-label text-xs text-muted-foreground">
                    Your balance
                  </p>
                  <p
                    className={
                      (selfBalance?.net || 0) >= 0
                        ? "finance-amount mt-2 text-2xl font-bold text-success"
                        : "finance-amount mt-2 text-2xl font-bold text-destructive"
                    }
                  >
                    {formatCurrency(selfBalance?.net || 0)}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/45 p-4">
                  <p className="finance-label text-xs text-muted-foreground">
                    People
                  </p>
                  <p className="finance-amount mt-2 text-2xl font-bold">
                    {selectedEvent.participants.length}
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              <Card className="app-card">
                <CardHeader className="border-b border-border pb-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle>Balances</CardTitle>
                      <CardDescription>Positive means they receive.</CardDescription>
                    </div>
                    <Button type="button" variant="secondary" onClick={openNewSettlement}>
                      <HandCoins data-icon="inline-start" />
                      Payback
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {selectedEvent.balances.map((balance) => (
                    <div
                      key={balance.participantId}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{balance.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Paid {formatCurrency(balance.paidForExpenses)} | Owes{" "}
                          {formatCurrency(balance.owedShares)}
                        </p>
                      </div>
                      <p
                        className={
                          balance.net >= 0
                            ? "finance-amount shrink-0 font-bold text-success"
                            : "finance-amount shrink-0 font-bold text-destructive"
                        }
                      >
                        {formatCurrency(balance.net)}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="app-card">
                <CardHeader className="border-b border-border pb-4">
                  <CardTitle>Suggested paybacks</CardTitle>
                  <CardDescription>Minimum transfers to settle up.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {selectedEvent.suggestedSettlements.length === 0 ? (
                    <Empty className="border border-dashed border-border">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <Check />
                        </EmptyMedia>
                        <EmptyTitle>All settled</EmptyTitle>
                        <EmptyDescription>No paybacks needed.</EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  ) : (
                    selectedEvent.suggestedSettlements.map((settlement) => (
                      <div
                        key={`${settlement.fromParticipantId}-${settlement.toParticipantId}`}
                        className="rounded-lg border border-border p-3"
                      >
                        <p className="text-sm">
                          <span className="font-semibold">{settlement.fromName}</span>{" "}
                          pays{" "}
                          <span className="font-semibold">{settlement.toName}</span>
                        </p>
                        <p className="finance-amount mt-1 text-xl font-bold">
                          {formatCurrency(settlement.amount)}
                        </p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="app-card">
              <CardHeader className="border-b border-border pb-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>Expenses</CardTitle>
                    <CardDescription>Bills paid during this event.</CardDescription>
                  </div>
                  <Button type="button" onClick={openNewExpense}>
                    <Plus data-icon="inline-start" />
                    Expense
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col divide-y divide-border">
                {selectedEvent.expenses.length === 0 ? (
                  <Empty className="border border-dashed border-border">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <ReceiptText />
                      </EmptyMedia>
                      <EmptyTitle>No expenses yet</EmptyTitle>
                      <EmptyDescription>Add the first shared bill.</EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ) : (
                  selectedEvent.expenses.map((expense) => (
                    <div key={expense.id} className="flex items-center gap-3 py-4">
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-primary">
                        <ReceiptText />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{expense.title}</p>
                        <p className="text-sm text-muted-foreground">
                          Paid by {participantName(expense.payerParticipantId)} |{" "}
                          {format(new Date(`${expense.date}T00:00:00`), "MMM dd")}
                        </p>
                      </div>
                      <p className="finance-amount shrink-0 font-bold">
                        {formatCurrency(expense.amount)}
                      </p>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={<Button type="button" variant="ghost" size="icon-sm" />}
                        >
                          <MoreVertical />
                          <span className="sr-only">Expense actions</span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuGroup>
                            <DropdownMenuItem onClick={() => openEditExpense(expense)}>
                              <Edit3 />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() =>
                                setDeleteTarget({
                                  type: "expense",
                                  id: expense.id,
                                  label: expense.title,
                                })
                              }
                            >
                              <Trash2 />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="app-card">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle>Settlement history</CardTitle>
                <CardDescription>Paybacks already recorded.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col divide-y divide-border">
                {selectedEvent.settlements.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No paybacks recorded.</p>
                ) : (
                  selectedEvent.settlements.map((settlement) => (
                    <div key={settlement.id} className="flex items-center gap-3 py-4">
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-secondary text-success">
                        <HandCoins />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">
                          {participantName(settlement.fromParticipantId)} paid{" "}
                          {participantName(settlement.toParticipantId)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(`${settlement.date}T00:00:00`), "MMM dd")}
                        </p>
                      </div>
                      <p className="finance-amount shrink-0 font-bold">
                        {formatCurrency(settlement.amount)}
                      </p>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={<Button type="button" variant="ghost" size="icon-sm" />}
                        >
                          <MoreVertical />
                          <span className="sr-only">Settlement actions</span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuGroup>
                            <DropdownMenuItem onClick={() => openEditSettlement(settlement)}>
                              <Edit3 />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() =>
                                setDeleteTarget({
                                  type: "settlement",
                                  id: settlement.id,
                                  label: "settlement",
                                })
                              }
                            >
                              <Trash2 />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </section>

      <Sheet
        open={isEventSheetOpen}
        onOpenChange={(open) => {
          setIsEventSheetOpen(open);
          if (!open) setEditingEvent(null);
        }}
      >
        <SheetContent
          side="bottom"
          className="no-scrollbar mx-auto max-h-[92dvh] max-w-2xl gap-0 overflow-y-auto rounded-t-3xl"
        >
          <SheetHeader className="items-center px-5 pb-2 pt-4 text-center">
            <div className="mb-4 h-1.5 w-24 rounded-full bg-border" />
            <SheetTitle className="w-full text-left text-3xl font-bold">
              {editingEvent ? "Edit Event" : "New Event"}
            </SheetTitle>
            <SheetDescription className="sr-only">
              Create or edit a split bill event.
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={submitEvent} className="flex flex-col gap-5 px-5">
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel htmlFor="split-event-name">Name</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    id="split-event-name"
                    value={eventForm.name}
                    onChange={(event) =>
                      setEventForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                    placeholder="Goa trip, office lunch, wedding plan"
                  />
                </InputGroup>
              </Field>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field>
                  <FieldLabel>Start</FieldLabel>
                  <InputGroup>
                    <InputGroupAddon>
                      <CalendarDays />
                    </InputGroupAddon>
                    <InputGroupInput
                      type="date"
                      value={eventForm.startDate}
                      onChange={(event) =>
                        setEventForm((prev) => ({
                          ...prev,
                          startDate: event.target.value,
                        }))
                      }
                    />
                  </InputGroup>
                </Field>
                <Field>
                  <FieldLabel>End</FieldLabel>
                  <InputGroup>
                    <InputGroupAddon>
                      <CalendarDays />
                    </InputGroupAddon>
                    <InputGroupInput
                      type="date"
                      value={eventForm.endDate}
                      onChange={(event) =>
                        setEventForm((prev) => ({
                          ...prev,
                          endDate: event.target.value,
                        }))
                      }
                    />
                  </InputGroup>
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="split-event-description">Description</FieldLabel>
                <Textarea
                  id="split-event-description"
                  value={eventForm.description}
                  onChange={(event) =>
                    setEventForm((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                  rows={2}
                  placeholder="Optional"
                />
              </Field>
              {!editingEvent && (
                <Field>
                  <FieldLabel htmlFor="split-event-people">
                    People besides you
                  </FieldLabel>
                  <Textarea
                    id="split-event-people"
                    value={eventForm.participants}
                    onChange={(event) =>
                      setEventForm((prev) => ({
                        ...prev,
                        participants: event.target.value,
                      }))
                    }
                    rows={4}
                    placeholder="Riya, Kabir, Ananya"
                  />
                </Field>
              )}
              {error && <FieldError>{error}</FieldError>}
            </FieldGroup>
            <SheetFooter className="sticky bottom-0 -mx-5 border-t border-border bg-popover px-5 py-3">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEventSheetOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="lg">
                  {editingEvent ? "Save" : "Create"}
                </Button>
              </div>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet
        open={isExpenseSheetOpen}
        onOpenChange={(open) => {
          setIsExpenseSheetOpen(open);
          if (!open) setEditingExpense(null);
        }}
      >
        <SheetContent
          side="bottom"
          className="no-scrollbar mx-auto max-h-[92dvh] max-w-2xl gap-0 overflow-y-auto rounded-t-3xl"
        >
          <SheetHeader className="items-center px-5 pb-2 pt-4 text-center">
            <div className="mb-4 h-1.5 w-24 rounded-full bg-border" />
            <SheetTitle className="w-full text-left text-3xl font-bold">
              {editingExpense ? "Edit Expense" : "Add Expense"}
            </SheetTitle>
            <SheetDescription className="sr-only">
              Add a shared bill and choose the split.
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={submitExpense} className="flex flex-col gap-5 px-5">
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel htmlFor="split-expense-title">Title</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    id="split-expense-title"
                    value={expenseForm.title}
                    onChange={(event) =>
                      setExpenseForm((prev) => ({
                        ...prev,
                        title: event.target.value,
                      }))
                    }
                    placeholder="Hotel, cab, dinner"
                  />
                </InputGroup>
              </Field>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field>
                  <FieldLabel>Amount</FieldLabel>
                  <InputGroup>
                    <InputGroupAddon>
                      <IndianRupee />
                    </InputGroupAddon>
                    <InputGroupInput
                      inputMode="decimal"
                      value={expenseForm.amount}
                      onChange={(event) =>
                        setExpenseForm((prev) => ({
                          ...prev,
                          amount: event.target.value,
                        }))
                      }
                      placeholder="0"
                    />
                  </InputGroup>
                </Field>
                <Field>
                  <FieldLabel>Date</FieldLabel>
                  <InputGroup>
                    <InputGroupAddon>
                      <CalendarDays />
                    </InputGroupAddon>
                    <InputGroupInput
                      type="date"
                      value={expenseForm.date}
                      onChange={(event) =>
                        setExpenseForm((prev) => ({
                          ...prev,
                          date: event.target.value,
                        }))
                      }
                    />
                  </InputGroup>
                </Field>
              </div>
              <Field>
                <FieldLabel>Paid by</FieldLabel>
                <Select
                  value={expenseForm.payerParticipantId}
                  onValueChange={(value) =>
                    setExpenseForm((prev) => ({
                      ...prev,
                      payerParticipantId: value || "",
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {selectedEvent?.participants.map((participant) => (
                        <SelectItem key={participant.id} value={participant.id}>
                          {participant.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Split type</FieldLabel>
                <ToggleGroup
                  value={[expenseForm.splitMode]}
                  onValueChange={(value) => {
                    const next = value[0] as SplitMode | undefined;
                    if (next) {
                      setExpenseForm((prev) => ({ ...prev, splitMode: next }));
                    }
                  }}
                  className="grid w-full grid-cols-2 rounded-xl bg-muted p-1"
                  spacing={0}
                >
                  <ToggleGroupItem value="equal" className="h-11">
                    Equal
                  </ToggleGroupItem>
                  <ToggleGroupItem value="custom" className="h-11">
                    Custom
                  </ToggleGroupItem>
                </ToggleGroup>
              </Field>
              <Field>
                <FieldLabel>Included people</FieldLabel>
                <ToggleGroup
                  value={expenseForm.participantIds}
                  onValueChange={(value) =>
                    setExpenseForm((prev) => ({
                      ...prev,
                      participantIds: value,
                    }))
                  }
                  className="flex flex-wrap gap-2"
                  variant="outline"
                >
                  {selectedEvent?.participants.map((participant) => (
                    <ToggleGroupItem
                      key={participant.id}
                      value={participant.id}
                      className="h-11"
                    >
                      {participant.name}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </Field>
              {expenseForm.splitMode === "custom" && (
                <Field>
                  <FieldLabel>Custom shares</FieldLabel>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {expenseForm.participantIds.map((participantId) => (
                      <InputGroup key={participantId}>
                        <InputGroupAddon>
                          {participantName(participantId)}
                        </InputGroupAddon>
                        <InputGroupInput
                          inputMode="decimal"
                          value={expenseForm.customShares[participantId] || ""}
                          onChange={(event) =>
                            setExpenseForm((prev) => ({
                              ...prev,
                              customShares: {
                                ...prev.customShares,
                                [participantId]: event.target.value,
                              },
                            }))
                          }
                          placeholder="0"
                        />
                      </InputGroup>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Total: {formatCurrency(customShareTotal)}
                  </p>
                </Field>
              )}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field>
                  <FieldLabel>Label</FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      value={expenseForm.category}
                      onChange={(event) =>
                        setExpenseForm((prev) => ({
                          ...prev,
                          category: event.target.value,
                        }))
                      }
                      placeholder="Stay, food, travel"
                    />
                  </InputGroup>
                </Field>
                <Field>
                  <FieldLabel>Note</FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      value={expenseForm.note}
                      onChange={(event) =>
                        setExpenseForm((prev) => ({
                          ...prev,
                          note: event.target.value,
                        }))
                      }
                      placeholder="Optional"
                    />
                  </InputGroup>
                </Field>
              </div>
              {error && <FieldError>{error}</FieldError>}
            </FieldGroup>
            <SheetFooter className="sticky bottom-0 -mx-5 border-t border-border bg-popover px-5 py-3">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsExpenseSheetOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="lg">
                  {editingExpense ? "Save" : "Add"}
                </Button>
              </div>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet
        open={isSettlementSheetOpen}
        onOpenChange={(open) => {
          setIsSettlementSheetOpen(open);
          if (!open) setEditingSettlement(null);
        }}
      >
        <SheetContent
          side="bottom"
          className="no-scrollbar mx-auto max-h-[92dvh] max-w-2xl gap-0 overflow-y-auto rounded-t-3xl"
        >
          <SheetHeader className="items-center px-5 pb-2 pt-4 text-center">
            <div className="mb-4 h-1.5 w-24 rounded-full bg-border" />
            <SheetTitle className="w-full text-left text-3xl font-bold">
              {editingSettlement ? "Edit Payback" : "Record Payback"}
            </SheetTitle>
            <SheetDescription className="sr-only">
              Record a settlement between two people.
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={submitSettlement} className="flex flex-col gap-5 px-5">
            <FieldGroup className="gap-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field>
                  <FieldLabel>From</FieldLabel>
                  <Select
                    value={settlementForm.fromParticipantId}
                    onValueChange={(value) =>
                      setSettlementForm((prev) => ({
                        ...prev,
                        fromParticipantId: value || "",
                      }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Who paid" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {selectedEvent?.participants.map((participant) => (
                          <SelectItem key={participant.id} value={participant.id}>
                            {participant.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>To</FieldLabel>
                  <Select
                    value={settlementForm.toParticipantId}
                    onValueChange={(value) =>
                      setSettlementForm((prev) => ({
                        ...prev,
                        toParticipantId: value || "",
                      }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Who received" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {selectedEvent?.participants.map((participant) => (
                          <SelectItem key={participant.id} value={participant.id}>
                            {participant.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field>
                  <FieldLabel>Amount</FieldLabel>
                  <InputGroup>
                    <InputGroupAddon>
                      <IndianRupee />
                    </InputGroupAddon>
                    <InputGroupInput
                      inputMode="decimal"
                      value={settlementForm.amount}
                      onChange={(event) =>
                        setSettlementForm((prev) => ({
                          ...prev,
                          amount: event.target.value,
                        }))
                      }
                      placeholder="0"
                    />
                  </InputGroup>
                </Field>
                <Field>
                  <FieldLabel>Date</FieldLabel>
                  <InputGroup>
                    <InputGroupAddon>
                      <CalendarDays />
                    </InputGroupAddon>
                    <InputGroupInput
                      type="date"
                      value={settlementForm.date}
                      onChange={(event) =>
                        setSettlementForm((prev) => ({
                          ...prev,
                          date: event.target.value,
                        }))
                      }
                    />
                  </InputGroup>
                </Field>
              </div>
              <Field>
                <FieldLabel>Note</FieldLabel>
                <Textarea
                  value={settlementForm.note}
                  onChange={(event) =>
                    setSettlementForm((prev) => ({
                      ...prev,
                      note: event.target.value,
                    }))
                  }
                  placeholder="Optional"
                  rows={2}
                />
              </Field>
              {error && <FieldError>{error}</FieldError>}
            </FieldGroup>
            <SheetFooter className="sticky bottom-0 -mx-5 border-t border-border bg-popover px-5 py-3">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsSettlementSheetOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="lg">
                  {editingSettlement ? "Save" : "Record"}
                </Button>
              </div>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <Trash2 className="text-destructive" />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete {deleteTarget?.label}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === "event"
                ? "This removes the event, expenses, shares, and paybacks."
                : "Balances will update immediately."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SplitBills;
