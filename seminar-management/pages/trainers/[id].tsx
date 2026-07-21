import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Header from "../../components/Header";
import { apiFetch } from "../../lib/clientFetch";

interface TrainerProfile {
  id: string;
  name: string;
  subjects: string[];
  location: string;
  email: string;
  hourlyRate: number | null;
  rating: number | null;
  availability: { id: string; type: string; startDate: string; endDate: string }[];
  courses: { id: string; name: string; date: string; location: string; status: string }[];
  assignmentHistory: {
    id: string;
    action: string;
    course: { id: string; name: string } | null;
    note: string | null;
    createdAt: string;
  }[];
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-surface-hover text-fg-muted",
  SCHEDULED: "bg-primary-soft text-primary-ink",
  COMPLETED: "bg-success-soft text-success-ink",
  CANCELLED: "bg-danger-soft text-danger-ink",
};

export default function TrainerProfilePage() {
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : null;
  const [trainer, setTrainer] = useState<TrainerProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    apiFetch<{ trainer: TrainerProfile }>(`/api/trainers/${id}`).then((res) => {
      if (cancelled) return;
      if (res.ok && res.data) setTrainer(res.data.trainer);
      else setError(res.error);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="min-h-screen bg-canvas">
      <Header />
      <main className="container mx-auto p-6 max-w-4xl">
        <Link href="/trainers" className="text-primary-ink hover:underline text-sm">
          ← All trainers
        </Link>
        {error && (
          <div role="alert" className="mt-4 bg-danger-soft border border-danger-line text-danger-ink rounded-lg px-4 py-3">
            {error}
          </div>
        )}
        {!trainer && !error && (
          <div className="mt-4 bg-surface rounded-lg shadow p-8 animate-pulse text-fg-subtle">
            Loading profile…
          </div>
        )}
        {trainer && (
          <>
            <div className="mt-4 bg-surface rounded-xl shadow p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold">{trainer.name}</h1>
                  <p className="text-fg-muted">{trainer.location}</p>
                  <p className="text-fg-muted">{trainer.email}</p>
                </div>
                <div className="text-right">
                  {trainer.rating != null && (
                    <div className="text-warning text-xl">{"★".repeat(trainer.rating)}</div>
                  )}
                  {trainer.hourlyRate != null && (
                    <div className="text-fg font-semibold">€{trainer.hourlyRate}/h</div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mt-4">
                {trainer.subjects.map((s) => (
                  <span key={s} className="text-sm bg-primary-soft text-primary-ink rounded px-2 py-0.5">
                    {s}
                  </span>
                ))}
              </div>
              {trainer.availability.length > 0 && (
                <div className="mt-4">
                  <h2 className="text-sm font-semibold text-fg-muted uppercase mb-1">Availability</h2>
                  {trainer.availability.map((a) => (
                    <div key={a.id} className="text-sm text-fg">
                      <span
                        className={`inline-block w-20 text-xs rounded px-1.5 py-0.5 mr-2 ${
                          a.type === "BLACKOUT"
                            ? "bg-warning-soft text-warning-ink"
                            : "bg-success-soft text-success-ink"
                        }`}
                      >
                        {a.type}
                      </span>
                      {a.startDate} → {a.endDate}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 bg-surface rounded-xl shadow p-6">
              <h2 className="text-lg font-bold mb-3">Assigned courses ({trainer.courses.length})</h2>
              {trainer.courses.length === 0 && <p className="text-fg-muted">No courses assigned.</p>}
              {trainer.courses.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center justify-between border-b last:border-0 py-2 gap-2">
                  <div>
                    <Link href={`/courses/${c.id}`} className="font-medium text-primary-ink hover:underline">
                      {c.name}
                    </Link>
                    <span className="text-fg-muted text-sm ml-2">
                      {c.date} · {c.location}
                    </span>
                  </div>
                  <span className={`text-xs rounded px-2 py-0.5 ${statusColors[c.status] ?? ""}`}>{c.status}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 bg-surface rounded-xl shadow p-6">
              <h2 className="text-lg font-bold mb-3">Assignment history</h2>
              {trainer.assignmentHistory.length === 0 && <p className="text-fg-muted">No history yet.</p>}
              {trainer.assignmentHistory.map((h) => (
                <div key={h.id} className="text-sm border-b last:border-0 py-2">
                  <span
                    className={`inline-block w-24 text-xs rounded px-1.5 py-0.5 mr-2 ${
                      h.action === "ASSIGNED" ? "bg-success-soft text-success-ink" : "bg-surface-hover text-fg-muted"
                    }`}
                  >
                    {h.action}
                  </span>
                  {h.course ? h.course.name : "(deleted course)"}
                  {h.note && <span className="text-fg-muted"> — {h.note}</span>}
                  <span className="text-fg-subtle ml-2">{new Date(h.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
