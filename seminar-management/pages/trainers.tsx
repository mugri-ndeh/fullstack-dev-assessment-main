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
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold">Trainers</h1>
          <div className="flex items-center gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or email…"
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Search trainers"
            />
            <button
              onClick={() => setCreating(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow-md"
            >
              + New Trainer
            </button>
          </div>
        </div>

        {notice && (
          <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg px-4 py-3 flex justify-between">
            <span>{notice}</span>
            <button onClick={() => setNotice(null)} aria-label="Dismiss">×</button>
          </div>
        )}
        {error && (
          <div role="alert" className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3">
            {error}{" "}
            <button className="underline" onClick={() => load(search)}>
              Retry
            </button>
          </div>
        )}
        {!trainers && !error && (
          <div className="bg-white rounded-lg shadow p-8 animate-pulse text-gray-400">
            Loading trainers…
          </div>
        )}

        {trainers && (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-md">
              <thead>
                <tr className="bg-gray-100 border-b text-left text-gray-600 font-semibold">
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
                    <td colSpan={7} className="py-6 px-4 text-center text-gray-500">
                      No trainers found.
                    </td>
                  </tr>
                )}
                {trainers.map((t) => (
                  <tr key={t.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <Link href={`/trainers/${t.id}`} className="font-semibold text-blue-700 hover:underline">
                        {t.name}
                      </Link>
                      {t.availability.some((a) => a.type === "BLACKOUT") && (
                        <span className="ml-2 text-xs bg-amber-100 text-amber-800 rounded px-1.5 py-0.5">
                          has blackout dates
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {t.subjects.map((s) => (
                          <span key={s} className="text-xs bg-blue-100 text-blue-800 rounded px-1.5 py-0.5">
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4">{t.location}</td>
                    <td className="py-3 px-4 text-gray-600">{t.email}</td>
                    <td className="py-3 px-4">{t.hourlyRate != null ? `€${t.hourlyRate}` : "—"}</td>
                    <td className="py-3 px-4">{t.rating != null ? "★".repeat(t.rating) : "—"}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditing(t)}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1.5 rounded-lg text-sm"
                        >
                          Edit
                        </button>
                        {confirmDeleteId === t.id ? (
                          <span className="flex items-center gap-1 text-sm">
                            <button onClick={() => remove(t.id)} className="bg-red-600 text-white px-2 py-1.5 rounded-lg">
                              Confirm
                            </button>
                            <button onClick={() => setConfirmDeleteId(null)} className="border px-2 py-1.5 rounded-lg">
                              Cancel
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(t.id)}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm"
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
