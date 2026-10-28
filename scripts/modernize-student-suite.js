/* eslint-disable @typescript-eslint/no-require-imports -- Legacy Node.js maintenance script uses CommonJS. */
const fs = require('fs');

function updateLeaderboard() {
  const file = 'c:/Users/hp/Downloads/BRAINLAB-EXAM-CBT/app/leaderboard/page.tsx';
  let c = fs.readFileSync(file, 'utf8');

  // Academic Honor Roll
  c = c.replace(
    '🏆 Academic Honor Roll',
    '<svg className="h-3.5 w-3.5 text-amber-700 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>Academic Honor Roll'
  );

  // Badges & Level
  c = c.replace(
    '🏅 My Badges &amp; Level →',
    '<svg className="h-3.5 w-3.5 text-amber-400 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>My Badges &amp; Level →'
  );

  // Prize pool gift
  c = c.replace(
    /<span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-700 to-cyan-500 text-2xl text-white shadow shrink-0">\s*🎁\s*<\/span>/,
    '<span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-700 to-cyan-500 text-white shadow shrink-0"><svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/></svg></span>'
  );

  // Play arena button
  c = c.replace(
    '<span>🔥 Play Arena (+2x XP) →</span>',
    '<span className="inline-flex items-center gap-1.5"><svg className="h-3.5 w-3.5 text-amber-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>Play Arena (+2x XP) →</span>'
  );

  // Podium 2nd
  c = c.replace(
    '<span className="text-3xl">🥈</span>',
    '<div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 shadow-inner border border-slate-200"><svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg></div>'
  );

  // Podium 1st
  c = c.replace(
    '<span className="text-4xl">👑</span>',
    '<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 shadow-inner border border-amber-300"><svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 14h14v2H5v-2z"/></svg></div>'
  );

  // Podium 3rd
  c = c.replace(
    '<span className="text-3xl">🥉</span>',
    '<div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-800 shadow-inner border border-amber-200"><svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg></div>'
  );

  // Table rankNum
  c = c.replace(
    `{rankNum === 1
                              ? "🥇 1"
                              : rankNum === 2
                              ? "🥈 2"
                              : rankNum === 3
                              ? "🥉 3"
                              : \`#\${rankNum}\`}`,
    `{rankNum === 1 ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-black text-amber-900 border border-amber-300">
                                  <svg className="h-3 w-3 fill-amber-600 text-amber-600" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                                  1
                                </span>
                              ) : rankNum === 2 ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-black text-slate-800 border border-slate-300">
                                  <svg className="h-3 w-3 fill-slate-400 text-slate-400" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                                  2
                                </span>
                              ) : rankNum === 3 ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-black text-amber-800 border border-amber-200">
                                  <svg className="h-3 w-3 fill-amber-700 text-amber-700" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                                  3
                                </span>
                              ) : (
                                \`#\${rankNum}\`
                              )}`
  );

  // Table streak
  c = c.replace(
    `<span className="font-bold text-rose-600">
                                🔥 {entry.streak_days}d
                              </span>`,
    `<span className="inline-flex items-center gap-1 font-bold text-rose-600">
                                <svg className="h-3.5 w-3.5 text-rose-500" viewBox="0 0 24 24" fill="currentColor"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
                                {entry.streak_days}d
                              </span>`
  );

  fs.writeFileSync(file, c, 'utf8');
  console.log('Leaderboard updated');
}

function updateAssignments() {
  const file = 'c:/Users/hp/Downloads/BRAINLAB-EXAM-CBT/app/assignments/page.tsx';
  let c = fs.readFileSync(file, 'utf8');

  // Timetable
  c = c.replace(
    '📅 Timetable',
    '<svg className="h-3.5 w-3.5 text-slate-500 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>Timetable'
  );

  // Voice Note Allowed
  c = c.replace(
    '🎙️ Voice Note Allowed',
    '<svg className="h-3.5 w-3.5 text-blue-600 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>Voice Note Allowed'
  );

  // Tutor Voice Critique:
  c = c.replace(
    '🎙️ Tutor Voice Critique:',
    '<svg className="h-3.5 w-3.5 text-blue-600 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>Tutor Voice Critique:'
  );

  // Attached Voice Note
  c = c.replace(
    '<span>🎙️ Attached Voice Note</span>',
    '<span className="inline-flex items-center gap-1.5"><svg className="h-3.5 w-3.5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>Attached Voice Note</span>'
  );

  // Record Audio Submission
  c = c.replace(
    '<span>🎙️ Record Audio Submission</span>',
    '<span className="inline-flex items-center gap-1.5"><svg className="h-3.5 w-3.5 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>Record Audio Submission</span>'
  );

  // Large document icon
  c = c.replace(
    '<span className="text-4xl">📝</span>',
    '<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-200"><svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></div>'
  );

  fs.writeFileSync(file, c, 'utf8');
  console.log('Assignments updated');
}

function updateSkillsPassport() {
  const file = 'c:/Users/hp/Downloads/BRAINLAB-EXAM-CBT/app/skills-passport/page.tsx';
  let c = fs.readFileSync(file, 'utf8');

  // Streak
  c = c.replace(
    '<p className="text-lg font-black text-amber-300 mt-0.5">🔥 {data.streakDays} Days</p>',
    '<p className="text-lg font-black text-amber-300 mt-0.5 inline-flex items-center gap-1.5"><svg className="h-4 w-4 text-amber-400 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>{data.streakDays} Days</p>'
  );

  // Shield
  c = c.replace(
    '🛡️',
    '<svg className="h-4 w-4 text-emerald-400 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>'
  );

  // Print
  c = c.replace(
    '🖨️ Print / Save PDF Report',
    '<svg className="h-4 w-4 text-slate-600 inline mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>Print / Save PDF Report'
  );

  fs.writeFileSync(file, c, 'utf8');
  console.log('Skills Passport updated');
}

function updateNotifications() {
  const file = 'c:/Users/hp/Downloads/BRAINLAB-EXAM-CBT/app/notifications/page.tsx';
  let c = fs.readFileSync(file, 'utf8');

  // Replace emoji empty state
  c = c.replace(
    '<span className="text-3xl">📭</span>',
    '<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></div>'
  );

  fs.writeFileSync(file, c, 'utf8');
  console.log('Notifications updated');
}

updateLeaderboard();
updateAssignments();
updateSkillsPassport();
updateNotifications();
