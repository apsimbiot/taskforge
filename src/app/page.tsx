import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-white text-sm">
            TF
          </div>
          <span className="text-white font-semibold text-lg">TaskForge</span>
        </div>
        <nav className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-slate-300 hover:text-white transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/login"
            className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
          >
            Get Started
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight">
            Project management,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
              open source
            </span>
          </h1>
          <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            TaskForge gives your team the power of ClickUp with the freedom of
            open source. Workspaces, sprints, boards, time tracking — all
            self-hosted.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="bg-indigo-500 hover:bg-indigo-600 text-white px-8 py-3 rounded-lg text-lg font-medium transition-colors"
            >
              Start for Free
            </Link>
            <a
              href="https://github.com/apsimbiot/taskforge"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-slate-600 hover:border-slate-400 text-white px-8 py-3 rounded-lg text-lg font-medium transition-colors"
            >
              View on GitHub
            </a>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20 text-left">
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="text-2xl mb-3">📋</div>
              <h3 className="text-white font-semibold text-lg mb-2">
                Full Hierarchy
              </h3>
              <p className="text-slate-400">
                Workspaces → Spaces → Folders → Lists → Tasks. Organize
                everything the way you want.
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="text-2xl mb-3">🏃</div>
              <h3 className="text-white font-semibold text-lg mb-2">
                Sprint Planning
              </h3>
              <p className="text-slate-400">
                Plan sprints, track velocity, and ship on time with built-in
                agile tools.
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="text-2xl mb-3">🔒</div>
              <h3 className="text-white font-semibold text-lg mb-2">
                Self-Hosted
              </h3>
              <p className="text-slate-400">
                Your data, your server. Deploy with Docker in minutes. No
                vendor lock-in.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-8 text-center text-slate-500 text-sm">
        <p>
          MIT License ·{" "}
          <a
            href="https://github.com/apsimbiot/taskforge"
            className="hover:text-slate-300 transition-colors"
          >
            GitHub
          </a>
        </p>
      </footer>
    </div>
  );
}
