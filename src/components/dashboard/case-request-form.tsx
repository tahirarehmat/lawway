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
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
      {requestedLawyerName ? (
        <div className="rounded-lg border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-secondary">
          <p className="font-medium">Sending to {requestedLawyerName}</p>
          <p className="mt-1 text-neutral/65">
            This advocate will be notified and can accept your matter directly.
          </p>
        </div>
      ) : null}

      <div>
        <label htmlFor="request-title" className="mb-1.5 block text-sm font-medium text-secondary">
          Matter title
        </label>
        <input
          id="request-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Residential lease dispute"
          className="w-full rounded-lg border border-black/10 bg-white px-4 py-2.5 text-sm text-secondary outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
          required
        />
      </div>

      <div>
        <label
          htmlFor="request-description"
          className="mb-1.5 block text-sm font-medium text-secondary"
        >
          Brief description
        </label>
        <textarea
          id="request-description"
          value={briefDescription}
          onChange={(e) => setBriefDescription(e.target.value)}
          placeholder="Describe your legal matter, key facts, and what you need help with."
          rows={5}
          className="w-full resize-y rounded-lg border border-black/10 bg-white px-4 py-2.5 text-sm text-secondary outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
          required
        />
      </div>

      <div>
        <label
          htmlFor="request-conditions"
          className="mb-1.5 block text-sm font-medium text-secondary"
        >
          Special conditions <span className="font-normal text-neutral/50">(optional)</span>
        </label>
        <textarea
          id="request-conditions"
          value={specialConditions}
          onChange={(e) => setSpecialConditions(e.target.value)}
          placeholder="Timeline constraints, preferred communication, or other notes."
          rows={3}
          className="w-full resize-y rounded-lg border border-black/10 bg-white px-4 py-2.5 text-sm text-secondary outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {error ? (
        <p className="text-sm text-rose-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3 pt-2">
        <Button
          type="submit"
          disabled={submitting}
          className="bg-secondary text-white hover:bg-secondary/90"
        >
          {submitting
            ? "Submitting…"
            : requestedLawyerName
              ? `Send to ${requestedLawyerName}`
              : "Submit request"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          className="border-black/10 text-secondary"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
