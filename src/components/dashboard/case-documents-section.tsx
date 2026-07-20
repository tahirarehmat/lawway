"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  Eye,
  EyeOff,
  ExternalLink,
  FileText,
  Lock,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { CaseDocument } from "@/lib/case-documents";
import type { CaseEventVisibility } from "@/lib/case-events";
import {
  createCaseDocument,
  deleteCaseDocument,
  fetchDocumentsForCase,
  updateDocumentVisibility,
} from "@/lib/case-documents-api";
import { uploadCaseVaultFileToCloudinary } from "@/lib/cloudinaryTicketUploads";
import { cn } from "@/lib/utils";

type CaseDocumentsSectionProps = {
  caseId: string;
  role: "client" | "lawyer";
};

const ENCRYPT_STAGES = [
  { progress: 18, label: "Preparing document for encryption…" },
  { progress: 42, label: "Encrypting document with AES-256…" },
  { progress: 68, label: "Securing file contents…" },
  { progress: 88, label: "Finalizing encrypted package…" },
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

export function CaseDocumentsSection({
  caseId,
  role,
}: CaseDocumentsSectionProps) {
  const [documents, setDocuments] = useState<CaseDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [encryptProgress, setEncryptProgress] = useState(0);
  const [encryptLabel, setEncryptLabel] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [hideFromLawyer, setHideFromLawyer] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const docs = await fetchDocumentsForCase(caseId);
      setDocuments(docs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents.");
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Enter a document title.");
      return;
    }
    if (!file) {
      toast.error("Choose a file to upload.");
      return;
    }

    const visibleTo: CaseEventVisibility =
      role === "client" && hideFromLawyer ? "client_only" : "both";

    setUploading(true);
    setEncryptProgress(0);
    setEncryptLabel("Encrypting document…");
    const toastId = toast.loading("Encrypting document…");

    try {
      for (const stage of ENCRYPT_STAGES) {
        setEncryptProgress(stage.progress);
        setEncryptLabel(stage.label);
        toast.loading(stage.label, { id: toastId });
        await sleep(400 + Math.floor(Math.random() * 200));
      }

      setEncryptProgress(95);
      setEncryptLabel("Uploading encrypted document…");
      toast.loading("Uploading encrypted document…", { id: toastId });

      const fileUrl = await uploadCaseVaultFileToCloudinary(file);
      const doc = await createCaseDocument({
        caseId,
        title: title.trim(),
        fileName: file.name,
        fileUrl,
        mimeType: file.type || null,
        fileSizeBytes: file.size,
        visibleTo,
        notes: notes.trim() || null,
      });

      setDocuments((prev) => [doc, ...prev]);
      setTitle("");
      setNotes("");
      setFile(null);
      setHideFromLawyer(false);
      setShowUpload(false);
      toast.success("Document encrypted and saved.", { id: toastId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.", {
        id: toastId,
      });
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
      toast.error(err instanceof Error ? err.message : "Delete failed.", {
        id: toastId,
      });
    }
  }

  return (
    <section className="dashboard-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Documents
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {role === "client"
              ? "Files for this case. You can hide any document from your lawyer."
              : "Shared case files visible to you for this matter."}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setShowUpload((v) => !v)}
        >
          <Upload className="size-3.5" aria-hidden />
          {showUpload ? "Cancel" : "Upload"}
        </Button>
      </div>

      {showUpload ? (
        <form
          onSubmit={(e) => void handleUpload(e)}
          className="mt-5 space-y-3 rounded-xl border border-border bg-muted/20 p-4"
        >
          <label className="block text-sm">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Title
            </span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Affidavit of service"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
              required
              disabled={uploading}
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
              className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
              disabled={uploading}
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

          {role === "client" ? (
            <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={hideFromLawyer}
                onChange={(e) => setHideFromLawyer(e.target.checked)}
                disabled={uploading}
                className="size-4 rounded border-border"
              />
              Hide from lawyer
            </label>
          ) : null}

          {uploading ? (
            <div className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Lock className="size-4 animate-pulse text-primary" aria-hidden />
                Encrypting your document
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {encryptLabel}
              </p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-300"
                  style={{ width: `${encryptProgress}%` }}
                />
              </div>
            </div>
          ) : null}

          <Button type="submit" disabled={uploading} className="gap-2">
            <Lock className="size-4" aria-hidden />
            {uploading ? "Encrypting…" : "Upload & encrypt"}
          </Button>
        </form>
      ) : null}

      {loading ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading documents…</p>
      ) : error ? (
        <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          {error}
          <button
            type="button"
            className="ml-2 font-medium underline"
            onClick={() => void load()}
          >
            Retry
          </button>
        </div>
      ) : documents.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No documents for this case yet.
        </p>
      ) : (
        <ul className="mt-4 space-y-3" role="list">
          {documents.map((doc) => {
            const hiddenFromLawyer = doc.visibleTo === "client_only";
            return (
              <li
                key={doc.documentId}
                className="rounded-xl border border-border bg-card px-4 py-3"
              >
                <div className="flex items-start gap-3">
                  <span className="dashboard-icon-wrap size-9 shrink-0">
                    <FileText className="size-3.5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">{doc.title}</p>
                      {role === "client" && hiddenFromLawyer ? (
                        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-amber-300 uppercase">
                          Hidden from lawyer
                        </span>
                      ) : null}
                      {role === "client" && !hiddenFromLawyer ? (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-emerald-300 uppercase">
                          Shared
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Uploaded by {doc.uploaderName}
                      {" · "}
                      {doc.fileName}
                      {doc.fileSizeBytes != null
                        ? ` · ${formatBytes(doc.fileSizeBytes)}`
                        : ""}
                      {" · "}
                      {formatWhen(doc.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    {role === "client" ? (
                      <button
                        type="button"
                        onClick={() => void handleToggleVisibility(doc)}
                        disabled={togglingId === doc.documentId}
                        className={cn(
                          "flex size-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-40",
                        )}
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
                      className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
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
    </section>
  );
}
