import { useEffect, useState } from "react";
import Link from "next/link";
import type { GetStaticProps } from "next";
import { useTranslations } from "next-intl";
import Header from "../components/Header";
import { apiFetch } from "../lib/clientFetch";
import { getMessages } from "../lib/messages";

interface Stats {
  totalCourses: number;
  totalTrainers: number;
  upcomingCourses: number;
  unassignedUpcoming: number;
  totalRevenue: number;
  totalTrainerCosts: number;
  margin: number;
}

const eur = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);

/**
 * Messages are loaded per-locale at build time. getStaticProps is enough here
 * because this page renders no server data — the dashboard figures are fetched
 * client-side from /api/stats, behind the auth middleware. Dynamic routes such
 * as /courses/[id] would need getServerSideProps (or getStaticPaths) instead.
 */
export const getStaticProps: GetStaticProps = async ({ locale }) => ({
  props: { messages: getMessages(locale) },
});

export default function Home() {
  const t = useTranslations("Dashboard");
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<{ stats: Stats }>("/api/stats").then((res) => {
      if (cancelled) return;
      if (res.ok && res.data) setStats(res.data.stats);
      else setError(res.error);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const statCards = stats
    ? [
        { label: t("stats.totalCourses"), value: String(stats.totalCourses), icon: "📚", href: "/courses" },
        { label: t("stats.totalTrainers"), value: String(stats.totalTrainers), icon: "👥", href: "/trainers" },
        { label: t("stats.upcomingCourses"), value: String(stats.upcomingCourses), icon: "📅", href: "/courses?status=SCHEDULED" },
        { label: t("stats.unassignedUpcoming"), value: String(stats.unassignedUpcoming), icon: "⚠️", href: "/courses" },
        { label: t("stats.revenue"), value: eur(stats.totalRevenue), icon: "💶" },
        { label: t("stats.trainerCosts"), value: eur(stats.totalTrainerCosts), icon: "💸" },
        { label: t("stats.margin"), value: eur(stats.margin), icon: "📈" },
      ]
    : [];

  return (
    <div className="min-h-screen bg-canvas">
      <Header />
      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-fg mb-2">{t("title")}</h1>
          <p className="text-fg-muted">{t("subtitle")}</p>
        </div>

        {error && (
          <div role="alert" className="mb-6 bg-danger-soft border border-danger-line text-danger-ink rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {!stats && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-surface border border-line rounded-xl shadow-sm p-6 animate-pulse h-28" />
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat) => {
            const card = (
              <div className="bg-surface border border-line rounded-xl shadow-sm hover:shadow-lg hover:border-line-strong transition-all duration-300 transform hover:-translate-y-1 p-6 h-full">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-fg-muted mb-1">{stat.label}</p>
                    <p className="text-3xl font-bold text-fg">{stat.value}</p>
                  </div>
                  <span className="text-3xl">{stat.icon}</span>
                </div>
              </div>
            );
            return stat.href ? (
              <Link key={stat.label} href={stat.href}>
                {card}
              </Link>
            ) : (
              <div key={stat.label}>{card}</div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/courses"
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all"
          >
            <h2 className="text-xl font-bold mb-1">{t("manageCourses")}</h2>
            <p className="text-blue-100 text-sm">
              {t("manageCoursesDescription")}
            </p>
          </Link>
          <Link
            href="/trainers"
            className="bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all"
          >
            <h2 className="text-xl font-bold mb-1">{t("manageTrainers")}</h2>
            <p className="text-green-100 text-sm">
              {t("manageTrainersDescription")}
            </p>
          </Link>
        </div>
      </main>
    </div>
  );
}
