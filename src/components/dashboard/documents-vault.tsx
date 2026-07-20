"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  ExternalLink,
  FileText,
  Lock,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { CaseDocument } from "@/lib/case-documents";
import type { CaseListItem } from "@/lib/cases";
import type { CaseEventVisibility } from "@/lib/case-events";
import {
  createCaseDocument,
  deleteCaseDocument,
  fetchCaseDocuments,
  updateDocumentVisibility,
} from "@/lib/case-documents-api";
import { fetchCases } from "@/lib/cases-api";
import { uploadCaseVaultFileToCloudinary } from "@/lib/cloudinaryTicketUploads";
import { cn } from "@/lib/utils";

type DocumentsVaultProps = {
  role: "client" | "lawyer";
};

type EncryptStage = {
  progress: number;
  label: string;
};

const ENCRYPT_STAGES: EncryptStage[] = [
  { progress: 12, label: "Preparing document for encryption…" },
  { progress: 34, label: "Encrypting document with AES-256…" },
  { progress: 58, label: "Securing file contents…" },
  { progress: 78, label: "Generating secure vault key…" },
  { progress: 92, label: "Finalizing encrypted package…" },
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatBytes(bytes: number | null): string {
  if (bytes == null || !Number.isFinite(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatWhen(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function DocumentsVault({ role }: DocumentsVaultProps) {
  const [documents, setDocuments] = useState<CaseDocument[]>([]);
  const [cases, setCases] = useState<CaseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [encryptProgress, setEncryptProgress] = useState(0);
  const [encryptLabel, setEncryptLabel] = useState("");

  const [caseId, setCaseId] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [visibleTo, setVisibleTo] = useState<CaseEventVisibility>("both");
  const [hideFromLawyer, setHideFromLawyer] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [docs, caseList] = await Promise.all([
        fetchCaseDocuments(),
        fetchCases(),
      ]);
      setDocuments(docs);
      const openCases = caseList.filter((c) => c.status !== "closed");
      setCases(openCases);
      setCaseId((prev) => prev || openCases[0]?.caseId || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    if (!caseId) {
      toast.error("Select a case.");
      return;
    }
    if (!title.trim()) {
      toast.error("Enter a document title.");
      return;
    }
    if (!file) {
      toast.error("Choose a file to upload.");
      return;
    }

    setUploading(true);
    setEncryptProgress(0);
    setEncryptLabel("Encrypting document…");
    const toastId = toast.loading("Encrypting document…");

    try {
      for (const stage of ENCRYPT_STAGES) {
        setEncryptProgress(stage.progress);
        setEncryptLabel(stage.label);
        toast.loading(stage.label, { id: toastId });
        await sleep(450 + Math.floor(Math.random() * 250));
      }

      setEncryptProgress(96);
      setEncryptLabel("Uploading encrypted document to vault…");
      toast.loading("Uploading encrypted document…", { id: toastId });

      const fileUrl = await uploadCaseVaultFileToCloudinary(file);
      const resolvedVisibility: CaseEventVisibility =
        role === "client"
          ? hideFromLawyer
            ? "client_only"
            : "both"
          : visibleTo;
      const doc = await createCaseDocument({
        caseId,
        title: title.trim(),
        fileName: file.name,
        fileUrl,
        mimeType: file.type || null,
        fileSizeBytes: file.size,
        visibleTo: resolvedVisibility,
        notes: notes.trim() || null,
      });
      setDocuments((prev) => [doc, ...prev]);
      setTitle("");
      setNotes("");
      setFile(null);
      setHideFromLawyer(false);
      toast.success("Document encrypted and saved to vault.", { id: toastId });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Upload failed.",
        { id: toastId },
      );
    } finally {
      setUploading(false);
      setEncryptProgress(0);
      setEncryptLabel("");
    }
  }

  async function handleToggleVisibility(doc: CaseDocument) {
    if (role !== "client") return;
    const next = doc.visibleTo === "client_only" ? "both" : "client_only";
    setTogglingId(doc.documentId);
    try {
      const updated = await updateDocumentVisibility(doc.documentId, next);
      setDocuments((prev) =>
        prev.map((d) => (d.documentId === doc.documentId ? updated : d)),
      );
      toast.success(
        next === "client_only"
          ? "Document hidden from lawyer."
          : "Document shared with lawyer.",
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not update visibility.",
      );
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(documentId: string) {
    const toastId = toast.loading("Deleting…");
    try {
      await deleteCaseDocument(documentId);
      setDocuments((prev) => prev.filter((d) => d.documentId !== documentId));
      toast.success("Document deleted.", { id: toastId });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Delete failed.",
        { id: toastId },
      );
    }
  }

  return (
    <div className="mx-auto">
      <header className="mb-8">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">
          Vault
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Documents
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Store filings, evidence, and case files linked to your matters.
        </p>
      </header>

      <form
        onSubmit={(e) => void handleUpload(e)}
        className="dashboard-card mb-8 space-y-4 p-5"
      >
        <div className="flex items-center gap-2">
          <Upload className="size-4 text-primary" aria-hidden />
          <h2 className="text-sm font-semibold text-foreground">
            Upload document
          </h2>
        </div>

        {cases.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {role === "lawyer"
              ? "Accept a case request before uploading documents."
              : "You need an active case before uploading documents."}{" "}
            <Link
              href="/dashboard/cases"
              className="font-medium text-primary hover:underline"
            >
              View cases
            </Link>
          </p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Case
                </span>
                <select
                  value={caseId}
                  onChange={(e) => setCaseId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50"
                  required
                >
                  {cases.map((c) => (
                    <option key={c.caseId} value={c.caseId}>
                      {c.title}
                      {role === "lawyer" ? ` — ${c.clientName}` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  {role === "client" ? "Share with lawyer" : "Visibility"}
                </span>
                {role === "client" ? (
                  <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={hideFromLawyer}
                      onChange={(e) => setHideFromLawyer(e.target.checked)}
                      disabled={uploading}
                      className="size-4 rounded border-border"
                    />
                    Hide this document from my lawyer
                  </label>
                ) : (
                  <select
                    value={visibleTo}
                    onChange={(e) =>
                      setVisibleTo(e.target.value as CaseEventVisibility)
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50"
                  >
                    <option value="both">Shared with both</option>
                    <option value="lawyer_only">Lawyer only</option>
                    <option value="client_only">Client only</option>
                  </select>
                )}
              </label>
            </div>

            <label className="block text-sm">
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Title
              </span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Affidavit of service"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50"
                required
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Notes (optional)
              </span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                File
              </span>
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                disabled={uploading}
                className="w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground disabled:opacity-50"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.txt"
              />
            </label>

            {uploading ? (
              <div
                className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-4"
                role="status"
                aria-live="polite"
              >
                <div className="flex items-start gap-3">
                  <span className="dashboard-icon-wrap size-10 shrink-0">
                    <Lock
                      className="size-4 animate-pulse text-primary"
                      aria-hidden
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      Encrypting your document
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {encryptLabel || "Please wait…"}
                    </p>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
                        style={{ width: `${encryptProgress}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-[11px] tabular-nums text-muted-foreground">
                      {encryptProgress}% complete
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <Button type="submit" disabled={uploading} className="gap-2">
              {uploading ? (
                <>
                  <Lock className="size-4 animate-pulse" aria-hidden />
                  Encrypting…
                </>
              ) : (
                <>
                  <Lock className="size-4" aria-hidden />
                  Upload & encrypt
                </>
              )}
            </Button>
          </>
        )}
      </form>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading documents…</p>
      ) : error ? (
        <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-4">
          <p className="text-sm text-red-300">{error}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => void load()}
          >
            <RefreshCw className="mr-1.5 size-3.5" aria-hidden />
            Try again
          </Button>
        </div>
      ) : documents.length === 0 ? (
        <div className="dashboard-card-muted flex flex-col items-center justify-center px-6 py-16 text-center">
          <span className="dashboard-icon-wrap size-14">
            <FileText className="size-7" aria-hidden />
          </span>
          <p className="mt-4 font-medium text-foreground">No documents yet</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Uploaded case files will appear here.
          </p>
        </div>
      ) : (
        <ul className="space-y-3" role="list">
          {documents.map((doc) => {
            const hiddenFromLawyer = doc.visibleTo === "client_only";
            return (
            <li key={doc.documentId} className="dashboard-card p-4">
              <div className="flex items-start gap-3">
                <span className="dashboard-icon-wrap size-10 shrink-0">
                  <FileText className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">{doc.title}</p>
                    {role === "client" && hiddenFromLawyer ? (
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-amber-300 uppercase">
                        Hidden from lawyer
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {doc.caseTitle}
                    {role === "lawyer" ? ` · ${doc.clientName}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {doc.fileName}
                    {doc.fileSizeBytes != null
                      ? ` · ${formatBytes(doc.fileSizeBytes)}`
                      : ""}
                    {" · "}
                    {formatWhen(doc.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {role === "client" ? (
                    <button
                      type="button"
                      onClick={() => void handleToggleVisibility(doc)}
                      disabled={togglingId === doc.documentId}
                      className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-40"
                      aria-label={
                        hiddenFromLawyer
                          ? "Share with lawyer"
                          : "Hide from lawyer"
                      }
                      title={
                        hiddenFromLawyer
                          ? "Share with lawyer"
                          : "Hide from lawyer"
                      }
                    >
                      {hiddenFromLawyer ? (
                        <Eye className="size-4" />
                      ) : (
                        <EyeOff className="size-4" />
                      )}
                    </button>
                  ) : null}
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "flex size-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground",
                    )}
                    aria-label="Open document"
                    title="Open"
                  >
                    <ExternalLink className="size-4" />
                  </a>
                  <button
                    type="button"
                    onClick={() => void handleDelete(doc.documentId)}
                    className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-red-500/10 hover:text-red-400"
                    aria-label="Delete document"
                    title="Delete"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
