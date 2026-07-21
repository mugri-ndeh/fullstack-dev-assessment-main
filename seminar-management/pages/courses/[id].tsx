import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Header from "../../components/Header";
import TrainerSuggestions from "../../components/TrainerSuggestions";
import { apiFetch } from "../../lib/clientFetch";

interface CourseDetail {
  id: string;
  name: string;
  date: string;
  subjects: string[];
  location: string;
  participants: number;
  notes: string | null;
  price: number;
  trainerPrice: number;
  status: string;
  trainer: { id: string; name: string; email: string; location: string } | null;
  assignmentHistory: {
    id: string;
    action: string;
    trainerName: string;
    trainerEmail: string;
    note: string | null;
    createdAt: string;
  }[];
}

const eur = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);

const statusColors: Record<string, string> = {
  DRAFT: "bg-surface-hover text-fg-muted",
  SCHEDULED: "bg-primary-soft text-primary-ink",
  COMPLETED: "bg-success-soft text-success-ink",
  CANCELLED: "bg-danger-soft text-danger-ink",
};

export default function CourseDetailPage() {
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : null;
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const res = await apiFetch<{ course: CourseDetail }>(`/api/courses/${id}`);
    if (res.ok && res.data) {
      setCourse(res.data.course);
      setError(null);
    } else {
      setError(res.error);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-h-screen bg-canvas">
      <Header />
      <main className="container mx-auto p-6 max-w-4xl">
        <Link href="/courses" className="text-primary-ink hover:underline text-sm">
          ← All courses
        </Link>
        {error && (
          <div role="alert" className="mt-4 bg-danger-soft border border-danger-line text-danger-ink rounded-lg px-4 py-3">
            {error}
          </div>
        )}
        {!course && !error && (
          <div className="mt-4 bg-surface rounded-lg shadow p-8 animate-pulse text-fg-subtle">
            Loading course…
          </div>
        )}
        {course && (
          <>
            <div className="mt-4 bg-surface rounded-xl shadow p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold">{course.name}</h1>
                  <p className="text-fg-muted mt-1">
                    {course.date} · {course.location} · {course.participants} participants
                  </p>
                </div>
                <span className={`text-sm rounded px-2 py-1 ${statusColors[course.status] ?? ""}`}>
                  {course.status}
                </span>
              </div>
              <div className="flex flex-wrap gap-1 mt-3">
                {course.subjects.map((s) => (
                  <span key={s} className="text-sm bg-primary-soft text-primary-ink rounded px-2 py-0.5">
                    {s}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
                <div className="bg-surface-muted rounded-lg p-3">
                  <p className="text-xs text-fg-muted">Course price</p>
                  <p className="font-bold text-fg">{eur(course.price)}</p>
                </div>
                <div className="bg-surface-muted rounded-lg p-3">
                  <p className="text-xs text-fg-muted">Trainer price</p>
                  <p className="font-bold text-fg">{eur(course.trainerPrice)}</p>
                </div>
                <div className="bg-surface-muted rounded-lg p-3">
                  <p className="text-xs text-fg-muted">Margin</p>
                  <p className="font-bold text-fg">{eur(course.price - course.trainerPrice)}</p>
                </div>
              </div>
              {course.notes && (
                <div className="mt-4">
                  <h2 className="text-sm font-semibold text-fg-muted uppercase mb-1">Notes</h2>
                  <p className="text-fg whitespace-pre-wrap">{course.notes}</p>
                </div>
              )}
            </div>

            <div className="mt-6 bg-surface rounded-xl shadow p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold">Trainer</h2>
                <button
                  onClick={() => setShowSuggestions((v) => !v)}
                  className="bg-accent hover:bg-accent text-white px-3 py-1.5 rounded-lg text-sm shadow"
                >
                  {showSuggestions ? "Hide suggestions" : "Suggest trainers"}
                </button>
              </div>
              {course.trainer ? (
                <p>
                  <Link href={`/trainers/${course.trainer.id}`} className="font-semibold text-primary-ink hover:underline">
                    {course.trainer.name}
                  </Link>
                  <span className="text-fg-muted ml-2">
                    {course.trainer.email} · {course.trainer.location}
                  </span>
                </p>
              ) : (
                <p className="text-fg-subtle">No trainer assigned yet.</p>
              )}
              {showSuggestions && (
                <div className="mt-4 bg-surface-muted rounded-lg p-4">
                  <TrainerSuggestions courseId={course.id} onAssigned={load} />
                </div>
              )}
            </div>

            <div className="mt-6 bg-surface rounded-xl shadow p-6">
              <h2 className="text-lg font-bold mb-3">Assignment history</h2>
              {course.assignmentHistory.length === 0 && (
                <p className="text-fg-muted">No assignments yet.</p>
              )}
              {course.assignmentHistory.map((h) => (
                <div key={h.id} className="text-sm border-b last:border-0 py-2">
                  <span
                    className={`inline-block w-24 text-xs rounded px-1.5 py-0.5 mr-2 ${
                      h.action === "ASSIGNED" ? "bg-success-soft text-success-ink" : "bg-surface-hover text-fg-muted"
                    }`}
                  >
                    {h.action}
                  </span>
                  <span className="font-medium">{h.trainerName}</span>
                  <span className="text-fg-muted"> ({h.trainerEmail})</span>
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
