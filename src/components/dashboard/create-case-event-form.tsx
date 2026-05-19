"use client";

import { FormEvent, useState } from "react";
import type { CaseEventType } from "@/lib/case-events";
import { EVENT_TYPE_LABELS } from "@/lib/case-events";
import { createCaseEvent } from "@/lib/cases-api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const EVENT_TYPES = Object.keys(EVENT_TYPE_LABELS) as CaseEventType[];

type CreateCaseEventFormProps = {
  caseId: string;
  onCreated?: () => void;
};

export function CreateCaseEventForm({ caseId, onCreated }: CreateCaseEventFormProps) {
  const [open, setOpen] = useState(false);
  const [eventType, setEventType] = useState<CaseEventType>("hearing");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [location, setLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title is required.");
      return;
    }

    setSubmitting(true);
    try {
      await createCaseEvent(caseId, {
        eventType,
        title: title.trim(),
        description: description.trim() || null,
        startsAt: startsAt ? new Date(startsAt).toISOString() : null,
        location: location.trim() || null,
      });
      toast.success("Event created");
      setTitle("");
      setDescription("");
      setStartsAt("");
      setLocation("");
      setOpen(false);
      onCreated?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create event.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <Button
        type="button"
        size="sm"
        onClick={() => setOpen(true)}
        className="bg-primary text-secondary hover:bg-primary/90"
      >
        Add event
      </Button>
    );
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="mt-4 space-y-3 rounded-xl border border-black/5 bg-white p-4"
    >
      <p className="text-sm font-semibold text-secondary">New case event</p>

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral/55">Type</label>
        <select
          value={eventType}
          onChange={(e) => setEventType(e.target.value as CaseEventType)}
          className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-secondary"
        >
          {EVENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {EVENT_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral/55">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral/55">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full resize-y rounded-lg border border-black/10 px-3 py-2 text-sm"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral/55">Starts at</label>
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral/55">Location</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={submitting} className="bg-secondary text-white">
          {submitting ? "Saving…" : "Save event"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
