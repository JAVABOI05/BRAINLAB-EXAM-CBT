const fs = require('fs');

const file = 'c:/Users/hp/Downloads/BRAINLAB-EXAM-CBT/app/study-groups/page.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(
  '<span>👥 Moderated Study Circles</span>',
  '<span className="inline-flex items-center gap-2.5"><svg className="h-7 w-7 text-blue-600 dark:text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>Moderated Study Circles</span>'
);

c = c.replace(
  '<span>💬</span> Messages &amp; Chat',
  '<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>Messages &amp; Chat'
);

c = c.replace(
  '<span>🎥</span> Live Room',
  '<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>Live Room'
);

c = c.replace('{ id: "Medicine", label: "🩺 Medicine" },', '{ id: "Medicine", label: "Medicine & Health" },');
c = c.replace('{ id: "Engineering", label: "⚙️ Engineering" },', '{ id: "Engineering", label: "Engineering & Tech" },');
c = c.replace('{ id: "Law & Arts", label: "⚖️ Law & Arts" },', '{ id: "Law & Arts", label: "Law, Arts & Hum." },');
c = c.replace('{ id: "Commercial", label: "📊 Commercial" },', '{ id: "Commercial", label: "Commercial & Mgmt" },');

c = c.replace(
  '👥 {circle.membersCount + (isJoined ? 1 : 0)} Enrolled Learners',
  '<span className="inline-flex items-center gap-1.5"><svg className="h-3.5 w-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>{circle.membersCount + (isJoined ? 1 : 0)} Enrolled Learners</span>'
);

c = c.replace(
  '🎯 {circle.weeklyFocus}',
  '<span className="inline-flex items-center gap-1.5"><svg className="h-3.5 w-3.5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>{circle.weeklyFocus}</span>'
);

c = c.replace(
  '💬 Chat',
  '<span className="inline-flex items-center gap-1.5"><svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>Chat</span>'
);

c = c.replace(
  '⚡ Squad Sprint',
  '<span className="inline-flex items-center gap-1.5"><svg className="h-3.5 w-3.5 text-slate-950" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>Squad Sprint</span>'
);

fs.writeFileSync(file, c, 'utf8');
console.log('Study groups modernized');
