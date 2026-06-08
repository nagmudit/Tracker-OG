"use client";

import React, { useMemo, useRef, useState } from "react";
import { readSheet } from "read-excel-file/browser";
import Papa from "papaparse";
import {
  AlertCircle,
  FileSpreadsheet,
  Info,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Expense } from "@/types/expense";
import { useExpense } from "@/context/ExpenseContext";
import { toast } from "sonner";
import { defaultCategories, formatCurrency } from "@/utils/expense-utils";
import { cn } from "@/lib/utils";

interface TransactionImporterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ParsedCell = string | number | boolean | Date | null;
type ParsedRow = Record<string, ParsedCell>;
type ImportRow = Omit<Expense, "id" | "createdAt"> & {
  sourceRow: number;
  warnings: string[];
};

interface ColumnMapping {
  date: string;
  amount: string;
  debitAmount: string;
  creditAmount: string;
  description: string;
  type: string;
}

type Step = "UPLOAD" | "MAP_COLUMNS" | "REVIEW";

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;
const MAX_IMPORT_ROWS = 500;
const MAX_DESCRIPTION_LENGTH = 240;
const MAPPING_STORAGE_PREFIX = "money-log:import-mapping:";
const noSelectionValue = "__none__";
const emptyMapping: ColumnMapping = {
  date: "",
  amount: "",
  debitAmount: "",
  creditAmount: "",
  description: "",
  type: "",
};

const normalizeHeader = (value: unknown, index: number) => {
  const label = String(value ?? "").trim();
  return label || `Column ${index + 1}`;
};

const getHeaderSignature = (headers: string[]) =>
  headers
    .map((header) => header.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim())
    .join("|");

const getMappingStorageKey = (headers: string[]) =>
  `${MAPPING_STORAGE_PREFIX}${getHeaderSignature(headers)}`;

const pickSavedMapping = (headers: string[]) => {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(getMappingStorageKey(headers));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<ColumnMapping>;
    const allowed = new Set(headers);
    return {
      ...emptyMapping,
      date: parsed.date && allowed.has(parsed.date) ? parsed.date : "",
      amount: parsed.amount && allowed.has(parsed.amount) ? parsed.amount : "",
      debitAmount:
        parsed.debitAmount && allowed.has(parsed.debitAmount)
          ? parsed.debitAmount
          : "",
      creditAmount:
        parsed.creditAmount && allowed.has(parsed.creditAmount)
          ? parsed.creditAmount
          : "",
      description:
        parsed.description && allowed.has(parsed.description)
          ? parsed.description
          : "",
      type: parsed.type && allowed.has(parsed.type) ? parsed.type : "",
    };
  } catch {
    return null;
  }
};

const saveMappingForHeaders = (headers: string[], mapping: ColumnMapping) => {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(getMappingStorageKey(headers), JSON.stringify(mapping));
  } catch {
    // Mapping memory is a convenience only; import should continue if storage is full.
  }
};

const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const formatDateParts = (year: number, month: number, day: number) => {
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

const parseDateValue = (value: ParsedCell) => {
  if (!value) return { date: "", warning: "Missing date" };

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return { date: value.toISOString().split("T")[0], warning: "" };
  }

  if (typeof value === "number") {
    const excelEpoch = Date.UTC(1899, 11, 30);
    const parsed = new Date(excelEpoch + value * 24 * 60 * 60 * 1000);
    if (!Number.isNaN(parsed.getTime())) {
      return { date: parsed.toISOString().split("T")[0], warning: "" };
    }
  }

  const text = String(value).trim();
  if (isIsoDate(text)) return { date: text, warning: "" };

  const dateOnly = text.split(/[ T]/)[0];
  const parts = dateOnly.match(/^(\d{1,4})[-/.](\d{1,2})[-/.](\d{1,4})$/);
  if (parts) {
    const first = Number(parts[1]);
    const second = Number(parts[2]);
    const third = Number(parts[3]);

    if (parts[1].length === 4) {
      const date = formatDateParts(first, second, third);
      if (date) return { date, warning: "" };
    }

    const year = parts[3].length === 2 ? 2000 + third : third;
    const date = formatDateParts(year, second, first);
    if (date) return { date, warning: "" };
  }

  return { date: "", warning: `Could not read date "${text}"` };
};

const parseAmountValue = (value: ParsedCell) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return { amount: Math.abs(value), isNegative: value < 0, warning: "" };
  }

  const text = String(value ?? "").trim();
  const isNegative =
    text.startsWith("-") || text.includes("(Dr)") || text.includes(" DR");
  const normalized = text.replace(/,/g, "").replace(/[^0-9.-]/g, "");
  const amount = Number.parseFloat(normalized);

  if (!Number.isFinite(amount) || amount === 0) {
    return { amount: 0, isNegative: false, warning: "Missing or invalid amount" };
  }

  return { amount: Math.abs(amount), isNegative: isNegative || amount < 0, warning: "" };
};

const formatCellPreview = (value: ParsedCell) => {
  if (value instanceof Date) return value.toISOString().split("T")[0];
  if (value === null || value === undefined || value === "") return "Blank";
  return String(value).trim();
};

const getColumnSamples = (data: ParsedRow[], header: string, limit = 5) =>
  data
    .map((row) => row[header])
    .filter((value) => value !== null && value !== undefined && String(value).trim() !== "")
    .slice(0, limit)
    .map(formatCellPreview);

const countValidDates = (data: ParsedRow[], header: string) =>
  data
    .slice(0, 20)
    .filter((row) => parseDateValue(row[header]).date)
    .length;

const countValidAmounts = (data: ParsedRow[], header: string) =>
  data
    .slice(0, 20)
    .filter((row) => parseAmountValue(row[header]).amount > 0)
    .length;

const scoreHeader = (header: string, patterns: RegExp[]) => {
  const normalized = header.toLowerCase().trim();
  return patterns.reduce(
    (score, pattern) => score + (pattern.test(normalized) ? 10 : 0),
    0
  );
};

const pickBestHeader = (
  headers: string[],
  score: (header: string) => number,
  usedHeaders: Set<string>
) => {
  const ranked = headers
    .filter((header) => !usedHeaders.has(header))
    .map((header) => ({ header, score: score(header) }))
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.score > 0 ? ranked[0].header : "";
};

const guessType = (
  typeValue: ParsedCell,
  amountHeader: string,
  isNegative: boolean
): "credit" | "debit" => {
  const typeText = String(typeValue ?? "").toLowerCase();
  const amountText = amountHeader.toLowerCase();

  if (
    typeText.match(/\b(cr|credit|received|receive|refund|cashback|added)\b/) ||
    amountText.includes("credit")
  ) {
    return "credit";
  }
  if (
    typeText.match(/\b(dr|debit|paid|sent|spent|withdrawn)\b/) ||
    amountText.includes("debit") ||
    isNegative
  ) {
    return "debit";
  }

  return "debit";
};

const buildImportSignature = (item: Omit<Expense, "id" | "createdAt">) =>
  [
    item.date,
    item.transactionType,
    item.paymentMethod,
    item.amount.toFixed(2),
    item.description?.trim().toLowerCase() || "",
  ].join("|");

const getRowWarnings = (item: Omit<Expense, "id" | "createdAt">) => {
  const warnings: string[] = [];
  if (!item.date || !isIsoDate(item.date)) warnings.push("Enter a valid date");
  if (!Number.isFinite(item.amount) || item.amount <= 0) warnings.push("Enter an amount");
  if (!item.description?.trim()) warnings.push("Add a description");
  if (!item.category) warnings.push("Choose a category");
  return warnings;
};

export const TransactionImporter: React.FC<TransactionImporterProps> = ({
  open,
  onOpenChange,
}) => {
  const { addExpensesBulk, categories, expenses } = useExpense();
  const [step, setStep] = useState<Step>("UPLOAD");
  const [fileName, setFileName] = useState("");
  const [rawData, setRawData] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>(emptyMapping);
  const [previewData, setPreviewData] = useState<ImportRow[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const availableCategories = categories.length > 0 ? categories : defaultCategories;
  const defaultCategory =
    availableCategories.find((category) =>
      ["miscellaneous", "other"].includes(category.name.toLowerCase())
    )?.name || availableCategories[0]?.name || "Miscellaneous";

  const existingSignatures = useMemo(
    () => new Set(expenses.map(buildImportSignature)),
    [expenses]
  );

  const invalidRowCount = previewData.filter((row) => row.warnings.length > 0).length;
  const debitTotal = previewData
    .filter((row) => row.transactionType === "debit")
    .reduce((sum, row) => sum + row.amount, 0);
  const creditTotal = previewData
    .filter((row) => row.transactionType === "credit")
    .reduce((sum, row) => sum + row.amount, 0);
  const usesSplitAmounts = Boolean(mapping.debitAmount || mapping.creditAmount);
  const canGeneratePreview =
    Boolean(mapping.date && mapping.description) &&
    (Boolean(mapping.amount) || usesSplitAmounts);

  const getMappingWarning = (field: keyof ColumnMapping) => {
    const selectedHeader = mapping[field];
    if (!selectedHeader) return "";

    if (field === "date" && countValidDates(rawData, selectedHeader) === 0) {
      return "Selected values do not look like dates.";
    }

    if (
      ["amount", "debitAmount", "creditAmount"].includes(field) &&
      countValidAmounts(rawData, selectedHeader) === 0
    ) {
      return "Selected values do not look like amounts.";
    }

    if (field === "description" && getColumnSamples(rawData, selectedHeader).length === 0) {
      return "Selected column does not have sample descriptions.";
    }

    return "";
  };

  const amountModeWarning =
    mapping.amount && usesSplitAmounts
      ? "Use either Amount or Debit/Credit columns, not both."
      : "";
  const hasBlockingMappingWarnings = Boolean(
    getMappingWarning("date") ||
      getMappingWarning("description") ||
      (mapping.amount && getMappingWarning("amount")) ||
      (mapping.debitAmount && getMappingWarning("debitAmount")) ||
      (mapping.creditAmount && getMappingWarning("creditAmount"))
  );

  const resetState = () => {
    setStep("UPLOAD");
    setFileName("");
    setRawData([]);
    setHeaders([]);
    setMapping(emptyMapping);
    setPreviewData([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) resetState();
    onOpenChange(newOpen);
  };

  const autoMapColumns = (foundHeaders: string[], data: ParsedRow[]) => {
    const savedMapping = pickSavedMapping(foundHeaders);
    if (savedMapping) {
      setMapping(savedMapping);
      toast.success("Reused your saved field mapping for this file layout.");
      return;
    }

    const usedHeaders = new Set<string>();
    const newMapping = { ...emptyMapping };

    newMapping.date = pickBestHeader(
      foundHeaders,
      (header) =>
        scoreHeader(header, [/date/, /time/, /txn/, /transaction/, /posted/, /value date/]) +
        countValidDates(data, header),
      usedHeaders
    );
    if (newMapping.date) usedHeaders.add(newMapping.date);

    newMapping.description = pickBestHeader(
      foundHeaders,
      (header) =>
        scoreHeader(header, [
          /desc/,
          /detail/,
          /remark/,
          /narration/,
          /activity/,
          /merchant/,
          /payee/,
          /particular/,
          /beneficiary/,
        ]) + getColumnSamples(data, header, 8).filter((sample) => Number.isNaN(Number(sample))).length,
      usedHeaders
    );
    if (newMapping.description) usedHeaders.add(newMapping.description);

    newMapping.debitAmount = pickBestHeader(
      foundHeaders,
      (header) =>
        scoreHeader(header, [/debit/, /\bdr\b/, /withdrawal/, /paid/, /sent/]) +
        countValidAmounts(data, header),
      usedHeaders
    );
    if (newMapping.debitAmount) usedHeaders.add(newMapping.debitAmount);

    newMapping.creditAmount = pickBestHeader(
      foundHeaders,
      (header) =>
        scoreHeader(header, [/credit/, /\bcr\b/, /deposit/, /received/, /receipt/]) +
        countValidAmounts(data, header),
      usedHeaders
    );
    if (newMapping.creditAmount) usedHeaders.add(newMapping.creditAmount);

    if (!newMapping.debitAmount && !newMapping.creditAmount) {
      newMapping.amount = pickBestHeader(
        foundHeaders,
        (header) =>
          scoreHeader(header, [/amount/, /value/, /inr/, /rs/, /transaction amount/]) +
          countValidAmounts(data, header),
        usedHeaders
      );
      if (newMapping.amount) usedHeaders.add(newMapping.amount);
    }

    newMapping.type = pickBestHeader(
      foundHeaders,
      (header) =>
        scoreHeader(header, [/type/, /cr\/dr/, /dr\/cr/, /direction/, /status/]) +
        getColumnSamples(data, header, 10).filter((sample) =>
          sample.toLowerCase().match(/\b(cr|dr|credit|debit|paid|sent|received)\b/)
        ).length,
      usedHeaders
    );

    setMapping(newMapping);
  };

  const handleDataParsed = (data: ParsedRow[], foundHeaders: string[]) => {
    if (data.length === 0) {
      toast.error("The file does not contain any transaction rows.");
      return;
    }

    if (data.length > MAX_IMPORT_ROWS) {
      toast.error(`Import up to ${MAX_IMPORT_ROWS} rows at a time.`);
      return;
    }

    setRawData(data);
    setHeaders(foundHeaders);
    autoMapColumns(foundHeaders, data);
    setStep("MAP_COLUMNS");
  };

  const parseCsvFile = (file: File) => {
    Papa.parse<ParsedRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      complete: (results) => {
        const foundHeaders = results.meta.fields?.filter(Boolean) || [];
        handleDataParsed(results.data, foundHeaders);
      },
      error: (error) => {
        toast.error("Failed to parse CSV file.");
        console.error(error);
      },
    });
  };

  const parseXlsxFile = async (file: File) => {
    try {
      const rows = await readSheet(file);
      const headerRow = rows[0] || [];
      const foundHeaders = headerRow.map(normalizeHeader);
      const data = rows.slice(1).map((row) =>
        foundHeaders.reduce<ParsedRow>((record, header, index) => {
          record[header] = (row[index] as ParsedCell) ?? null;
          return record;
        }, {})
      );

      handleDataParsed(data, foundHeaders);
    } catch (error) {
      toast.error("Failed to parse Excel file.");
      console.error(error);
    }
  };

  const processFile = (file: File) => {
    const lowerName = file.name.toLowerCase();

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error("Choose a file under 2 MB.");
      return;
    }

    if (lowerName.endsWith(".xls")) {
      toast.error("Legacy .xls files are not supported. Export as .xlsx or .csv.");
      return;
    }

    if (!lowerName.match(/\.(csv|xlsx)$/)) {
      toast.error("Please upload a CSV or XLSX file.");
      return;
    }

    setFileName(file.name);
    if (lowerName.endsWith(".csv")) {
      parseCsvFile(file);
    } else {
      void parseXlsxFile(file);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) processFile(selectedFile);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const droppedFile = event.dataTransfer.files?.[0];
    if (droppedFile) processFile(droppedFile);
  };

  const categorizeDescription = (description: string) => {
    const lowerDesc = description.toLowerCase();
    let matchedCategory = defaultCategory;

    if (lowerDesc.match(/swiggy|zomato|restaurant|cafe|food/)) {
      matchedCategory = "Food & Dining";
    } else if (lowerDesc.match(/uber|ola|cab|auto|rapido|metro|irctc|train|fuel/)) {
      matchedCategory = "Travel";
    } else if (lowerDesc.match(/amazon|flipkart|myntra|shopping/)) {
      matchedCategory = "Shopping";
    } else if (lowerDesc.match(/jio|airtel|vi|recharge|bill|electricity|gas/)) {
      matchedCategory = "Bills & Utilities";
    } else if (lowerDesc.match(/movie|netflix|prime|hotstar|spotify/)) {
      matchedCategory = "Entertainment";
    } else if (lowerDesc.match(/medical|hospital|pharmacy|clinic|doctor/)) {
      matchedCategory = "Healthcare";
    } else if (lowerDesc.match(/grocery|dmart|blinkit|zepto|bigbasket/)) {
      matchedCategory = "Grocery";
    } else if (lowerDesc.match(/salary|payroll/)) {
      matchedCategory = "Salary";
    }

    return (
      availableCategories.find(
        (category) => category.name.toLowerCase() === matchedCategory.toLowerCase()
      )?.name || defaultCategory
    );
  };

  const generatePreview = () => {
    if (!canGeneratePreview) {
      toast.error("Map date, description, and an amount field before review.");
      return;
    }

    if (amountModeWarning) {
      toast.error(amountModeWarning);
      return;
    }

    if (hasBlockingMappingWarnings) {
      toast.error("Choose columns whose sample values match the required fields.");
      return;
    }

    saveMappingForHeaders(headers, mapping);

    const seenSignatures = new Set<string>();
    const mappedData = rawData
      .map((row, index): ImportRow => {
        const debitResult = mapping.debitAmount
          ? parseAmountValue(row[mapping.debitAmount])
          : null;
        const creditResult = mapping.creditAmount
          ? parseAmountValue(row[mapping.creditAmount])
          : null;
        const amountResult = mapping.amount
          ? parseAmountValue(row[mapping.amount])
          : {
              amount: Math.max(debitResult?.amount || 0, creditResult?.amount || 0),
              isNegative: Boolean(debitResult?.amount),
              warning:
                debitResult?.warning && creditResult?.warning
                  ? "Missing or invalid amount"
                  : "",
            };
        const dateResult = parseDateValue(row[mapping.date]);
        const description = String(row[mapping.description] ?? "")
          .trim()
          .slice(0, MAX_DESCRIPTION_LENGTH);
        const splitType =
          creditResult?.amount && !debitResult?.amount
            ? "credit"
            : debitResult?.amount && !creditResult?.amount
              ? "debit"
              : null;
        const transactionType = splitType || guessType(
          mapping.type ? row[mapping.type] : null,
          mapping.amount || mapping.debitAmount || mapping.creditAmount,
          amountResult.isNegative
        );
        const item: Omit<Expense, "id" | "createdAt"> = {
          amount: amountResult.amount,
          date: dateResult.date,
          description,
          transactionType,
          paymentMethod: "upi",
          category: categorizeDescription(description),
        };

        const signature = buildImportSignature(item);
        const warnings = [
          ...getRowWarnings(item),
          amountResult.warning,
          dateResult.warning,
          debitResult?.amount && creditResult?.amount
            ? "Both debit and credit have values"
            : "",
          seenSignatures.has(signature) ? "Duplicate inside this import" : "",
          existingSignatures.has(signature) ? "Already exists in your account" : "",
        ].filter(Boolean);

        seenSignatures.add(signature);
        return { ...item, sourceRow: index + 2, warnings };
      })
      .filter((item) => item.amount > 0 || item.description || item.date);

    setPreviewData(mappedData);
    setStep("REVIEW");
  };

  const handleSave = async () => {
    if (invalidRowCount > 0) {
      toast.error("Fix or remove flagged rows before importing.");
      return;
    }

    setIsUploading(true);
    try {
      const payload = previewData.map((item) => ({
        amount: item.amount,
        category: item.category,
        paymentMethod: item.paymentMethod,
        transactionType: item.transactionType,
        description: item.description,
        date: item.date,
      }));
      const result = await addExpensesBulk(payload);
      if (result.ok) {
        toast.success(`Imported ${previewData.length} transactions.`);
        handleOpenChange(false);
      } else {
        toast.error(result.error || "Failed to import transactions.");
      }
    } catch {
      toast.error("An error occurred during import.");
    } finally {
      setIsUploading(false);
    }
  };

  const updatePreviewItem = (
    index: number,
    field: keyof Omit<Expense, "id" | "createdAt">,
    value: string | number
  ) => {
    setPreviewData((prev) =>
      prev.map((item, itemIndex) => {
        if (itemIndex !== index) return item;

        const next = {
          ...item,
          [field]: field === "description" ? String(value).slice(0, MAX_DESCRIPTION_LENGTH) : value,
        };
        return { ...next, warnings: getRowWarnings(next) };
      })
    );
  };

  const deletePreviewItem = (index: number) => {
    setPreviewData((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const updateMapping = (field: keyof ColumnMapping, value: string) => {
    setMapping((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "amount" && value) {
        next.debitAmount = "";
        next.creditAmount = "";
      }
      if ((field === "debitAmount" || field === "creditAmount") && value) {
        next.amount = "";
      }
      return next;
    });
  };

  const mappingFields: Array<{
    id: keyof ColumnMapping;
    label: string;
    required: boolean;
    helper: string;
  }> = [
    {
      id: "date",
      label: "Date",
      required: true,
      helper: "Transaction date from the statement.",
    },
    {
      id: "description",
      label: "Description",
      required: true,
      helper: "Merchant, narration, payee, or transaction details.",
    },
    {
      id: "amount",
      label: "Amount",
      required: !usesSplitAmounts,
      helper: "Use this for signed or single amount columns.",
    },
    {
      id: "debitAmount",
      label: "Debit Amount",
      required: false,
      helper: "Use this for separate expense/withdrawal columns.",
    },
    {
      id: "creditAmount",
      label: "Credit Amount",
      required: false,
      helper: "Use this for separate income/deposit columns.",
    },
    {
      id: "type",
      label: "Transaction Type",
      required: false,
      helper: "Optional Cr/Dr, paid/received, or debit/credit column.",
    },
  ];

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="h-[92vh] p-0 sm:h-[88vh]">
        <SheetHeader className="border-b border-border px-5 py-4 text-left">
          <SheetTitle className="text-xl font-semibold">Import UPI Transactions</SheetTitle>
          <SheetDescription>
            Upload a CSV or XLSX export, review every row, then save approved transactions.
          </SheetDescription>
        </SheetHeader>

        <div className="flex h-[calc(100%-5.5rem)] flex-col">
          {step === "UPLOAD" && (
            <div className="flex flex-1 flex-col gap-5 px-5 py-6">
              <button
                type="button"
                className="flex min-h-[22rem] flex-1 cursor-pointer flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-border bg-muted/20 p-8 text-center transition-colors hover:bg-muted/40"
                onDragOver={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="flex size-16 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileSpreadsheet />
                </span>
                <span className="flex flex-col gap-2">
                  <span className="text-lg font-medium">Drop a statement file here</span>
                  <span className="max-w-md text-sm text-muted-foreground">
                    CSV and XLSX exports are supported. Files must be under 2 MB and
                    contain up to {MAX_IMPORT_ROWS} transaction rows.
                  </span>
                </span>
                <Button type="button">
                  <Upload data-icon="inline-start" />
                  Select File
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={handleFileChange}
                />
              </button>

              <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
                <Info className="mt-0.5 shrink-0" />
                <p>
                  Legacy .xls files are blocked because safe browser parsing support is
                  limited. Export again as .xlsx or CSV from your UPI app.
                </p>
              </div>
            </div>
          )}

          {step === "MAP_COLUMNS" && (
            <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-5 py-6">
              <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 text-sm">
                <AlertCircle className="mt-0.5 shrink-0 text-primary" />
                <div className="flex flex-col gap-1">
                  <p className="font-medium">{fileName || "Statement file"}</p>
                  <p className="text-muted-foreground">
                    Match the columns from your file. You can edit or delete rows in
                    the next screen before anything is saved.
                  </p>
                </div>
              </div>

              <div className="grid gap-3">
                {mappingFields.map((field) => {
                  const selectedHeader = mapping[field.id];
                  const warning = getMappingWarning(field.id);
                  const samples = selectedHeader
                    ? getColumnSamples(rawData, selectedHeader)
                    : [];

                  return (
                    <div
                      key={field.id}
                      className="grid gap-3 rounded-lg border border-border bg-card p-4 lg:grid-cols-[13rem_1fr_1.3fr]"
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">{field.label}</span>
                          <Badge variant={field.required ? "default" : "outline"}>
                            {field.required ? "Required" : "Optional"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{field.helper}</p>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Select
                          value={selectedHeader || noSelectionValue}
                          onValueChange={(value) => {
                            if (value === null) return;
                            updateMapping(
                              field.id,
                              value === noSelectionValue ? "" : value
                            );
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a column" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectItem value={noSelectionValue}>None</SelectItem>
                              {headers.map((header) => (
                                <SelectItem key={header} value={header}>
                                  {header}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        {warning && (
                          <p className="text-xs text-destructive">{warning}</p>
                        )}
                      </div>

                      <div className="flex min-w-0 flex-col gap-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          Sample values
                        </p>
                        <div className="flex min-h-9 flex-wrap gap-2">
                          {samples.length > 0 ? (
                            samples.map((sample, index) => (
                              <Badge
                                key={`${sample}-${index}`}
                                variant="secondary"
                                className="max-w-full truncate"
                              >
                                {sample}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Select a column to preview values.
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {(amountModeWarning || hasBlockingMappingWarnings || !canGeneratePreview) && (
                <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
                  {amountModeWarning ||
                    (hasBlockingMappingWarnings
                      ? "Choose columns whose sample values match the required field types."
                      : "") ||
                    "Map Date, Description, and either Amount or Debit/Credit columns to continue."}
                </div>
              )}

              <div className="mt-auto flex justify-end gap-3">
                <Button variant="outline" onClick={() => setStep("UPLOAD")}>
                  Back
                </Button>
                <Button
                  onClick={generatePreview}
                  disabled={
                    !canGeneratePreview ||
                    Boolean(amountModeWarning) ||
                    hasBlockingMappingWarnings
                  }
                >
                  Continue to Review
                </Button>
              </div>
            </div>
          )}

          {step === "REVIEW" && (
            <>
              <div className="border-b border-border bg-background px-5 py-4">
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="rounded-lg border border-border bg-card p-3">
                    <p className="text-xs text-muted-foreground">Rows</p>
                    <p className="text-lg font-semibold">{previewData.length}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3">
                    <p className="text-xs text-muted-foreground">To Fix</p>
                    <p className="text-lg font-semibold">{invalidRowCount}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3">
                    <p className="text-xs text-muted-foreground">Expense</p>
                    <p className="truncate text-lg font-semibold">{formatCurrency(debitTotal)}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3">
                    <p className="text-xs text-muted-foreground">Income</p>
                    <p className="truncate text-lg font-semibold">{formatCurrency(creditTotal)}</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4">
                <div className="flex flex-col gap-3 pb-24">
                  {previewData.length === 0 && (
                    <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                      No importable rows were found.
                    </div>
                  )}

                  {previewData.map((item, index) => (
                    <div
                      key={`${item.sourceRow}-${index}`}
                      className={cn(
                        "grid gap-3 rounded-lg border bg-card p-4",
                        item.warnings.length > 0 ? "border-destructive/50" : "border-border"
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Row {item.sourceRow}</Badge>
                          {item.warnings.length > 0 ? (
                            <Badge variant="destructive">{item.warnings[0]}</Badge>
                          ) : (
                            <Badge variant="secondary">Ready</Badge>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove row ${item.sourceRow}`}
                          onClick={() => deletePreviewItem(index)}
                        >
                          <Trash2 />
                        </Button>
                      </div>

                      <div className="grid gap-3 lg:grid-cols-[1.3fr_9rem_8.5rem_9rem_12rem]">
                        <Input
                          value={item.description || ""}
                          aria-label={`Description for row ${item.sourceRow}`}
                          placeholder="Description"
                          onChange={(event) =>
                            updatePreviewItem(index, "description", event.target.value)
                          }
                        />
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.amount || ""}
                          aria-label={`Amount for row ${item.sourceRow}`}
                          onChange={(event) =>
                            updatePreviewItem(
                              index,
                              "amount",
                              Number.parseFloat(event.target.value)
                            )
                          }
                        />
                        <Input
                          type="date"
                          value={item.date}
                          aria-label={`Date for row ${item.sourceRow}`}
                          onChange={(event) =>
                            updatePreviewItem(index, "date", event.target.value)
                          }
                        />
                        <Select
                          value={item.transactionType}
                          onValueChange={(value) => {
                            if (value === null) return;
                            updatePreviewItem(index, "transactionType", value);
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectItem value="debit">Expense</SelectItem>
                              <SelectItem value="credit">Income</SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        <Select
                          value={item.category}
                          onValueChange={(value) => {
                            if (value === null) return;
                            updatePreviewItem(index, "category", value);
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {availableCategories.map((category) => (
                                <SelectItem key={category.id} value={category.name}>
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>

                      {item.warnings.length > 1 && (
                        <p className="text-xs text-muted-foreground">
                          {item.warnings.slice(1).join(" | ")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-border bg-background p-4">
                <div className="mx-auto flex max-w-4xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    {invalidRowCount > 0
                      ? "Fix or delete flagged rows before saving."
                      : "Only reviewed rows will be added to your account."}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setStep("MAP_COLUMNS")}
                      disabled={isUploading}
                    >
                      Back
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={
                        isUploading || previewData.length === 0 || invalidRowCount > 0
                      }
                    >
                      {isUploading
                        ? "Importing..."
                        : `Save ${previewData.length} Transactions`}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
