/* eslint-disable @typescript-eslint/no-require-imports -- These maintenance scripts use Node's CommonJS runtime. */
const fs = require('fs');

function updateDashboard() {
  const file = 'c:/Users/hp/Downloads/BRAINLAB-EXAM-CBT/app/dashboard/page.tsx';
  let c = fs.readFileSync(file, 'utf8');

  c = c.replace(
    '⚡ Challenge Arena (2× XP)',
    '<svg className="h-3.5 w-3.5 text-amber-600 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>Challenge Arena (2× XP)'
  );

  c = c.replace(
    '🧬 Learning DNA',
    '<svg className="h-3.5 w-3.5 text-blue-600 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m8 8 8 8"/><path d="m8 16 8-8"/><path d="M2 12h20"/><path d="M12 2v20"/></svg>Learning DNA'
  );

  c = c.replace(
    '📚 Formulas',
    '<svg className="h-3.5 w-3.5 text-slate-600 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/></svg>Formulas'
  );

  c = c.replace(
    '👥 Study Groups',
    '<svg className="h-3.5 w-3.5 text-emerald-600 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>Study Groups'
  );

  c = c.replace(
    '🏆 Leaderboard',
    '<svg className="h-3.5 w-3.5 text-blue-600 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>Leaderboard'
  );

  c = c.replace(
    '🏅 Achievements &amp; Streaks',
    '<svg className="h-3.5 w-3.5 text-amber-600 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>Achievements &amp; Streaks'
  );

  c = c.replace(
    '<span>🔑</span>',
    '<svg className="h-3.5 w-3.5 text-blue-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></svg>'
  );

  c = c.replace(
    /<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-\[#012153\] text-2xl text-cyan-300 shadow-sm">\s*📊\s*<\/div>/,
    '<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#012153] text-cyan-300 shadow-sm"><svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg></div>'
  );

  fs.writeFileSync(file, c, 'utf8');
  console.log('Dashboard updated successfully');
}

updateDashboard();
