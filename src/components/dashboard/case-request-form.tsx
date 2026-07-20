"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createCaseRequest } from "@/lib/case-requests-api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type CaseRequestFormProps = {
  defaultTitle?: string;
  requestedLawyerId?: string | null;
  requestedLawyerName?: string | null;
  redirectTo?: string;
};

export function CaseRequestForm({
  defaultTitle = "",
  requestedLawyerId = null,
  requestedLawyerName = null,
  redirectTo = "/dashboard/cases",
}: CaseRequestFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(defaultTitle);
  const [briefDescription, setBriefDescription] = useState("");
  const [specialConditions, setSpecialConditions] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !briefDescription.trim()) {
      setError("Title and description are required.");
      return;
    }

    setSubmitting(true);
    try {
      await createCaseRequest({
        title: title.trim(),
        briefDescription: briefDescription.trim(),
        specialConditions: specialConditions.trim() || null,
        requestedLawyerId: requestedLawyerId || null,
      });
      toast.success(
        requestedLawyerName
          ? `Request sent to ${requestedLawyerName}`
          : "Case request submitted",
      );
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to submit request.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
      {requestedLawyerName ? (
        <div className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-foreground">
          <p className="font-medium">Sending to {requestedLawyerName}</p>
          <p className="mt-1 text-muted-foreground">
            This advocate will be notified and can accept your matter directly.
          </p>
        </div>
      ) : null}

      <div>
        <label htmlFor="request-title" className="mb-1.5 block text-sm font-medium text-foreground">
          Matter title
        </label>
        <input
          id="request-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Residential lease dispute"
          className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/30"
          required
        />
      </div>

      <div>
        <label
          htmlFor="request-description"
          className="mb-1.5 block text-sm font-medium text-foreground"
        >
          Brief description
        </label>
        <textarea
          id="request-description"
          value={briefDescription}
          onChange={(e) => setBriefDescription(e.target.value)}
          placeholder="Describe your legal matter, key facts, and what you need help with."
          rows={5}
          className="w-full resize-y rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/30"
          required
        />
      </div>

      <div>
        <label
          htmlFor="request-conditions"
          className="mb-1.5 block text-sm font-medium text-foreground"
        >
          Special conditions <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <textarea
          id="request-conditions"
          value={specialConditions}
          onChange={(e) => setSpecialConditions(e.target.value)}
          placeholder="Timeline constraints, preferred communication, or other notes."
          rows={3}
          className="w-full resize-y rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/30"
        />
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3 pt-2">
        <Button type="submit" disabled={submitting}>
          {submitting
            ? "Submitting…"
            : requestedLawyerName
              ? `Send to ${requestedLawyerName}`
              : "Submit request"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
