"use client";

import { Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/form";
import { ApiError, errorMessage } from "@/lib/api-client";

import { setLeadUrlParams } from "../hooks/use-lead-url-state";
import { useCreateLead } from "../queries";

export function AddLeadDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" aria-hidden />
          Add New Lead
        </Button>
      </DialogTrigger>
      <DialogContent title="Add New Lead" className="max-w-md">
        {/* Unmounted while closed, so the form starts fresh every time it opens. */}
        <AddLeadForm onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

type FieldName = "name" | "company" | "phone";

function AddLeadForm({ onDone }: { onDone: () => void }) {
  const createLead = useCreateLead();
  const [values, setValues] = useState<Record<FieldName, string>>({
    name: "",
    company: "",
    phone: "",
  });
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});

  const update = (field: FieldName) => (event: { target: { value: string } }) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!values.name.trim()) {
      setErrors({ name: "Name is required." });
      return;
    }

    createLead.mutate(
      {
        name: values.name.trim(),
        company: values.company.trim() || undefined,
        phone: values.phone.trim() || undefined,
      },
      {
        onSuccess: (lead) => {
          toast.success(`${lead.name} added`, {
            action: { label: "Open", onClick: () => setLeadUrlParams({ lead: String(lead.id) }) },
          });
          onDone();
        },
        onError: (error) => {
          if (error instanceof ApiError && error.details) setErrors(error.fieldErrors);
          else toast.error(errorMessage(error));
        },
      },
    );
  };

  const describedBy = (field: FieldName) => (errors[field] ? `lead-${field}-error` : undefined);

  return (
    <form onSubmit={handleSubmit} noValidate>
      <DialogBody className="space-y-4">
        <Field id="lead-name" label="Full Name" required error={errors.name}>
          <Input
            id="lead-name"
            value={values.name}
            onChange={update("name")}
            placeholder="e.g., John Doe"
            maxLength={120}
            autoComplete="off"
            autoFocus
            required
            invalid={Boolean(errors.name)}
            aria-describedby={describedBy("name")}
          />
        </Field>
        <Field id="lead-company" label="Company" optional error={errors.company}>
          <Input
            id="lead-company"
            value={values.company}
            onChange={update("company")}
            placeholder="e.g., Stark Industries"
            maxLength={120}
            autoComplete="off"
            invalid={Boolean(errors.company)}
            aria-describedby={describedBy("company")}
          />
        </Field>
        <Field id="lead-phone" label="Phone" optional error={errors.phone}>
          <Input
            id="lead-phone"
            type="tel"
            value={values.phone}
            onChange={update("phone")}
            placeholder="e.g., 555-0123"
            maxLength={40}
            autoComplete="off"
            invalid={Boolean(errors.phone)}
            aria-describedby={describedBy("phone")}
          />
        </Field>
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" onClick={onDone} disabled={createLead.isPending}>
          Cancel
        </Button>
        <Button type="submit" loading={createLead.isPending}>
          Save Lead
        </Button>
      </DialogFooter>
    </form>
  );
}
