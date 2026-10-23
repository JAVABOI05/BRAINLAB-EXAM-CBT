"use client";

import { useState } from "react";
import Link from "next/link";

interface DiscussionThread {
  id: string;
  title: string;
  author: string;
  role: "Student" | "Peer Tutor" | "Faculty Moderator";
  subject: string;
  content: string;
  replies: Array<{
    id: string;
    author: string;
    role: "Student" | "Peer Tutor" | "Faculty Moderator";
    content: string;
    votes: number;
    time: string;
  }>;
  upvotes: number;
  timeAgo: string;
  tags: string[];
}

const INITIAL_THREADS: DiscussionThread[] = [
  {
    id: "disc-1",
    title: "How to systematically approach projectile motion at an angle in JAMB Physics?",
    author: "Emeka O.",
    role: "Student",
    subject: "Physics",
    content:
      "I keep confusing the formulas for Time of Flight T = (2u sin θ)/g versus Maximum Height H = (u² sin² θ)/2g when solving under timed pressure. What memory cues or derivations help you quickly remember which is which in the hall?",
    replies: [
      {
        id: "rep-1",
        author: "Engr. David K.",
        role: "Faculty Moderator",
        content:
          "Great question Emeka! Remember dimensions: Height (H) has dimension of length [L], while u² has [L²/T²] and g has [L/T²], so (u²/2g) gives metres! Time (T) must have dimension of seconds [T], which is why u/g gives [L/T] / [L/T²] = T. In 2024 JAMB, they tested the 45° maximum range condition R_max = u²/g — memorize that benchmark!",
        votes: 14,
        time: "2 hours ago",
      },
      {
        id: "rep-2",
        author: "Fatima B.",
        role: "Peer Tutor",
        content:
          "Also remember: Range is horizontal velocity (u cos θ) multiplied by Time of flight (2u sin θ / g). That's why 2 sin θ cos θ collapses into sin 2θ! When θ = 45°, 2θ = 90° and sin 90° = 1.",
        votes: 9,
        time: "45 mins ago",
      },
    ],
    upvotes: 24,
    timeAgo: "3 hours ago",
    tags: ["Mechanics", "Formulas", "JAMB 2026"],
  },
  {
    id: "disc-2",
    title: "Subject-Verb Concord: 'Neither the teacher nor the students ____ (was/were) present'",
    author: "Blessing A.",
    role: "Student",
    subject: "English Language",
    content:
      "Is it 'was' or 'were'? Some textbooks say the rule of proximity applies to correlative conjunctions (neither... nor), so the verb agrees with the closer subject. Can someone confirm JAMB's standard marking key?",
    replies: [
      {
        id: "rep-3",
        author: "Mrs. O. Bankole",
        role: "Faculty Moderator",
        content:
          "The answer is 'were'! Under the Principle of Proximity for 'neither... nor' and 'either... or', the verb agrees with the subject immediately preceding it. Here, 'students' (plural) is closest to the verb slot, so 'were' is correct. Contrast with: 'Neither the students nor the teacher WAS present.'",
        votes: 31,
        time: "1 hour ago",
      },
    ],
    upvotes: 38,
    timeAgo: "4 hours ago",
    tags: ["Grammar", "Concord", "English JAMB"],
  },
  {
    id: "disc-3",
    title: "Le Chatelier's Principle: Impact of inert gas addition at constant volume vs constant pressure",
    author: "Tunde M.",
    role: "Student",
    subject: "Chemistry",
    content:
      "In Haber's process: N₂(g) + 3H₂(g) ⇌ 2NH₃(g) (ΔH < 0). If argon or helium is introduced at constant volume, does equilibrium shift left, right, or remain unchanged?",
    replies: [
      {
        id: "rep-4",
        author: "Dr. Alabi",
        role: "Faculty Moderator",
        content:
          "At CONSTANT VOLUME, adding an inert gas increases total pressure, but the partial pressures and concentrations of N₂, H₂, and NH₃ remain strictly identical. Therefore, the equilibrium position does NOT shift at all! It only shifts towards the side with fewer gas moles if the inert gas is added at CONSTANT PRESSURE (because volume expands, diluting the reactants).",
        votes: 22,
        time: "5 hours ago",
      },
    ],
    upvotes: 19,
    timeAgo: "6 hours ago",
    tags: ["Chemical Equilibrium", "Thermodynamics"],
  },
  {
    id: "disc-4",
    title: "Solving Quadratic Inequalities: When does the sign flip for (x - 2)(x + 5) < 0?",
    author: "Zainab S.",
    role: "Peer Tutor",
    subject: "Mathematics",
    content:
      "Tip for students preparing for WAEC/JAMB: Remember that quadratic inequalities can be solved using the boundary interval test or the parabola shape. If a > 0 (opening upwards), the expression is LESS than zero BETWEEN the roots (-5 < x < 2), and GREATER than zero OUTSIDE the roots (x < -5 or x > 2). Practice this rule to save 2 minutes on paper 1!",
    replies: [],
    upvotes: 42,
    timeAgo: "1 day ago",
    tags: ["Algebra", "Inequalities", "WAEC SSCE"],
  },
];

export default function DiscussionsPage() {
  const [threads, setThreads] = useState<DiscussionThread[]>(INITIAL_THREADS);
  const [selectedSubject, setSelectedSubject] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedThreadId, setExpandedThreadId] = useState<string | null>("disc-1");
  const [newReplyText, setNewReplyText] = useState<Record<string, string>>({});
  const [isAskingQuestion, setIsAskingQuestion] = useState<boolean>(false);

  // New Thread Form State
  const [newTitle, setNewTitle] = useState("");
  const [newSubject, setNewSubject] = useState("Mathematics");
  const [newAuthor, setNewAuthor] = useState("");
  const [newContent, setNewContent] = useState("");

  const subjects = ["All", "Mathematics", "Physics", "Chemistry", "English Language", "Biology"];

  const filteredThreads = threads.filter((t) => {
    const matchesSubject = selectedSubject === "All" || t.subject === selectedSubject;
    const matchesSearch =
      searchQuery === "" ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSubject && matchesSearch;
  });

  const handleUpvote = (id: string) => {
    setThreads((prev) =>
      prev.map((t) => (t.id === id ? { ...t, upvotes: t.upvotes + 1 } : t))
    );
  };

  const handleAddReply = (threadId: string) => {
    const text = newReplyText[threadId]?.trim();
    if (!text) return;

    setThreads((prev) =>
      prev.map((t) => {
        if (t.id !== threadId) return t;
        return {
          ...t,
          replies: [
            ...t.replies,
            {
              id: `rep-${Date.now()}`,
              author: "You (Active Learner)",
              role: "Student",
              content: text,
              votes: 1,
              time: "Just now",
            },
          ],
        };
      })
    );

    setNewReplyText((prev) => ({ ...prev, [threadId]: "" }));
  };

  const handleCreateThread = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const newThread: DiscussionThread = {
      id: `disc-${Date.now()}`,
      title: newTitle.trim(),
      author: newAuthor.trim() || "Active Scholar",
      role: "Student",
      subject: newSubject,
      content: newContent.trim(),
      replies: [],
      upvotes: 1,
      timeAgo: "Just now",
      tags: [newSubject, "Community Question"],
    };

    setThreads([newThread, ...threads]);
    setNewTitle("");
    setNewContent("");
    setNewAuthor("");
    setIsAskingQuestion(false);
    setExpandedThreadId(newThread.id);
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-[#000814] dark:text-slate-100">
      {/* -------------------------------------------------------------------
          1. Header Banner
      ------------------------------------------------------------------- */}
      <section className="border-b border-blue-900/40 bg-[#00112b] text-white">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/30 bg-sky-950/60 px-3 py-1 text-xs font-semibold text-sky-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Moderated Academic Forum
                </span>
                <span className="text-xs text-slate-400">Pillar 5 · Peer Learning</span>
              </div>
              <h1 className="mt-3 text-2xl font-black sm:text-4xl tracking-tight text-white">
                Academic Discussions &amp; Peer Explanations
              </h1>
              <p className="mt-2 text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                Ask challenging exam questions, verify difficult past questions with faculty moderators,
                and share revision shortcuts with fellow candidates across Nigeria.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setIsAskingQuestion(!isAskingQuestion)}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-600/30 transition hover:bg-blue-500 active:scale-95"
              >
                <span>💬</span>
                <span>{isAskingQuestion ? "Close Question Form" : "Ask Academic Question"}</span>
              </button>
              <Link
                href="/study-groups"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-white/5 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-white/10 transition"
              >
                <span>👥</span>
                <span>Join Study Circles →</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------------
          2. Ask Question Form (Collapsible)
      ------------------------------------------------------------------- */}
      {isAskingQuestion && (
        <section className="border-b border-blue-100 bg-blue-50/50 py-8 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="mx-auto max-w-4xl px-5 sm:px-8">
            <div className="rounded-2xl border border-blue-200 bg-white p-6 shadow-md dark:border-slate-700 dark:bg-slate-900">
              <h2 className="text-base font-bold text-slate-950 dark:text-white">
                Post an Academic Question to the Community
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Please follow our respectful Community Code of Conduct. No spam or commercial messages.
              </p>

              <form onSubmit={handleCreateThread} className="mt-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Question Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="e.g. Why does boiling point decrease with altitude in thermodynamics?"
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Subject
                    </label>
                    <select
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="Mathematics">Mathematics</option>
                      <option value="Physics">Physics</option>
                      <option value="Chemistry">Chemistry</option>
                      <option value="English Language">English Language</option>
                      <option value="Biology">Biology</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Your Name / Handle (Optional)
                  </label>
                  <input
                    type="text"
                    value={newAuthor}
                    onChange={(e) => setNewAuthor(e.target.value)}
                    placeholder="e.g. Chioma A. (SS3 Candidate)"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Full Question Details &amp; Past Question Year (if any) *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="Explain what concept you find confusing, what answer choices were provided, and what you've tried so far..."
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAskingQuestion(false)}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow hover:bg-blue-500"
                  >
                    Post Question →
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>
      )}

      {/* -------------------------------------------------------------------
          3. Filters & Search Bar
      ------------------------------------------------------------------- */}
      <section className="mx-auto max-w-6xl px-5 py-6 sm:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          {/* Subject Pills */}
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            {subjects.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSelectedSubject(s)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  selectedSubject === s
                    ? "bg-[#012153] text-white shadow-xs dark:bg-blue-600"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="w-full sm:w-72">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search discussions & laws..."
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* -----------------------------------------------------------------
            4. Discussion Threads List
        ----------------------------------------------------------------- */}
        <div className="mt-6 space-y-4">
          {filteredThreads.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
              <span className="text-3xl">🔍</span>
              <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
                No discussions found matching your filter
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Try searching a different subject or ask the first question!
              </p>
              <button
                type="button"
                onClick={() => setIsAskingQuestion(true)}
                className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500"
              >
                Ask a New Question
              </button>
            </div>
          ) : (
            filteredThreads.map((thread) => {
              const isExpanded = expandedThreadId === thread.id;

              return (
                <article
                  key={thread.id}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition hover:border-blue-300 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-slate-700"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-md bg-blue-50 px-2.5 py-0.5 font-bold text-blue-800 border border-blue-200 dark:bg-blue-950/60 dark:border-blue-900 dark:text-sky-300">
                          {thread.subject}
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {thread.author}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            thread.role === "Faculty Moderator"
                              ? "bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300"
                              : thread.role === "Peer Tutor"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {thread.role}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-400">{thread.timeAgo}</span>
                      </div>

                      <h3
                        onClick={() =>
                          setExpandedThreadId(isExpanded ? null : thread.id)
                        }
                        className="cursor-pointer text-base font-bold text-slate-950 hover:text-blue-700 dark:text-white dark:hover:text-sky-300 sm:text-lg"
                      >
                        {thread.title}
                      </h3>

                      <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                        {thread.content}
                      </p>

                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {thread.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Upvote Pill */}
                    <button
                      type="button"
                      onClick={() => handleUpvote(thread.id)}
                      className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 active:scale-95"
                      title="Mark as helpful"
                    >
                      <span className="text-xs">▲</span>
                      <span className="mt-0.5">{thread.upvotes}</span>
                    </button>
                  </div>

                  {/* Reply Bar & Expander */}
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedThreadId(isExpanded ? null : thread.id)
                      }
                      className="font-bold text-blue-600 hover:text-blue-800 dark:text-sky-400 dark:hover:text-sky-300"
                    >
                      {thread.replies.length}{" "}
                      {thread.replies.length === 1 ? "Explanation" : "Explanations"} &amp;
                      Replies {isExpanded ? "▲ Hide" : "▼ Show"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpandedThreadId(thread.id)}
                      className="font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                    >
                      + Answer this question
                    </button>
                  </div>

                  {/* Expanded Replies Thread */}
                  {isExpanded && (
                    <div className="mt-4 space-y-3 rounded-xl bg-slate-50 p-4 border border-slate-100 dark:border-slate-800 dark:bg-slate-950/50">
                      {thread.replies.length === 0 ? (
                        <p className="text-xs text-slate-500 text-center py-2">
                          No replies yet. Be the first to share an explanation!
                        </p>
                      ) : (
                        thread.replies.map((rep) => (
                          <div
                            key={rep.id}
                            className="rounded-lg bg-white p-3.5 shadow-xs border border-slate-100 dark:border-slate-800 dark:bg-slate-900"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 dark:text-white">
                                  {rep.author}
                                </span>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                                    rep.role === "Faculty Moderator"
                                      ? "bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300"
                                      : "bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300"
                                  }`}
                                >
                                  {rep.role}
                                </span>
                                <span className="text-slate-400">{rep.time}</span>
                              </div>
                              <span className="font-semibold text-emerald-600 text-[11px]">
                                ✓ {rep.votes} votes
                              </span>
                            </div>
                            <p className="mt-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                              {rep.content}
                            </p>
                          </div>
                        ))
                      )}

                      {/* Reply Input Box */}
                      <div className="mt-3 flex gap-2 pt-2">
                        <input
                          type="text"
                          value={newReplyText[thread.id] || ""}
                          onChange={(e) =>
                            setNewReplyText({
                              ...newReplyText,
                              [thread.id]: e.target.value,
                            })
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddReply(thread.id);
                          }}
                          placeholder="Write a clear academic reply or formula hint..."
                          className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddReply(thread.id)}
                          className="rounded-xl bg-[#012153] px-4 py-2 text-xs font-bold text-white hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 transition"
                        >
                          Reply
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
      </section>

      {/* -------------------------------------------------------------------
          5. Community Conduct Footer Strip
      ------------------------------------------------------------------- */}
      <section className="mt-12 border-t border-slate-200 bg-white py-10 transition-colors dark:border-slate-800 dark:bg-[#00112b]/40">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-slate-950 dark:text-white">
              Academic Excellence &amp; Safer Learning
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              BrainLab discussions are moderated by university scholars. All interactions adhere to our Community Code of Conduct.
            </p>
          </div>
          <div className="flex gap-3 text-xs font-bold">
            <Link
              href="/study-groups"
              className="text-blue-600 dark:text-sky-400 hover:underline"
            >
              Study Circles →
            </Link>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <Link
              href="/contact"
              className="text-blue-600 dark:text-sky-400 hover:underline"
            >
              Report an Issue →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
