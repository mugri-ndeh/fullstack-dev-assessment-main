import { Fragment, useCallback, useEffect, useState } from "react";
import Header from "../components/Header";
import TrainerSuggestions from "../components/TrainerSuggestions";

// Mirrors CourseDto from services/courseService.ts (fields this page renders).
// GET /api/courses responds with { courses: CourseDto[] }.
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
  status: string;
  trainer: CourseTrainer | null;
}

// Placeholder options for the (still non-functional) manual-assign select.
const sampleTrainers = [
  {
    id: 1,
    name: "Jane Doe",
    trainingSubjects: ["React.js"],
    location: "Stuttgart",
    email: "jane.doe@example.com",
  },
  {
    id: 2,
    name: "John Smith",
    trainingSubjects: ["Node.js"],
    location: "Stuttgart",
    email: "john.smith@example.com",
  },
];

export default function Courses() {
  // null until the first successful fetch; kept during background refetches so
  // an open suggestions panel isn't unmounted when an assignment refreshes the
  // table.
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fetchAttempt, setFetchAttempt] = useState(0);
  // Course id whose suggestions panel is open; the LLM-backed fetch only
  // fires when a panel is opened, never for the whole list.
  const [suggestingCourseId, setSuggestingCourseId] = useState<string | null>(
    null
  );

  const refetch = useCallback(() => setFetchAttempt((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    (async () => {
      try {
        const res = await fetch("/api/courses");
        const data = (await res.json().catch(() => null)) as {
          courses?: Course[];
          error?: string;
        } | null;
        if (cancelled) return;
        if (!res.ok) {
          setError(data?.error ?? `Failed to load courses (${res.status})`);
          return;
        }
        setCourses(data?.courses ?? []);
      } catch {
        if (!cancelled) {
          setError("Could not reach the server. Please try again.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchAttempt]);

  return (
    <div>
      <Header />
      <main className="container mx-auto p-6">
        <h1 className="text-4xl font-bold mb-8">Courses</h1>

        {error && (
          <div className="bg-red-50 border border-red-300 rounded-lg shadow p-4 mb-6">
            <p className="text-sm text-red-800 mb-3">{error}</p>
            <button
              onClick={refetch}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg shadow-md transition"
            >
              Retry
            </button>
          </div>
        )}

        {courses === null && !error && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-md p-6">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <p className="text-sm text-slate-600">Loading courses…</p>
            </div>
          </div>
        )}

        {courses !== null && (
          <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-md">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="py-3 px-4 border-b">Course Name</th>
                <th className="py-3 px-4 border-b">Date</th>
                <th className="py-3 px-4 border-b">Subject</th>
                <th className="py-3 px-4 border-b">Location</th>
                <th className="py-3 px-4 border-b">Trainer</th>
                <th className="py-3 px-4 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {courses.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-3 px-4 border-b text-center text-slate-600"
                  >
                    No courses found.
                  </td>
                </tr>
              )}
              {courses.map((course) => (
                <Fragment key={course.id}>
                  <tr>
                    <td className="py-3 px-4 border-b">{course.name}</td>
                    <td className="py-3 px-4 border-b">{course.date}</td>
                    <td className="py-3 px-4 border-b">
                      {course.subjects.join(", ")}
                    </td>
                    <td className="py-3 px-4 border-b">{course.location}</td>
                    <td className="py-3 px-4 border-b">
                      {course.trainer ? (
                        <div>
                          <div>
                            <strong>{course.trainer.name}</strong>
                          </div>
                          <div>{course.trainer.email}</div>
                        </div>
                      ) : (
                        <span>No trainer assigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4 border-b flex space-x-2">
                      <button className="bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-yellow-600">
                        Edit
                      </button>
                      <button className="bg-red-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-red-600">
                        Delete
                      </button>
                      {course.trainer ? (
                        <button className="bg-gray-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-gray-600">
                          Remove Trainer
                        </button>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <select className="border border-gray-300 px-4 py-2 rounded-lg shadow-md">
                            <option value="">Select Trainer</option>
                            {sampleTrainers.map((trainer) => (
                              <option key={trainer.id} value={trainer.id}>
                                {trainer.name}
                              </option>
                            ))}
                          </select>
                          <button className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-600">
                            Assign Trainer
                          </button>
                        </div>
                      )}
                      <button
                        onClick={() =>
                          setSuggestingCourseId((current) =>
                            current === course.id ? null : course.id
                          )
                        }
                        className="bg-purple-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-purple-600"
                      >
                        {suggestingCourseId === course.id
                          ? "Hide suggestions"
                          : "Suggest trainers"}
                      </button>
                    </td>
                  </tr>
                  {suggestingCourseId === course.id && (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-3 px-4 border-b bg-slate-50"
                      >
                        <TrainerSuggestions
                          courseId={course.id}
                          onAssigned={refetch}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </div>
  );
}
