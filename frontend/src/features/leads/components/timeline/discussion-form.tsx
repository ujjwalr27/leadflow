"use client";

import { addDays } from "date-fns";
import { useId, useState, type FormEvent, type KeyboardEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/form";
import { useNow } from "@/hooks/use-now";
import { ApiError, errorMessage } from "@/lib/api-client";
import { localInputsToIso, toDateInputValue } from "@/lib/time";

import { classifyFollowUp, isFollowUpDue } from "../../lib/follow-ups";
import { useCreateDiscussion } from "../../queries";
import type { Lead } from "../../types";

const DEFAULT_FOLLOW_UP_TIME = "10:00";

interface FormErrors {
  body?: string;
  followUp?: string;
}

/** Log a new discussion, optionally scheduling the next follow-up. */
export function DiscussionForm({ lead }: { lead: Lead }) {
  const id = useId();
  const now = useNow();
  const createDiscussion = useCreateDiscussion(lead.id);

  const [body, setBody] = useState("");
  const [scheduleFollowUp, setScheduleFollowUp] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [markDone, setMarkDone] = useState(true);
  const [errors, setErrors] = useState<FormErrors>({});

  // Offer to close out a follow-up that is due (today or overdue) when logging a note.
  const hasDueFollowUp = isFollowUpDue(classifyFollowUp(lead.next_follow_up_at, now));

  const toggleFollowUp = (checked: boolean) => {
    setScheduleFollowUp(checked);
    setErrors((current) => ({ ...current, followUp: undefined }));
    if (checked && !date) {
      setDate(toDateInputValue(addDays(new Date(), 1)));
      setTime(DEFAULT_FOLLOW_UP_TIME);
    }
  };

  const reset = () => {
    setBody("");
    setScheduleFollowUp(false);
    setDate("");
    setTime("");
    setMarkDone(true);
    setErrors({});
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: FormErrors = {};
    if (!body.trim()) nextErrors.body = "Write a note before saving.";

    let followUpAt: string | null = null;
    if (scheduleFollowUp) {
      followUpAt = localInputsToIso(date, time);
      if (!followUpAt) nextErrors.followUp = "Pick a date and time for the follow-up.";
      else if (new Date(followUpAt) <= new Date())
        nextErrors.followUp = "Follow-up must be in the future.";
    }

    setErrors(nextErrors);
    if (nextErrors.body || nextErrors.followUp) return;

    createDiscussion.mutate(
      {
        body: body.trim(),
        follow_up_at: followUpAt,
        clear_follow_up: !scheduleFollowUp && hasDueFollowUp && markDone,
      },
      {
        onSuccess: () => {
          reset();
          toast.success(followUpAt ? "Note saved and follow-up scheduled" : "Note saved");
        },
        onError: (error) => {
          if (error instanceof ApiError && error.details) {
            const fieldErrors = error.fieldErrors;
            setErrors({ body: fieldErrors.body, followUp: fieldErrors.follow_up_at });
          } else {
            toast.error(`Couldn't save note: ${errorMessage(error)}`);
          }
        },
      },
    );
  };

  // Ctrl/Cmd + Enter submits from the textarea.
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  const bodyErrorId = `${id}-body-error`;
  const followUpErrorId = `${id}-follow-up-error`;

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-3 border-t border-gray-200 bg-white px-5 py-4"
      aria-label="Log a new discussion"
    >
      <div>
        <Textarea
          value={body}
          onChange={(event) => {
            setBody(event.target.value);
            if (errors.body) setErrors((current) => ({ ...current, body: undefined }));
          }}
          onKeyDown={handleKeyDown}
          placeholder="Log a new discussion…"
          aria-label="Discussion note"
          maxLength={5000}
          rows={3}
          invalid={Boolean(errors.body)}
          aria-describedby={errors.body ? bodyErrorId : undefined}
        />
        {errors.body && (
          <p id={bodyErrorId} role="alert" className="mt-1.5 text-sm text-red-600">
            {errors.body}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-800">
          <input
            type="checkbox"
            checked={scheduleFollowUp}
            onChange={(event) => toggleFollowUp(event.target.checked)}
            className="size-4 rounded border-gray-300 accent-blue-600"
          />
          Set Follow-up
        </label>
        <Input
          type="date"
          value={date}
          min={toDateInputValue(now)}
          onChange={(event) => setDate(event.target.value)}
          disabled={!scheduleFollowUp}
          aria-label="Follow-up date"
          invalid={Boolean(errors.followUp)}
          aria-describedby={errors.followUp ? followUpErrorId : undefined}
          className="w-auto"
        />
        <Input
          type="time"
          value={time}
          onChange={(event) => setTime(event.target.value)}
          disabled={!scheduleFollowUp}
          aria-label="Follow-up time"
          invalid={Boolean(errors.followUp)}
          aria-describedby={errors.followUp ? followUpErrorId : undefined}
          className="w-auto"
        />
        <Button
          type="submit"
          variant="dark"
          className="ml-auto"
          loading={createDiscussion.isPending}
        >
          Save Note
        </Button>
      </div>

      {errors.followUp && (
        <p id={followUpErrorId} role="alert" className="text-sm text-red-600">
          {errors.followUp}
        </p>
      )}

      {hasDueFollowUp && !scheduleFollowUp && (
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={markDone}
            onChange={(event) => setMarkDone(event.target.checked)}
            className="size-4 rounded border-gray-300 accent-blue-600"
          />
          Mark the current follow-up as done
        </label>
      )}
    </form>
  );
}
