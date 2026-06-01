"use client";

import React, { useEffect, useMemo, useState } from "react";
import { format, isPast, isToday } from "date-fns";
import {
  Banknote,
  CalendarClock,
  CalendarDays,
  CreditCard,
  Edit3,
  IndianRupee,
  MoreVertical,
  Pause,
  Play,
  Plus,
  Smartphone,
  Trash2,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import { useExpense } from "@/context/ExpenseContext";
import { Expense, ScheduledTransaction } from "@/types/expense";
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

type FormState = {
  title: string;
  amount: string;
  category: string;
  paymentMethod: Expense["paymentMethod"];
  transactionType: Expense["transactionType"];
  description: string;
  frequency: ScheduledTransaction["frequency"];
  nextRunDate: string;
  active: boolean;
};

const today = () => new Date().toISOString().split("T")[0];

const defaultFormState = (): FormState => ({
  title: "",
  amount: "",
  category: "",
  paymentMethod: "upi",
  transactionType: "debit",
  description: "",
  frequency: "monthly",
  nextRunDate: today(),
  active: true,
});

const paymentMethods: Array<{
  value: Expense["paymentMethod"];
  label: string;
  icon: React.ElementType;
}> = [
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "upi", label: "UPI", icon: Smartphone },
  { value: "credit-card", label: "Credit", icon: CreditCard },
  { value: "debit-card", label: "Debit", icon: WalletCards },
];

const frequencies: Array<{
  value: ScheduledTransaction["frequency"];
  label: string;
}> = [
  { value: "once", label: "Once" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

function describeDueDate(schedule: ScheduledTransaction) {
  const date = new Date(`${schedule.nextRunDate}T00:00:00`);
  if (isToday(date)) return "Due today";
  if (isPast(date)) return "Ready to add";
  return format(date, "MMM dd, yyyy");
}

const ScheduledTransactions: React.FC = () => {
  const {
    categories,
    scheduledTransactions,
    addScheduledTransaction,
    updateScheduledTransaction,
    deleteScheduledTransaction,
    processDueScheduledTransactions,
  } = useExpense();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] =
    useState<ScheduledTransaction | null>(null);
  const [deletingSchedule, setDeletingSchedule] =
    useState<ScheduledTransaction | null>(null);
  const [formData, setFormData] = useState<FormState>(defaultFormState);
  const [error, setError] = useState("");

  const activeSchedules = scheduledTransactions.filter((item) => item.active);
  const pausedSchedules = scheduledTransactions.filter((item) => !item.active);

  const nextSchedule = useMemo(() => {
    return [...activeSchedules].sort((a, b) =>
      a.nextRunDate.localeCompare(b.nextRunDate)
    )[0];
  }, [activeSchedules]);

  useEffect(() => {
    if (!isSheetOpen) return;

    if (editingSchedule) {
      setFormData({
        title: editingSchedule.title,
        amount: String(editingSchedule.amount),
        category: editingSchedule.category,
        paymentMethod: editingSchedule.paymentMethod,
        transactionType: editingSchedule.transactionType,
        description: editingSchedule.description || "",
        frequency: editingSchedule.frequency,
        nextRunDate: editingSchedule.nextRunDate,
        active: editingSchedule.active,
      });
      setError("");
      return;
    }

    setFormData(defaultFormState());
    setError("");
  }, [editingSchedule, isSheetOpen]);

  const openNewSchedule = (preset?: Partial<FormState>) => {
    setEditingSchedule(null);
    setFormData({ ...defaultFormState(), ...preset });
    setIsSheetOpen(true);
  };

  const updateField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number.parseFloat(formData.amount);

    if (!formData.title.trim()) {
      setError("Add a title for this schedule.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (!formData.category) {
      setError("Choose a category.");
      return;
    }

    const payload = {
      title: formData.title.trim(),
      amount,
      category: formData.category,
      paymentMethod: formData.paymentMethod,
      transactionType: formData.transactionType,
      description: formData.description,
      frequency: formData.frequency,
      nextRunDate: formData.nextRunDate,
      active: formData.active,
    };

    if (editingSchedule) {
      await updateScheduledTransaction(editingSchedule.id, payload);
      toast.success("Schedule updated");
    } else {
      await addScheduledTransaction(payload);
      toast.success("Schedule created");
    }

    setIsSheetOpen(false);
    setEditingSchedule(null);
  };

  const confirmDelete = async () => {
    if (!deletingSchedule) return;
    await deleteScheduledTransaction(deletingSchedule.id);
    toast.success("Schedule deleted");
    setDeletingSchedule(null);
  };

  const toggleActive = async (schedule: ScheduledTransaction) => {
    await updateScheduledTransaction(schedule.id, { active: !schedule.active });
    toast.success(schedule.active ? "Schedule paused" : "Schedule resumed");
  };

  const openEdit = (schedule: ScheduledTransaction) => {
    setEditingSchedule(schedule);
    setIsSheetOpen(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-muted-foreground">
            Automation
          </p>
          <h2 className="text-4xl font-bold text-primary sm:text-3xl sm:text-foreground">
            Scheduled
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              openNewSchedule({
                title: "Salary",
                transactionType: "credit",
                frequency: "monthly",
                category:
                  categories.find((category) => category.name === "Salary")?.name ||
                  categories[0]?.name ||
                  "",
                paymentMethod: "upi",
              })
            }
          >
            <Banknote data-icon="inline-start" />
            Salary
          </Button>
          <Button type="button" onClick={() => openNewSchedule()}>
            <Plus data-icon="inline-start" />
            New schedule
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="app-card">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="text-2xl">Next run</CardTitle>
            <CardDescription>
              Items are added when you open the app on or after their date.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {nextSchedule ? (
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-secondary text-success">
                    <CalendarClock />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xl font-bold text-foreground">
                      {nextSchedule.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {describeDueDate(nextSchedule)} |{" "}
                      {nextSchedule.frequency}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                  <p
                    className={
                      nextSchedule.transactionType === "credit"
                        ? "finance-amount text-2xl font-bold text-success"
                        : "finance-amount text-2xl font-bold text-destructive"
                    }
                  >
                    {nextSchedule.transactionType === "credit" ? "+" : "-"}
                    {formatCurrency(nextSchedule.amount)}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={processDueScheduledTransactions}
                  >
                    Check now
                  </Button>
                </div>
              </div>
            ) : (
              <Empty className="border border-dashed border-border">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <CalendarDays />
                  </EmptyMedia>
                  <EmptyTitle>No active schedules</EmptyTitle>
                  <EmptyDescription>
                    Add salary, rent, bills, or any recurring entry.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>
        </Card>

        <Card className="app-card bg-muted/55">
          <CardContent className="grid grid-cols-3 gap-3 p-5">
            <div>
              <p className="finance-label text-xs text-muted-foreground">
                Active
              </p>
              <p className="finance-amount mt-2 text-3xl font-bold">
                {activeSchedules.length}
              </p>
            </div>
            <div>
              <p className="finance-label text-xs text-muted-foreground">
                Paused
              </p>
              <p className="finance-amount mt-2 text-3xl font-bold">
                {pausedSchedules.length}
              </p>
            </div>
            <div>
              <p className="finance-label text-xs text-muted-foreground">
                Total
              </p>
              <p className="finance-amount mt-2 text-3xl font-bold">
                {scheduledTransactions.length}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="app-card">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-2xl">All schedules</CardTitle>
          <CardDescription>
            Edit future rules without changing transactions already added.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {scheduledTransactions.length === 0 ? (
            <Empty className="border border-dashed border-border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CalendarClock />
                </EmptyMedia>
                <EmptyTitle>No schedules yet</EmptyTitle>
                <EmptyDescription>
                  Start with salary or a fixed monthly expense.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border">
              {scheduledTransactions.map((schedule) => (
                <div key={schedule.id} className="flex items-center gap-3 p-4">
                  <span
                    className={
                      schedule.transactionType === "credit"
                        ? "flex size-12 shrink-0 items-center justify-center rounded-full bg-secondary text-success"
                        : "flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-primary"
                    }
                  >
                    <CalendarClock />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-foreground">
                          {schedule.title}
                        </p>
                        <p className="truncate text-sm text-muted-foreground">
                          {schedule.category} | {describeDueDate(schedule)}
                        </p>
                      </div>
                      <div className="shrink-0 sm:text-right">
                        <p
                          className={
                            schedule.transactionType === "credit"
                              ? "finance-amount font-bold text-success"
                              : "finance-amount font-bold text-destructive"
                          }
                        >
                          {schedule.transactionType === "credit" ? "+" : "-"}
                          {formatCurrency(schedule.amount)}
                        </p>
                        <div className="mt-1 flex gap-1 sm:justify-end">
                          <Badge variant="outline" className="finance-label">
                            {schedule.frequency}
                          </Badge>
                          <Badge
                            variant={schedule.active ? "secondary" : "outline"}
                            className="finance-label"
                          >
                            {schedule.active ? "Active" : "Paused"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    {schedule.description && (
                      <p className="mt-1 break-words text-sm text-muted-foreground">
                        {schedule.description}
                      </p>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={<Button type="button" variant="ghost" size="icon-sm" />}
                    >
                      <MoreVertical />
                      <span className="sr-only">Schedule actions</span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuGroup>
                        <DropdownMenuItem onClick={() => openEdit(schedule)}>
                          <Edit3 />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleActive(schedule)}>
                          {schedule.active ? <Pause /> : <Play />}
                          {schedule.active ? "Pause" : "Resume"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeletingSchedule(schedule)}
                        >
                          <Trash2 />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet
        open={isSheetOpen}
        onOpenChange={(open) => {
          setIsSheetOpen(open);
          if (!open) setEditingSchedule(null);
        }}
      >
        <SheetContent
          side="bottom"
          className="no-scrollbar mx-auto max-h-[92dvh] max-w-2xl gap-0 overflow-y-auto rounded-t-3xl border-border"
        >
          <SheetHeader className="items-center px-5 pb-2 pt-4 text-center">
            <div className="mb-4 h-1.5 w-24 rounded-full bg-border" />
            <SheetTitle className="w-full text-left text-3xl font-bold">
              {editingSchedule ? "Edit Schedule" : "New Schedule"}
            </SheetTitle>
            <SheetDescription className="sr-only">
              Configure a transaction that can be added automatically.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-5">
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel className="finance-label text-muted-foreground">
                  Type
                </FieldLabel>
                <ToggleGroup
                  value={[formData.transactionType]}
                  onValueChange={(value) => {
                    const nextValue = value[0] as Expense["transactionType"] | undefined;
                    if (nextValue) updateField("transactionType", nextValue);
                  }}
                  className="grid w-full grid-cols-2 rounded-xl bg-muted p-1"
                  spacing={0}
                >
                  <ToggleGroupItem value="debit" className="h-12 text-lg">
                    Expense
                  </ToggleGroupItem>
                  <ToggleGroupItem value="credit" className="h-12 text-lg">
                    Income
                  </ToggleGroupItem>
                </ToggleGroup>
              </Field>

              <Field>
                <FieldLabel htmlFor="schedule-title">Title</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    id="schedule-title"
                    value={formData.title}
                    onChange={(event) => updateField("title", event.target.value)}
                    placeholder="Salary, rent, subscription"
                  />
                </InputGroup>
              </Field>

              <Field>
                <FieldLabel htmlFor="schedule-amount">Amount</FieldLabel>
                <InputGroup>
                  <InputGroupAddon>
                    <IndianRupee />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="schedule-amount"
                    inputMode="decimal"
                    value={formData.amount}
                    onChange={(event) => updateField("amount", event.target.value)}
                    placeholder="0"
                  />
                </InputGroup>
              </Field>

              <Field>
                <FieldLabel>Frequency</FieldLabel>
                <ToggleGroup
                  value={[formData.frequency]}
                  onValueChange={(value) => {
                    const nextValue = value[0] as
                      | ScheduledTransaction["frequency"]
                      | undefined;
                    if (nextValue) updateField("frequency", nextValue);
                  }}
                  className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4"
                  variant="outline"
                >
                  {frequencies.map((item) => (
                    <ToggleGroupItem
                      key={item.value}
                      value={item.value}
                      className="h-11"
                    >
                      {item.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </Field>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field>
                  <FieldLabel>Category</FieldLabel>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => updateField("category", value || "")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.name}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel>Next date</FieldLabel>
                  <InputGroup>
                    <InputGroupAddon>
                      <CalendarDays />
                    </InputGroupAddon>
                    <InputGroupInput
                      type="date"
                      value={formData.nextRunDate}
                      onChange={(event) =>
                        updateField("nextRunDate", event.target.value)
                      }
                    />
                  </InputGroup>
                </Field>
              </div>

              <Field>
                <FieldLabel>Payment method</FieldLabel>
                <ToggleGroup
                  value={[formData.paymentMethod]}
                  onValueChange={(value) => {
                    const nextValue = value[0] as Expense["paymentMethod"] | undefined;
                    if (nextValue) updateField("paymentMethod", nextValue);
                  }}
                  className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4"
                  variant="outline"
                >
                  {paymentMethods.map((method) => {
                    const Icon = method.icon;
                    return (
                      <ToggleGroupItem
                        key={method.value}
                        value={method.value}
                        className="h-14 gap-2 px-3 text-base"
                      >
                        <Icon />
                        <span>{method.label}</span>
                      </ToggleGroupItem>
                    );
                  })}
                </ToggleGroup>
              </Field>

              <Field>
                <FieldLabel htmlFor="schedule-description">Note</FieldLabel>
                <Textarea
                  id="schedule-description"
                  value={formData.description}
                  onChange={(event) =>
                    updateField("description", event.target.value)
                  }
                  placeholder="Optional"
                  rows={2}
                />
              </Field>

              <Field>
                <Button
                  type="button"
                  variant={formData.active ? "secondary" : "outline"}
                  onClick={() => updateField("active", !formData.active)}
                >
                  {formData.active ? (
                    <Pause data-icon="inline-start" />
                  ) : (
                    <Play data-icon="inline-start" />
                  )}
                  {formData.active ? "Active schedule" : "Paused schedule"}
                </Button>
              </Field>

              {error && <FieldError>{error}</FieldError>}
            </FieldGroup>

            <SheetFooter className="sticky bottom-0 -mx-5 border-t border-border bg-popover px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsSheetOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="lg">
                  {editingSchedule ? "Save" : "Create"}
                </Button>
              </div>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={Boolean(deletingSchedule)}
        onOpenChange={(open) => {
          if (!open) setDeletingSchedule(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <Trash2 className="text-destructive" />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete schedule</AlertDialogTitle>
            <AlertDialogDescription>
              Existing transactions stay in your history.
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

export default ScheduledTransactions;
