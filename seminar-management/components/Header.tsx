import Link from "next/link";
import { useUser } from "../hooks/useUser";
import ThemeToggle from "./ThemeToggle";
import LocaleToggle from "./LocaleToggle";

// Self-contained: fetches the session user and owns sign-out, so pages don't
// have to prop-drill auth state.
const Header = () => {
  const { user, signOut } = useUser();

  return (
    <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-lg">
      <div className="container mx-auto px-6 py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center transform group-hover:scale-110 transition-transform">
            <span className="text-white font-bold text-lg">K</span>
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            Kodschul Management Hub
          </h1>
        </Link>
        <nav className="hidden md:flex items-center space-x-6 text-sm">
          <Link href="/courses" className="text-gray-300 hover:text-white transition">
            Courses
          </Link>
          <Link href="/trainers" className="text-gray-300 hover:text-white transition">
            Trainers
          </Link>
        </nav>
        <div className="flex items-center space-x-3">
          <LocaleToggle />
          <ThemeToggle />
          <div className="hidden md:flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-gray-300">
                Welcome,{" "}
                <span className="font-semibold text-white">
                  {user?.displayName ?? "…"}
                </span>
              </span>
            </div>
          </div>
          <button
            onClick={signOut}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-md transition-all duration-200 transform hover:scale-105 font-medium"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
