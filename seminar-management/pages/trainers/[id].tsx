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
  DRAFT: "bg-gray-100 text-gray-700",
  SCHEDULED: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-700",
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
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto p-6 max-w-4xl">
        <Link href="/trainers" className="text-blue-700 hover:underline text-sm">
          ← All trainers
        </Link>
        {error && (
          <div role="alert" className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3">
            {error}
          </div>
        )}
        {!trainer && !error && (
          <div className="mt-4 bg-white rounded-lg shadow p-8 animate-pulse text-gray-400">
            Loading profile…
          </div>
        )}
        {trainer && (
          <>
            <div className="mt-4 bg-white rounded-xl shadow p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold">{trainer.name}</h1>
                  <p className="text-gray-600">{trainer.location}</p>
                  <p className="text-gray-600">{trainer.email}</p>
                </div>
                <div className="text-right">
                  {trainer.rating != null && (
                    <div className="text-amber-500 text-xl">{"★".repeat(trainer.rating)}</div>
                  )}
                  {trainer.hourlyRate != null && (
                    <div className="text-gray-700 font-semibold">€{trainer.hourlyRate}/h</div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mt-4">
                {trainer.subjects.map((s) => (
                  <span key={s} className="text-sm bg-blue-100 text-blue-800 rounded px-2 py-0.5">
                    {s}
                  </span>
                ))}
              </div>
              {trainer.availability.length > 0 && (
                <div className="mt-4">
                  <h2 className="text-sm font-semibold text-gray-500 uppercase mb-1">Availability</h2>
                  {trainer.availability.map((a) => (
                    <div key={a.id} className="text-sm text-gray-700">
                      <span
                        className={`inline-block w-20 text-xs rounded px-1.5 py-0.5 mr-2 ${
                          a.type === "BLACKOUT"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-green-100 text-green-800"
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

            <div className="mt-6 bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-bold mb-3">Assigned courses ({trainer.courses.length})</h2>
              {trainer.courses.length === 0 && <p className="text-gray-500">No courses assigned.</p>}
              {trainer.courses.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center justify-between border-b last:border-0 py-2 gap-2">
                  <div>
                    <Link href={`/courses/${c.id}`} className="font-medium text-blue-700 hover:underline">
                      {c.name}
                    </Link>
                    <span className="text-gray-500 text-sm ml-2">
                      {c.date} · {c.location}
                    </span>
                  </div>
                  <span className={`text-xs rounded px-2 py-0.5 ${statusColors[c.status] ?? ""}`}>{c.status}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-bold mb-3">Assignment history</h2>
              {trainer.assignmentHistory.length === 0 && <p className="text-gray-500">No history yet.</p>}
              {trainer.assignmentHistory.map((h) => (
                <div key={h.id} className="text-sm border-b last:border-0 py-2">
                  <span
                    className={`inline-block w-24 text-xs rounded px-1.5 py-0.5 mr-2 ${
                      h.action === "ASSIGNED" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {h.action}
                  </span>
                  {h.course ? h.course.name : "(deleted course)"}
                  {h.note && <span className="text-gray-500"> — {h.note}</span>}
                  <span className="text-gray-400 ml-2">{new Date(h.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
