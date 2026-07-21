import Header from "../components/Header";
import Link from "next/link";
import { useState } from "react";

export default function Home() {
  const [stats] = useState({
    totalCourses: 5,
    totalTrainers: 12,
    upcomingCourses: 3,
    completedCourses: 2,
  });

  const user = "John Doe";

  const handleSignOut = () => {
    console.log("User signed out");
  };

  const statCards = [
    { label: "Total Courses", value: stats.totalCourses, color: "from-blue-500 to-blue-600", icon: "📚" },
    { label: "Total Trainers", value: stats.totalTrainers, color: "from-green-500 to-green-600", icon: "👥" },
    { label: "Upcoming Courses", value: stats.upcomingCourses, color: "from-orange-500 to-orange-600", icon: "📅" },
    { label: "Completed Courses", value: stats.completedCourses, color: "from-purple-500 to-purple-600", icon: "✅" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header user={user} onSignOut={handleSignOut} />
      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Overview of your seminar management system</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 p-6 border-l-4 border-transparent hover:border-opacity-100"
              style={{ borderLeftColor: `var(--${stat.color.split(' ')[0]})` }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="text-4xl">{stat.icon}</div>
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${stat.color} opacity-10`}></div>
              </div>
              <h2 className="text-sm font-medium text-gray-600 mb-2">{stat.label}</h2>
              <p className={`text-4xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/courses"
            className="group bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 border-2 border-transparent hover:border-blue-500"
          >
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-3xl transform group-hover:scale-110 transition-transform">
                📚
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">Courses</h3>
                <p className="text-gray-600">Manage and view all courses</p>
              </div>
              <div className="ml-auto text-blue-500 transform group-hover:translate-x-2 transition-transform">
                →
              </div>
            </div>
          </Link>

          <Link
            href="/trainers"
            className="group bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 border-2 border-transparent hover:border-green-500"
          >
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center text-3xl transform group-hover:scale-110 transition-transform">
                👥
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">Trainers</h3>
                <p className="text-gray-600">View and manage trainers</p>
              </div>
              <div className="ml-auto text-green-500 transform group-hover:translate-x-2 transition-transform">
                →
              </div>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
