"use client";

import { useMemo, useState } from "react";

type Stage = {
  id: number; name: string; enzyme: string; reaction: string; detail: string;
  output: string[]; carbon: number; location: string;
};
const STAGES: Stage[] = [
  { id:1,name:"Citrate formation",enzyme:"Citrate synthase",reaction:"Acetyl-CoA (2C) + oxaloacetate (4C) → citrate (6C) + CoA-SH",detail:"The two-carbon acetyl group combines with four-carbon oxaloacetate to form six-carbon citrate. This commits the acetyl group to the cycle.",output:["CoA-SH released"],carbon:6,location:"Mitochondrial matrix"},
  { id:2,name:"Isomerisation",enzyme:"Aconitase",reaction:"Citrate (6C) ⇌ cis-aconitate ⇌ isocitrate (6C)",detail:"Aconitase rearranges citrate into isocitrate through the intermediate cis-aconitate. The rearrangement prepares the molecule for oxidative decarboxylation.",output:["No NADH or CO₂"],carbon:6,location:"Mitochondrial matrix"},
  { id:3,name:"First oxidative decarboxylation",enzyme:"Isocitrate dehydrogenase",reaction:"Isocitrate (6C) → α-ketoglutarate (5C) + CO₂ + NADH",detail:"Isocitrate is oxidised and loses one carbon as carbon dioxide. NAD⁺ accepts electrons and is reduced to NADH.",output:["1 NADH","1 CO₂"],carbon:5,location:"Mitochondrial matrix"},
  { id:4,name:"Second oxidative decarboxylation",enzyme:"α-Ketoglutarate dehydrogenase complex",reaction:"α-Ketoglutarate (5C) + CoA-SH → succinyl-CoA (4C) + CO₂ + NADH",detail:"A second carbon is released as CO₂. The remaining four-carbon fragment joins coenzyme A, while NAD⁺ is reduced to NADH.",output:["1 NADH","1 CO₂"],carbon:4,location:"Mitochondrial matrix"},
  { id:5,name:"Substrate-level phosphorylation",enzyme:"Succinyl-CoA synthetase",reaction:"Succinyl-CoA (4C) + GDP + Pi ⇌ succinate (4C) + GTP + CoA-SH",detail:"Energy from the high-energy thioester bond drives formation of GTP (or ATP, depending on tissue isoenzyme) directly, without the electron transport chain.",output:["1 GTP (or ATP)"],carbon:4,location:"Mitochondrial matrix"},
  { id:6,name:"Succinate oxidation",enzyme:"Succinate dehydrogenase",reaction:"Succinate (4C) → fumarate (4C)",detail:"Succinate is oxidised to fumarate. FAD is reduced to FADH₂; the enzyme is also Complex II of the electron transport chain and is embedded in the inner mitochondrial membrane.",output:["1 FADH₂"],carbon:4,location:"Inner mitochondrial membrane"},
  { id:7,name:"Hydration",enzyme:"Fumarase (fumarate hydratase)",reaction:"Fumarate (4C) + H₂O → L-malate (4C)",detail:"Water is added across the double bond of fumarate to form L-malate.",output:["Water consumed"],carbon:4,location:"Mitochondrial matrix"},
  { id:8,name:"Oxaloacetate regeneration",enzyme:"Malate dehydrogenase",reaction:"L-malate (4C) + NAD⁺ ⇌ oxaloacetate (4C) + NADH",detail:"Malate is oxidised to regenerate oxaloacetate, which can combine with another acetyl-CoA and begin another turn of the cycle.",output:["1 NADH","Oxaloacetate regenerated"],carbon:4,location:"Mitochondrial matrix"},
];
const POSITIONS = [{x:50,y:7},{x:78,y:18},{x:91,y:48},{x:78,y:78},{x:50,y:91},{x:22,y:78},{x:9,y:48},{x:22,y:18}];

export default function KrebsCycleExplorer() {
  const [active,setActive]=useState(0);
  const [guided,setGuided]=useState(true);
  const stage=STAGES[active];
  const progress=useMemo(()=>Math.round(((active+1)/8)*100),[active]);
  return <main className="min-h-screen bg-[#070d1e] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-7xl space-y-7">
      <nav className="text-xs text-slate-400"><a href="/classroom/stem" className="hover:text-white">STEM Studio</a> / <a href="/classroom/stem/atlas" className="hover:text-white">3D Atlas</a> / <span className="text-cyan-300">Krebs Cycle</span></nav>
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="max-w-3xl"><p className="text-xs font-bold uppercase tracking-[.24em] text-cyan-300">Pathway &amp; Process Explorer</p><h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">The Krebs cycle, one reaction at a time.</h1><p className="mt-3 text-sm leading-relaxed text-slate-300">Explore the eight enzyme-catalysed reactions of the citric acid cycle. Follow the carbon count, electron carriers and energy yield for one acetyl-CoA.</p></div>
        <a href="/classroom/stem" className="w-fit rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-xs font-bold text-white hover:bg-white/10">← STEM Studio</a>
      </header>
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]">
        <div className="rounded-[28px] border border-white/10 bg-[#0b1838] p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-cyan-300">Cycle map</p><h2 className="mt-1 text-lg font-black text-white">Eight reaction stages</h2></div><button onClick={()=>setGuided(v=>!v)} className="rounded-lg border border-white/15 px-3 py-2 text-xs font-bold text-slate-200">{guided?"Guided mode: on":"Explore mode: on"}</button></div>
          <div className="relative mx-auto mt-4 aspect-square w-full max-w-[540px]">
            <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" role="img" aria-label="Circular map of the eight Krebs cycle reaction stages">
              <defs><marker id="krebs-arrow" markerWidth="5" markerHeight="5" refX="3.5" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5" fill="#22d3ee"/></marker></defs>
              <circle cx="50" cy="49" r="34" fill="none" stroke="#24395f" strokeWidth="1.8" strokeDasharray="2 2"/>
              {POSITIONS.map((p,i)=>{const next=POSITIONS[(i+1)%8];const dx=next.x-p.x,dy=next.y-p.y;const len=Math.hypot(dx,dy);const sx=p.x+dx/len*7,sy=p.y+dy/len*7,ex=next.x-dx/len*8,ey=next.y-dy/len*8;return <line key={i} x1={sx} y1={sy} x2={ex} y2={ey} stroke="#22d3ee" strokeOpacity={i===active?.95:.45} strokeWidth={i===active?1.5:1} markerEnd="url(#krebs-arrow)"/>;})}
              <text x="50" y="43" textAnchor="middle" fill="#e2e8f0" fontSize="4.2" fontWeight="bold">CITRIC ACID</text><text x="50" y="49" textAnchor="middle" fill="#e2e8f0" fontSize="4.2" fontWeight="bold">CYCLE</text><text x="50" y="56" textAnchor="middle" fill="#94a3b8" fontSize="2.8">Mitochondrial matrix*</text>
            </svg>
            {POSITIONS.map((p,i)=><button key={i} onClick={()=>setActive(i)} aria-label={`Stage ${i+1}: ${STAGES[i].name}`} aria-pressed={active===i} className={`absolute flex h-[54px] w-[54px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-2xl border text-center shadow-lg transition sm:h-[66px] sm:w-[66px] ${active===i?"z-10 scale-110 border-cyan-300 bg-cyan-400 text-[#071027] shadow-cyan-500/30":"border-white/15 bg-[#14264a] text-slate-200 hover:border-cyan-400/60"}`} style={{left:p.x+"%",top:p.y+"%"}}><span className="text-[9px] font-black sm:text-[10px]">STEP {i+1}</span><span className="mt-0.5 max-w-[48px] text-[7px] leading-tight sm:max-w-[58px] sm:text-[8px]">{STAGES[i].name}</span></button>)}
          </div>
          <div className="mt-3 flex items-center justify-between gap-3"><button onClick={()=>setActive(v=>(v+7)%8)} className="rounded-xl border border-white/15 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/5">← Previous</button><div className="text-center"><p className="text-xs font-bold text-white">Stage {active+1} of 8</p><div className="mt-2 h-1.5 w-32 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-cyan-400 transition-all" style={{width:progress+"%"}}/></div></div><button onClick={()=>setActive(v=>(v+1)%8)} className="rounded-xl bg-cyan-500 px-4 py-2.5 text-xs font-black text-[#06132c] hover:bg-cyan-300">Next stage →</button></div>
        </div>
        <aside className="space-y-4">
          <article className="rounded-[24px] border border-cyan-400/20 bg-gradient-to-br from-[#10234b] to-[#0b1838] p-5">
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-cyan-300">Reaction {stage.id}</p><h2 className="mt-2 text-xl font-black text-white">{stage.name}</h2><p className="mt-2 text-sm font-bold text-cyan-200">{stage.enzyme}</p>
            <div className="mt-4 rounded-xl border border-white/10 bg-[#071027]/70 p-4"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Reaction equation</p><p className="mt-2 text-sm leading-relaxed text-white">{stage.reaction}</p></div>
            <p className="mt-4 text-sm leading-relaxed text-slate-300">{stage.detail}</p>
            <div className="mt-4 flex flex-wrap gap-2">{stage.output.map(item=><span key={item} className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1.5 text-[10px] font-bold text-emerald-200">{item}</span>)}</div>
            <p className="mt-4 text-[10px] text-slate-400">Location: {stage.location} · Carbon atoms in product: {stage.carbon}</p>
          </article>
          <article className="rounded-[24px] border border-white/10 bg-[#0b1838] p-5"><h3 className="font-bold text-white">Net yield per acetyl-CoA</h3><div className="mt-3 grid grid-cols-2 gap-2">{[["3","NADH"],["1","FADH₂"],["1","GTP / ATP"],["2","CO₂"]].map(([n,label])=><div key={label} className="rounded-xl border border-white/10 bg-white/[.03] p-3"><p className="text-2xl font-black text-cyan-300">{n}</p><p className="text-[10px] font-bold text-slate-300">{label}</p></div>)}</div><p className="mt-3 text-[10px] leading-relaxed text-slate-500">One turn uses one acetyl-CoA. Oxaloacetate is regenerated rather than consumed overall. GTP or ATP depends on the succinyl-CoA synthetase isoenzyme.</p></article>
          <article className="rounded-[24px] border border-white/10 bg-[#0b1838] p-5"><h3 className="font-bold text-white">Check your understanding</h3><p className="mt-2 text-xs leading-relaxed text-slate-300">Which reaction produces FADH₂?</p><div className="mt-3 grid grid-cols-2 gap-2">{["Succinate oxidation","Citrate formation","Hydration","Oxaloacetate regeneration"].map((answer,i)=><button key={answer} onClick={()=>setActive(answer==="Succinate oxidation"?5:active)} className={`rounded-lg border px-3 py-2 text-left text-[10px] font-bold ${answer==="Succinate oxidation"?"border-white/10 bg-white/[.03] text-slate-200 hover:border-emerald-400/40":"border-white/10 bg-white/[.03] text-slate-300 hover:border-cyan-400/30"}`}>{answer}</button>)}</div><p className="mt-2 text-[9px] text-slate-500">Select the correct stage on the cycle to review its enzyme and products.</p></article>
        </aside>
      </section>
      <p className="text-[10px] leading-relaxed text-slate-500">*Succinate dehydrogenase is embedded in the inner mitochondrial membrane (Complex II); the other cycle enzymes are located in the mitochondrial matrix. The diagram is a pathway schematic, not a molecular-scale structure.</p>
    </div>
  </main>;
}
