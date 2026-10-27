const fs = require('fs');
const path = require('path');

const target = path.resolve(__dirname, '../app/account/page.tsx');
let code = fs.readFileSync(target, 'utf8');

const isCrlf = code.includes('\r\n');
const nl = isCrlf ? '\r\n' : '\n';

const oldBlock = `<div className="mt-8 space-y-3 text-sm text-blue-100">${nl}` +
`            <p>✓ A personal account for your learning journey</p>${nl}` +
`            <p>✓ Email sign-in and 1-tap Google sign-in</p>${nl}` +
`            <p>✓ Live Interactive Classrooms &amp; Session Recordings</p>${nl}` +
`            <p>✓ Timed CBT exam simulations with offline protection</p>${nl}` +
`            <p>✓ Secure account recovery</p>${nl}` +
`          </div>`;

const icon = `<span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/30 text-cyan-300"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg></span>`;

const newBlock = `<div className="mt-8 space-y-3 text-sm text-blue-100">${nl}` +
`            <p className="flex items-center gap-2.5">${icon}<span>A personal account for your learning journey</span></p>${nl}` +
`            <p className="flex items-center gap-2.5">${icon}<span>Email sign-in and 1-tap Google sign-in</span></p>${nl}` +
`            <p className="flex items-center gap-2.5">${icon}<span>Live Interactive Classrooms &amp; Session Recordings</span></p>${nl}` +
`            <p className="flex items-center gap-2.5">${icon}<span>Timed CBT exam simulations with offline protection</span></p>${nl}` +
`            <p className="flex items-center gap-2.5">${icon}<span>Secure account recovery</span></p>${nl}` +
`          </div>`;

code = code.replace(oldBlock, newBlock);
fs.writeFileSync(target, code, 'utf8');
console.log('Account bullets updated');
