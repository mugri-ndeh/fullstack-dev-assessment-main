import { FormEvent, useState } from "react";
import { apiFetch } from "../lib/clientFetch";
import { useLocations } from "../hooks/useLocations";

export interface CourseFormValues {
  id?: string;
  name: string;
  date: string;
  subjects: string[];
  locationId: string;
  participants: number;
  notes: string | null;
  price: number;
  trainerPrice: number;
  status: string;
  trainerId: string | null;
}

interface Conflict {
  type: string;
  message: string;
}

interface EmailNotification {
  sent: boolean;
  to: string;
  error?: string;
}

const inputCls =
  "w-full bg-surface text-fg border border-line-strong rounded-lg px-3 py-2 placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary";

/**
 * Create/edit course form with the conflict-override flow: a 409 renders the
 * structured conflicts and a "Save anyway" button that re-submits with
 * overrideConflicts: true. Assignment emails' outcome is passed to onSaved
 * so the page can show whether the trainer was notified.
 */
const CourseForm = ({
  initial,
  trainers,
  onSaved,
  onCancel,
}: {
  initial?: CourseFormValues;
  trainers: { id: string; name: string }[];
  onSaved: (emailNotification?: EmailNotification) => void;
  onCancel: () => void;
}) => {
  const [name, setName] = useState(initial?.name ?? "");
  const [date, setDate] = useState(initial?.date ?? "");
  const [subjects, setSubjects] = useState(initial?.subjects.join(", ") ?? "");
  const [locationId, setLocationId] = useState(initial?.locationId ?? "");
  const [participants, setParticipants] = useState(
    initial ? String(initial.participants) : "10"
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [price, setPrice] = useState(initial ? String(initial.price) : "");
  const [trainerPrice, setTrainerPrice] = useState(
    initial ? String(initial.trainerPrice) : ""
  );
  const [status, setStatus] = useState(initial?.status ?? "DRAFT");
  const [trainerId, setTrainerId] = useState(initial?.trainerId ?? "");
  const {
    locations,
    isLoading: locationsLoading,
    error: locationsError,
  } = useLocations();
  const [errors, setErrors] = useState<string[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[] | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent | null, overrideConflicts = false) => {
    e?.preventDefault();
    setErrors([]);
    setConflicts(null);
    setSaving(true);
    const payload = {
      name,
      date,
      subjects: subjects.split(",").map((s) => s.trim()).filter(Boolean),
      locationId,
      participants: Number(participants),
      notes: notes || null,
      price: Number(price),
      trainerPrice: Number(trainerPrice),
      status,
      trainerId: trainerId || null,
      overrideConflicts,
    };
    const res = initial?.id
      ? await apiFetch<{ emailNotification?: EmailNotification }>(
          `/api/courses/${initial.id}`,
          { method: "PUT", body: JSON.stringify(payload) }
        )
      : await apiFetch<{ emailNotification?: EmailNotification }>(
          "/api/courses",
          { method: "POST", body: JSON.stringify(payload) }
        );
    setSaving(false);

    if (res.ok) return onSaved(res.data?.emailNotification);

    if (res.status === 409) {
      const detail = res.details as { conflicts?: Conflict[] } | undefined;
      setConflicts(detail?.conflicts ?? [{ type: "UNKNOWN", message: res.error ?? "Conflict" }]);
      return;
    }
    setErrors(
      Array.isArray(res.details) && res.details.length
        ? (res.details as string[])
        : [res.error ?? "Save failed"]
    );
  };

  return (
    <form onSubmit={(e) => submit(e)} className="space-y-4">
      {errors.length > 0 && (
        <div role="alert" className="bg-danger-soft border border-danger-line text-danger-ink rounded-lg px-4 py-3 text-sm">
          <ul className="list-disc pl-4">
            {errors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {conflicts && (
        <div role="alert" className="bg-warning-soft border border-warning-line text-warning-ink rounded-lg px-4 py-3 text-sm">
          <p className="font-semibold mb-1">Scheduling conflicts detected:</p>
          <ul className="list-disc pl-4 mb-3">
            {conflicts.map((c, i) => (
              <li key={i}>{c.message}</li>
            ))}
          </ul>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => submit(null, true)}
              className="bg-warning hover:bg-warning-hover text-warning-fg px-3 py-1.5 rounded-lg disabled:opacity-60"
            >
              Save anyway
            </button>
            <button
              type="button"
              onClick={() => setConflicts(null)}
              className="border border-warning-line px-3 py-1.5 rounded-lg"
            >
              Go back
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-fg mb-1" htmlFor="c-name">Course name *</label>
          <input id="c-name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required maxLength={200} />
        </div>
        <div>
          <label className="block text-sm font-medium text-fg mb-1" htmlFor="c-date">Date *</label>
          <input id="c-date" type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-fg mb-1" htmlFor="c-location">Location *</label>
          <select
            id="c-location"
            className={inputCls}
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            required
            disabled={locationsLoading || Boolean(locationsError)}
          >
            <option value="" disabled>
              {locationsLoading ? "Loading locations…" : "— Select a location —"}
            </option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
          {locationsError && (
            <p className="text-danger-ink text-sm mt-1">
              Could not load locations: {locationsError}
            </p>
          )}
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-fg mb-1" htmlFor="c-subjects">
            Subjects * <span className="text-fg-subtle font-normal">(comma-separated)</span>
          </label>
          <input id="c-subjects" className={inputCls} value={subjects} onChange={(e) => setSubjects(e.target.value)} required placeholder="React.js, Next.js" />
        </div>
        <div>
          <label className="block text-sm font-medium text-fg mb-1" htmlFor="c-participants">Participants *</label>
          <input id="c-participants" type="number" min="1" className={inputCls} value={participants} onChange={(e) => setParticipants(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-fg mb-1" htmlFor="c-status">Status</label>
          <select id="c-status" className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
            {["DRAFT", "SCHEDULED", "COMPLETED", "CANCELLED"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-fg mb-1" htmlFor="c-price">Course price € *</label>
          <input id="c-price" type="number" min="0" step="0.01" className={inputCls} value={price} onChange={(e) => setPrice(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-fg mb-1" htmlFor="c-tprice">Trainer price € *</label>
          <input id="c-tprice" type="number" min="0" step="0.01" className={inputCls} value={trainerPrice} onChange={(e) => setTrainerPrice(e.target.value)} required />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-fg mb-1" htmlFor="c-trainer">Trainer</label>
          <select id="c-trainer" className={inputCls} value={trainerId} onChange={(e) => setTrainerId(e.target.value)}>
            <option value="">— Unassigned —</option>
            {trainers.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-fg mb-1" htmlFor="c-notes">Notes</label>
          <textarea id="c-notes" className={inputCls} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={5000} />
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg border border-line-strong text-fg hover:bg-surface-muted">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-hover disabled:opacity-60">
          {saving ? "Saving…" : initial?.id ? "Save changes" : "Create course"}
        </button>
      </div>
    </form>
  );
};

export default CourseForm;
