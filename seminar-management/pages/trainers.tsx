import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Header from "../components/Header";
import Modal from "../components/Modal";
import TrainerForm, { TrainerFormValues } from "../components/TrainerForm";
import { apiFetch } from "../lib/clientFetch";

interface Trainer {
  id: string;
  name: string;
  subjects: string[];
  location: string;
  email: string;
  hourlyRate: number | null;
  rating: number | null;
  availability: { type: string; startDate: string; endDate: string }[];
}

export default function Trainers() {
  const [trainers, setTrainers] = useState<Trainer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<TrainerFormValues | null>(null);
  const [creating, setCreating] = useState(false);
  // Two-step inline delete confirmation (no browser confirm() dialogs).
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async (searchTerm: string) => {
    const query = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : "";
    const res = await apiFetch<{ trainers: Trainer[] }>(`/api/trainers${query}`);
    if (res.ok && res.data) {
      setTrainers(res.data.trainers);
      setError(null);
    } else {
      setError(res.error);
    }
  }, []);

  useEffect(() => {
    // Debounce the search input so we don't query per keystroke.
    const t = setTimeout(() => load(search), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [search, load]);

  const remove = async (id: string) => {
    setConfirmDeleteId(null);
    const res = await apiFetch<{ unassignedCourses: number }>(
      `/api/trainers/${id}`,
      { method: "DELETE" }
    );
    if (res.ok && res.data) {
      setNotice(
        res.data.unassignedCourses > 0
          ? `Trainer deleted. ${res.data.unassignedCourses} course(s) are now unassigned.`
          : "Trainer deleted."
      );
      load(search);
    } else {
      setError(res.error);
    }
  };

  return (
    <div className="min-h-screen bg-canvas">
      <Header />
      <main className="container mx-auto p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold">Trainers</h1>
          <div className="flex items-center gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or email…"
              className="bg-surface text-fg border border-line-strong rounded-lg px-3 py-2 placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              aria-label="Search trainers"
            />
            <button
              onClick={() => setCreating(true)}
              className="bg-success hover:bg-success-hover text-white px-4 py-2 rounded-lg shadow-md"
            >
              + New Trainer
            </button>
          </div>
        </div>

        {notice && (
          <div className="mb-4 bg-primary-soft border border-primary-line text-primary-ink rounded-lg px-4 py-3 flex justify-between">
            <span>{notice}</span>
            <button onClick={() => setNotice(null)} aria-label="Dismiss">×</button>
          </div>
        )}
        {error && (
          <div role="alert" className="mb-4 bg-danger-soft border border-danger-line text-danger-ink rounded-lg px-4 py-3">
            {error}{" "}
            <button className="underline" onClick={() => load(search)}>
              Retry
            </button>
          </div>
        )}
        {!trainers && !error && (
          <div className="bg-surface rounded-lg shadow p-8 animate-pulse text-fg-subtle">
            Loading trainers…
          </div>
        )}

        {trainers && (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-surface border border-line rounded-lg shadow-md">
              <thead>
                <tr className="bg-surface-muted border-b text-left text-fg-muted font-semibold">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Subjects</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Rate</th>
                  <th className="py-3 px-4">Rating</th>
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {trainers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 px-4 text-center text-fg-muted">
                      No trainers found.
                    </td>
                  </tr>
                )}
                {trainers.map((t) => (
                  <tr key={t.id} className="border-b hover:bg-surface-muted">
                    <td className="py-3 px-4">
                      <Link href={`/trainers/${t.id}`} className="font-semibold text-primary-ink hover:underline">
                        {t.name}
                      </Link>
                      {t.availability.some((a) => a.type === "BLACKOUT") && (
                        <span className="ml-2 text-xs bg-warning-soft text-warning-ink rounded px-1.5 py-0.5">
                          has blackout dates
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {t.subjects.map((s) => (
                          <span key={s} className="text-xs bg-primary-soft text-primary-ink rounded px-1.5 py-0.5">
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4">{t.location}</td>
                    <td className="py-3 px-4 text-fg-muted">{t.email}</td>
                    <td className="py-3 px-4">{t.hourlyRate != null ? `€${t.hourlyRate}` : "—"}</td>
                    <td className="py-3 px-4">{t.rating != null ? "★".repeat(t.rating) : "—"}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditing(t)}
                          className="bg-warning hover:bg-warning-hover text-warning-fg px-3 py-1.5 rounded-lg text-sm"
                        >
                          Edit
                        </button>
                        {confirmDeleteId === t.id ? (
                          <span className="flex items-center gap-1 text-sm">
                            <button onClick={() => remove(t.id)} className="bg-danger text-white px-2 py-1.5 rounded-lg">
                              Confirm
                            </button>
                            <button onClick={() => setConfirmDeleteId(null)} className="border px-2 py-1.5 rounded-lg">
                              Cancel
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(t.id)}
                            className="bg-danger hover:bg-danger text-white px-3 py-1.5 rounded-lg text-sm"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(creating || editing) && (
          <Modal
            title={editing ? `Edit ${editing.name}` : "New Trainer"}
            onClose={() => {
              setCreating(false);
              setEditing(null);
            }}
          >
            <TrainerForm
              initial={editing ?? undefined}
              onSaved={() => {
                setCreating(false);
                setEditing(null);
                load(search);
              }}
              onCancel={() => {
                setCreating(false);
                setEditing(null);
              }}
            />
          </Modal>
        )}
      </main>
    </div>
  );
}
