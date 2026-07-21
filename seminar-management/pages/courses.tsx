import { Fragment, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Header from "../components/Header";
import Modal from "../components/Modal";
import CourseForm, { CourseFormValues } from "../components/CourseForm";
import TrainerSuggestions from "../components/TrainerSuggestions";
import { apiFetch } from "../lib/clientFetch";

// Mirrors CourseDto from services/courseService.ts (fields this page renders).
interface CourseTrainer {
  id: string;
  name: string;
  email: string;
  location: string;
}

interface Course {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  subjects: string[];
  location: string;
  participants: number;
  notes: string | null;
  price: number;
  trainerPrice: number;
  status: string;
  trainer: CourseTrainer | null;
}

const STATUSES = ["DRAFT", "SCHEDULED", "COMPLETED", "CANCELLED"] as const;

const statusColors: Record<string, string> = {
  DRAFT: "bg-surface-hover text-fg-muted",
  SCHEDULED: "bg-primary-soft text-primary-ink",
  COMPLETED: "bg-success-soft text-success-ink",
  CANCELLED: "bg-danger-soft text-danger-ink",
};

export default function Courses() {
  const router = useRouter();
  // null until the first successful fetch; kept during background refetches so
  // an open suggestions panel isn't unmounted when an assignment refreshes the
  // table.
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [trainers, setTrainers] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fetchAttempt, setFetchAttempt] = useState(0);
  const [suggestingCourseId, setSuggestingCourseId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>(
    typeof router.query.status === "string" ? router.query.status : ""
  );
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<CourseFormValues | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refetch = useCallback(() => setFetchAttempt((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (search) params.set("search", search);
    const t = setTimeout(async () => {
      const res = await apiFetch<{ courses: Course[] }>(
        `/api/courses${params.toString() ? `?${params}` : ""}`
      );
      if (cancelled) return;
      if (res.ok && res.data) setCourses(res.data.courses);
      else setError(res.error);
    }, search ? 300 : 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [fetchAttempt, statusFilter, search]);

  // Trainer names for the form's assign dropdown and quick-assign selects.
  useEffect(() => {
    let cancelled = false;
    apiFetch<{ trainers: { id: string; name: string }[] }>("/api/trainers").then(
      (res) => {
        if (!cancelled && res.ok && res.data) setTrainers(res.data.trainers);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [fetchAttempt]);

  const showEmailNotice = (email?: { sent: boolean; to: string; error?: string }) => {
    if (!email) return setNotice("Saved.");
    setNotice(
      email.sent
        ? `Saved. Assignment email sent to ${email.to}.`
        : `Saved, but the notification email to ${email.to} failed: ${email.error}`
    );
  };

  const removeCourse = async (id: string) => {
    setConfirmDeleteId(null);
    const res = await apiFetch(`/api/courses/${id}`, { method: "DELETE" });
    if (res.ok) {
      setNotice("Course deleted.");
      refetch();
    } else setError(res.error);
  };

  const unassign = async (id: string) => {
    const res = await apiFetch(`/api/courses/${id}`, {
      method: "PUT",
      body: JSON.stringify({ trainerId: null }),
    });
    if (res.ok) {
      setNotice("Trainer removed from course.");
      refetch();
    } else setError(res.error);
  };

  return (
    <div className="min-h-screen bg-canvas">
      <Header />
      <main className="container mx-auto p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="text-4xl font-bold">Courses</h1>
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search courses…"
              aria-label="Search courses"
              className="bg-surface text-fg border border-line-strong rounded-lg px-3 py-2 placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
              className="bg-surface text-fg border border-line-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button
              onClick={() => setCreating(true)}
              className="bg-success hover:bg-success-hover text-white px-4 py-2 rounded-lg shadow-md"
            >
              + New Course
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
            <button onClick={refetch} className="underline">Retry</button>
          </div>
        )}
        {courses === null && !error && (
          <div className="bg-surface border border-line rounded-lg shadow-md p-6 animate-pulse text-fg-muted">
            Loading courses…
          </div>
        )}

        {courses !== null && (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-surface border border-line rounded-lg shadow-md">
              <thead className="bg-surface-muted text-fg-muted text-xs uppercase tracking-wide">
                <tr>
                  <th className="py-3 px-4 border-b text-left">Course</th>
                  <th className="py-3 px-4 border-b text-left">Date</th>
                  <th className="py-3 px-4 border-b text-left">Subjects</th>
                  <th className="py-3 px-4 border-b text-left">Location</th>
                  <th className="py-3 px-4 border-b text-left">Status</th>
                  <th className="py-3 px-4 border-b text-left">Trainer</th>
                  <th className="py-3 px-4 border-b text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {courses.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 px-4 text-center text-fg-muted">
                      No courses found.
                    </td>
                  </tr>
                )}
                {courses.map((course) => (
                  <Fragment key={course.id}>
                    <tr className="hover:bg-surface-muted">
                      <td className="py-3 px-4 border-b">
                        <Link href={`/courses/${course.id}`} className="font-semibold text-primary-ink hover:underline">
                          {course.name}
                        </Link>
                      </td>
                      <td className="py-3 px-4 border-b whitespace-nowrap">{course.date}</td>
                      <td className="py-3 px-4 border-b">
                        <div className="flex flex-wrap gap-1">
                          {course.subjects.map((s) => (
                            <span key={s} className="text-xs bg-primary-soft text-primary-ink rounded px-1.5 py-0.5">
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 border-b">{course.location}</td>
                      <td className="py-3 px-4 border-b">
                        <span className={`text-xs rounded px-2 py-0.5 ${statusColors[course.status] ?? ""}`}>
                          {course.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 border-b">
                        {course.trainer ? (
                          <div>
                            <Link href={`/trainers/${course.trainer.id}`} className="font-semibold text-primary-ink hover:underline">
                              {course.trainer.name}
                            </Link>
                            <div className="text-fg-muted text-sm">{course.trainer.email}</div>
                          </div>
                        ) : (
                          <span className="text-fg-subtle">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3 px-4 border-b">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() =>
                              setEditing({
                                ...course,
                                trainerId: course.trainer?.id ?? null,
                              })
                            }
                            className="bg-warning hover:bg-warning-hover text-warning-fg px-3 py-1.5 rounded-lg text-sm shadow"
                          >
                            Edit
                          </button>
                          {confirmDeleteId === course.id ? (
                            <span className="flex items-center gap-1 text-sm">
                              <button onClick={() => removeCourse(course.id)} className="bg-danger text-white px-2 py-1.5 rounded-lg">
                                Confirm
                              </button>
                              <button onClick={() => setConfirmDeleteId(null)} className="border px-2 py-1.5 rounded-lg">
                                Cancel
                              </button>
                            </span>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(course.id)}
                              className="bg-danger hover:bg-danger text-white px-3 py-1.5 rounded-lg text-sm shadow"
                            >
                              Delete
                            </button>
                          )}
                          {course.trainer && (
                            <button
                              onClick={() => unassign(course.id)}
                              className="border border-line-strong bg-surface text-fg hover:bg-surface-muted px-3 py-1.5 rounded-lg text-sm shadow-sm"
                            >
                              Remove Trainer
                            </button>
                          )}
                          <button
                            onClick={() =>
                              setSuggestingCourseId((current) =>
                                current === course.id ? null : course.id
                              )
                            }
                            className="bg-accent hover:bg-accent text-white px-3 py-1.5 rounded-lg text-sm shadow"
                          >
                            {suggestingCourseId === course.id ? "Hide suggestions" : "Suggest trainers"}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {suggestingCourseId === course.id && (
                      <tr>
                        <td colSpan={7} className="py-3 px-4 border-b bg-surface-muted">
                          <TrainerSuggestions courseId={course.id} onAssigned={refetch} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(creating || editing) && (
          <Modal
            title={editing ? `Edit ${editing.name}` : "New Course"}
            onClose={() => {
              setCreating(false);
              setEditing(null);
            }}
          >
            <CourseForm
              initial={editing ?? undefined}
              trainers={trainers}
              onSaved={(email) => {
                setCreating(false);
                setEditing(null);
                showEmailNotice(email);
                refetch();
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
