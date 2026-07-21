import { FormEvent, useState } from "react";
import { apiFetch } from "../lib/clientFetch";
import type { Location } from "../hooks/useLocations";

const inputCls =
  "w-full bg-surface text-fg border border-line-strong rounded-lg px-3 py-2 placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary";

/**
 * Add a location. Deliberately create-only — locations are referenced by FK
 * from courses and trainers, so editing or deleting one would rewrite or block
 * existing bookings.
 *
 * `existing` is shown below the field so a near-duplicate ("Berlin" when
 * "Berlin, Germany" is already there) is visible before submitting rather than
 * only as a 409 afterwards.
 */
const LocationForm = ({
  existing,
  onSaved,
  onCancel,
}: {
  existing: Location[];
  onSaved: (location: Location) => void;
  onCancel: () => void;
}) => {
  const [name, setName] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setSaving(true);
    const res = await apiFetch<{ location: Location }>("/api/locations", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    setSaving(false);

    if (res.ok && res.data) return onSaved(res.data.location);

    setErrors(
      Array.isArray(res.details) && res.details.length
        ? (res.details as string[])
        : [res.error ?? "Could not create the location"]
    );
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {errors.length > 0 && (
        <div
          role="alert"
          className="bg-danger-soft border border-danger-line text-danger-ink rounded-lg px-4 py-3 text-sm"
        >
          <ul className="list-disc pl-4">
            {errors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <label
          className="block text-sm font-medium text-fg mb-1"
          htmlFor="l-name"
        >
          Location name *
        </label>
        <input
          id="l-name"
          className={inputCls}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={200}
          autoFocus
          placeholder="e.g. Dresden, Germany"
        />
        <p className="text-fg-muted text-sm mt-1">
          Used by both courses and trainers. Match the existing style so the
          list stays consistent.
        </p>
      </div>

      {existing.length > 0 && (
        <div>
          <p className="text-sm font-medium text-fg mb-1">Already available</p>
          <div className="flex flex-wrap gap-1.5">
            {existing.map((l) => (
              <span
                key={l.id}
                className="text-xs bg-surface-muted text-fg-muted border border-line rounded px-2 py-1"
              >
                {l.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end space-x-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-line-strong text-fg hover:bg-surface-muted"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-primary text-primary-fg hover:bg-primary-hover disabled:opacity-60"
        >
          {saving ? "Adding…" : "Add location"}
        </button>
      </div>
    </form>
  );
};

export default LocationForm;
