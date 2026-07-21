import { FormEvent, useState } from "react";
import { apiFetch } from "../lib/clientFetch";

export interface TrainerFormValues {
  id?: string;
  name: string;
  subjects: string[];
  location: string;
  email: string;
  hourlyRate: number | null;
  rating: number | null;
}

const inputCls =
  "w-full bg-surface text-fg border border-line-strong rounded-lg px-3 py-2 placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary";

/**
 * Create/edit form. Server-side zod remains the source of truth — this form
 * relies on HTML constraints for the cheap checks and renders the API's
 * validation details when the server rejects.
 */
const TrainerForm = ({
  initial,
  onSaved,
  onCancel,
}: {
  initial?: TrainerFormValues;
  onSaved: () => void;
  onCancel: () => void;
}) => {
  const [name, setName] = useState(initial?.name ?? "");
  const [subjects, setSubjects] = useState(initial?.subjects.join(", ") ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [hourlyRate, setHourlyRate] = useState(
    initial?.hourlyRate != null ? String(initial.hourlyRate) : ""
  );
  const [rating, setRating] = useState(
    initial?.rating != null ? String(initial.rating) : ""
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setSaving(true);
    const payload = {
      name,
      subjects: subjects
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      location,
      email,
      hourlyRate: hourlyRate === "" ? null : Number(hourlyRate),
      rating: rating === "" ? null : Number(rating),
    };
    const res = initial?.id
      ? await apiFetch(`/api/trainers/${initial.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        })
      : await apiFetch("/api/trainers", {
          method: "POST",
          body: JSON.stringify(payload),
        });
    setSaving(false);
    if (res.ok) return onSaved();
    setErrors(
      Array.isArray(res.details) && res.details.length
        ? (res.details as string[])
        : [res.error ?? "Save failed"]
    );
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {errors.length > 0 && (
        <div role="alert" className="bg-danger-soft border border-danger-line text-danger-ink rounded-lg px-4 py-3 text-sm">
          <ul className="list-disc pl-4">
            {errors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-fg mb-1" htmlFor="t-name">Name *</label>
          <input id="t-name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required maxLength={200} />
        </div>
        <div>
          <label className="block text-sm font-medium text-fg mb-1" htmlFor="t-email">Email *</label>
          <input id="t-email" type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-fg mb-1" htmlFor="t-subjects">
            Subjects * <span className="text-fg-subtle font-normal">(comma-separated)</span>
          </label>
          <input id="t-subjects" className={inputCls} value={subjects} onChange={(e) => setSubjects(e.target.value)} required placeholder="React.js, Next.js, TypeScript" />
        </div>
        <div>
          <label className="block text-sm font-medium text-fg mb-1" htmlFor="t-location">Location *</label>
          <input id="t-location" className={inputCls} value={location} onChange={(e) => setLocation(e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-fg mb-1" htmlFor="t-rate">Hourly rate €</label>
            <input id="t-rate" type="number" min="0" step="0.01" className={inputCls} value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-fg mb-1" htmlFor="t-rating">Rating (1–5)</label>
            <input id="t-rating" type="number" min="1" max="5" className={inputCls} value={rating} onChange={(e) => setRating(e.target.value)} />
          </div>
        </div>
      </div>
      <div className="flex justify-end space-x-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg border border-line-strong text-fg hover:bg-surface-muted">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-hover disabled:opacity-60">
          {saving ? "Saving…" : initial?.id ? "Save changes" : "Create trainer"}
        </button>
      </div>
    </form>
  );
};

export default TrainerForm;
