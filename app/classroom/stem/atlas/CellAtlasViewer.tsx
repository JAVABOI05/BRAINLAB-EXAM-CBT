"use client";

import { useEffect, useRef, useState } from "react";

type Organelle = { id: string; name: string; role: string; detail: string; color: [number, number, number]; position: [number, number, number]; scale: [number, number, number] };

const ORGANELLES: Organelle[] = [
  { id: "nucleus", name: "Nucleus", role: "Control centre", detail: "Contains most of the cell's genetic material (DNA) and helps regulate gene expression and cell activities.", color: [0.55, 0.42, 0.91], position: [0, 0.05, 0], scale: [0.43, 0.48, 0.4] },
  { id: "mitochondrion", name: "Mitochondrion", role: "ATP production", detail: "Carries out aerobic respiration. The inner membrane houses the electron transport chain and ATP synthase.", color: [0.94, 0.48, 0.23], position: [-0.55, -0.32, 0.12], scale: [0.3, 0.15, 0.18] },
  { id: "rough-er", name: "Rough endoplasmic reticulum", role: "Protein processing", detail: "Membrane network studded with ribosomes. It helps synthesise and process proteins destined for membranes or secretion.", color: [0.22, 0.68, 0.78], position: [0.48, 0.42, -0.08], scale: [0.35, 0.12, 0.16] },
  { id: "golgi", name: "Golgi apparatus", role: "Modify and package", detail: "Modifies, sorts and packages proteins and lipids into vesicles for delivery to their destinations.", color: [0.93, 0.68, 0.24], position: [0.48, -0.38, 0.1], scale: [0.26, 0.18, 0.14] },
  { id: "lysosome", name: "Lysosome", role: "Intracellular digestion", detail: "An enzyme-containing vesicle that breaks down selected macromolecules and worn-out cell components.", color: [0.3, 0.75, 0.52], position: [-0.35, 0.52, 0.08], scale: [0.13, 0.13, 0.13] },
  { id: "ribosome", name: "Ribosomes", role: "Protein synthesis", detail: "Molecular machines that translate messenger RNA into polypeptide chains. They may be free in the cytosol or attached to rough ER.", color: [0.94, 0.35, 0.48], position: [0.12, -0.62, 0.18], scale: [0.09, 0.09, 0.09] },
];

const vertexShader = `
attribute vec3 aPosition;
uniform mat4 uMVP;
varying vec3 vNormal;
void main() { vNormal = normalize(aPosition); gl_Position = uMVP * vec4(aPosition, 1.0); }
`;
const fragmentShader = `
precision mediump float;
uniform vec3 uColor;
uniform float uAlpha;
varying vec3 vNormal;
void main() {
  vec3 light = normalize(vec3(-0.45, 0.7, 1.0));
  float diffuse = max(dot(normalize(vNormal), light), 0.0);
  float shade = 0.34 + diffuse * 0.72;
  gl_FragColor = vec4(uColor * shade, uAlpha);
}
`;

function sphereData(lat = 22, lon = 30) {
  const vertices: number[] = [], indices: number[] = [];
  for (let y = 0; y <= lat; y++) {
    const theta = y * Math.PI / lat;
    for (let x = 0; x <= lon; x++) {
      const phi = x * 2 * Math.PI / lon;
      vertices.push(-Math.cos(phi) * Math.sin(theta), Math.cos(theta), Math.sin(phi) * Math.sin(theta));
    }
  }
  for (let y = 0; y < lat; y++) for (let x = 0; x < lon; x++) {
    const a = y * (lon + 1) + x, b = a + lon + 1;
    indices.push(a, b, a + 1, b, b + 1, a + 1);
  }
  return { vertices: new Float32Array(vertices), indices: new Uint16Array(indices) };
}
function identity(): number[] { return [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]; }
function multiply(a: number[], b: number[]) {
  const o = new Array(16).fill(0);
  for (let c=0;c<4;c++) for(let r=0;r<4;r++) for(let k=0;k<4;k++) o[c*4+r]+=a[k*4+r]*b[c*4+k];
  return o;
}
function perspective(f: number, aspect: number, near: number, far: number) {
  const t=1/Math.tan(f/2), nf=1/(near-far);
  return [t/aspect,0,0,0, 0,t,0,0, 0,0,(far+near)*nf,-1, 0,0,2*far*near*nf,0];
}
function modelMatrix(position: number[], scale: number[], rx: number, ry: number) {
  const cx=Math.cos(rx), sx=Math.sin(rx), cy=Math.cos(ry), sy=Math.sin(ry);
  return [
    cy*scale[0], sx*sy*scale[0], -cx*sy*scale[0], 0,
    0, cx*scale[1], sx*scale[1], 0,
    sy*scale[2], -sx*cy*scale[2], cx*cy*scale[2], 0,
    position[0], position[1], position[2], 1
  ];
}
function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader=gl.createShader(type); if(!shader) throw new Error("WebGL shader unavailable");
  gl.shaderSource(shader,source); gl.compileShader(shader);
  if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader)||"Shader compile failed");
  return shader;
}

export default function CellAtlasViewer() {
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const [selected,setSelected]=useState("nucleus");
  const [rotation,setRotation]=useState({x:0.22,y:-0.42});
  const [zoom,setZoom]=useState(3.2);
  const [webglError,setWebglError]=useState(false);
  const [showLabels,setShowLabels]=useState(true);
  const [visibleOrganelles,setVisibleOrganelles]=useState<string[]>(ORGANELLES.map(o=>o.id));
  const [isolateSelected,setIsolateSelected]=useState(false);
  const [membraneOpacity,setMembraneOpacity]=useState(34);
  const [dragging,setDragging]=useState(false);
  const active=ORGANELLES.find(o=>o.id===selected)||ORGANELLES[0];
  const rotationRef=useRef(rotation); rotationRef.current=rotation;
  const zoomRef=useRef(zoom); zoomRef.current=zoom;
  const selectedRef=useRef(selected); selectedRef.current=selected;
  const visibleRef=useRef(visibleOrganelles); visibleRef.current=visibleOrganelles;
  const isolateRef=useRef(isolateSelected); isolateRef.current=isolateSelected;
  const membraneOpacityRef=useRef(membraneOpacity); membraneOpacityRef.current=membraneOpacity;

  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas) return;
    const gl=canvas.getContext("webgl",{alpha:true,antialias:true});
    if(!gl){setWebglError(true);return;}
    try {
      const program=gl.createProgram(); if(!program) throw new Error("Program unavailable");
      gl.attachShader(program,compile(gl,gl.VERTEX_SHADER,vertexShader));
      gl.attachShader(program,compile(gl,gl.FRAGMENT_SHADER,fragmentShader));
      gl.linkProgram(program); if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error("WebGL link failed");
      gl.useProgram(program);
      const data=sphereData();
      const vb=gl.createBuffer(), ib=gl.createBuffer();
      if(!vb||!ib) throw new Error("Could not allocate model buffers");
      gl.bindBuffer(gl.ARRAY_BUFFER,vb); gl.bufferData(gl.ARRAY_BUFFER,data.vertices,gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,data.indices,gl.STATIC_DRAW);
      const pos=gl.getAttribLocation(program,"aPosition"); gl.enableVertexAttribArray(pos); gl.vertexAttribPointer(pos,3,gl.FLOAT,false,0,0);
      const mvpLoc=gl.getUniformLocation(program,"uMVP"), colorLoc=gl.getUniformLocation(program,"uColor"), alphaLoc=gl.getUniformLocation(program,"uAlpha");
      gl.enable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
      const draw=(position:number[],scale:number[],color:number[],alpha:number,rx:number,ry:number)=>{
        const model=modelMatrix(position,scale,rx,ry);
        const view=identity(); view[14]=-zoomRef.current;
        const aspect=canvas.clientWidth/Math.max(1,canvas.clientHeight);
        const mvp=multiply(perspective(Math.PI/4,aspect,0.1,30),multiply(view,model));
        gl.uniformMatrix4fv(mvpLoc,false,new Float32Array(mvp));
        gl.uniform3fv(colorLoc,new Float32Array(color)); gl.uniform1f(alphaLoc,alpha);
        gl.drawElements(gl.TRIANGLES,data.indices.length,gl.UNSIGNED_SHORT,0);
      };
      let frame=0, disposed=false;
      const render=()=>{
        if(disposed)return;
        const w=canvas.clientWidth,h=canvas.clientHeight,dpr=Math.min(window.devicePixelRatio||1,1.7);
        if(canvas.width!==Math.floor(w*dpr)||canvas.height!==Math.floor(h*dpr)){canvas.width=Math.floor(w*dpr);canvas.height=Math.floor(h*dpr);}
        gl.viewport(0,0,canvas.width,canvas.height); gl.clearColor(0.025,0.055,0.13,0); gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
        draw([0,0,0],[1.22,0.82,0.68],[0.18,0.57,0.78],0.18,rotationRef.current.x,rotationRef.current.y);
        draw([0,0,0],[1.12,0.74,0.61],[0.12,0.38,0.57],membraneOpacityRef.current/100,rotationRef.current.x,rotationRef.current.y);
        ORGANELLES.forEach(o=>{
          const visible=visibleRef.current.includes(o.id);
          const isolated=isolateRef.current && selectedRef.current!==o.id;
          if(visible && !isolated) draw(o.position,o.scale,o.color,selectedRef.current===o.id?1:0.88,rotationRef.current.x,rotationRef.current.y);
        });
        frame=requestAnimationFrame(render);
      };
      render();
      return ()=>{disposed=true;cancelAnimationFrame(frame);gl.deleteBuffer(vb);gl.deleteBuffer(ib);gl.deleteProgram(program);};
    } catch { setWebglError(true); }
  },[]);

  const pointer=useRef<{x:number;y:number}|null>(null);
  return <section className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,.8fr)]">
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#08132e] shadow-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
        <div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-cyan-300">3D biological model</p><h2 className="mt-1 text-lg font-black text-white">Animal cell · interactive view</h2></div>
        <div className="flex items-center gap-2 text-[10px] text-slate-400"><span className="h-2 w-2 rounded-full bg-emerald-400"/> WebGL renderer</div>
      </div>
      <div className="relative h-[340px] sm:h-[470px]">
        {webglError ? <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center"><span className="text-4xl">🧫</span><p className="font-bold text-white">3D graphics are unavailable on this device</p><p className="max-w-sm text-sm text-slate-400">Your browser or device could not start WebGL. Use the organelle explorer on the right or try a browser with hardware acceleration enabled.</p></div> : <canvas ref={canvasRef} className="h-full w-full touch-none" aria-label="Rotatable schematic 3D animal cell model" onPointerDown={e=>{pointer.current={x:e.clientX,y:e.clientY};setDragging(true);e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={e=>{if(!pointer.current)return;const dx=e.clientX-pointer.current.x,dy=e.clientY-pointer.current.y;pointer.current={x:e.clientX,y:e.clientY};setRotation(r=>({x:Math.max(-1.1,Math.min(1.1,r.x+dy*.008)),y:r.y+dx*.008}));}} onPointerUp={()=>{pointer.current=null;setDragging(false);}} onPointerCancel={()=>{pointer.current=null;setDragging(false);}}/>}
        <div className="pointer-events-none absolute left-4 top-4 rounded-xl border border-white/10 bg-[#071027]/80 px-3 py-2 text-[10px] text-slate-300">Drag to rotate · Use zoom control below</div>
        <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <button onClick={()=>{setRotation({x:0.22,y:-0.42});setZoom(3.2);}} className="rounded-lg border border-white/15 bg-[#071027]/85 px-3 py-2 text-xs font-bold text-white">Reset view</button>
            <button onClick={()=>setIsolateSelected(v=>!v)} aria-pressed={isolateSelected} className="rounded-lg border border-cyan-300/30 bg-[#071027]/85 px-3 py-2 text-xs font-bold text-cyan-200">{isolateSelected?"Show all":"Isolate selected"}</button>
          </div>
          <label className="flex items-center gap-2 rounded-lg border border-white/15 bg-[#071027]/85 px-3 py-2 text-xs text-slate-200"><input type="checkbox" checked={showLabels} onChange={e=>setShowLabels(e.target.checked)}/> Show labels</label>
        </div>
        {showLabels && !webglError && <div className="pointer-events-none absolute right-4 top-4 flex max-w-[150px] flex-col gap-1">{ORGANELLES.slice(0,4).map(o=><span key={o.id} className="rounded-md border border-white/10 bg-[#071027]/75 px-2 py-1 text-[9px] text-slate-200">{o.name}</span>)}</div>}
      </div>
      <div className="border-t border-white/10 px-5 py-4">
        <div className="mb-2 flex items-center justify-between text-xs text-slate-300"><span>Outer membrane opacity</span><span>{membraneOpacity}%</span></div>
        <input aria-label="Outer membrane opacity" type="range" min="5" max="70" step="1" value={membraneOpacity} onChange={e=>setMembraneOpacity(Number(e.target.value))} className="mb-4 w-full accent-cyan-400"/>
        <div className="mb-2 flex items-center justify-between text-xs text-slate-300"><span>Model zoom</span><span>{zoom.toFixed(1)}×</span></div>
        <input aria-label="Model zoom" type="range" min="2.3" max="4.8" step=".1" value={zoom} onChange={e=>setZoom(Number(e.target.value))} className="w-full accent-cyan-400"/>
        <p className="mt-2 text-[10px] leading-relaxed text-slate-500">Educational schematic, not to scale. Organelle placement and proportions are simplified to support introductory exploration.</p>
      </div>
    </div>
    <aside className="space-y-4">
      <div className="rounded-[24px] border border-white/10 bg-[#0b1838] p-5">
        <p className="text-[10px] font-bold uppercase tracking-[.2em] text-cyan-300">Explore structures</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {ORGANELLES.map(o=>(
            <div key={o.id} className="flex min-w-0 items-stretch gap-1">
              <button type="button" onClick={()=>{setSelected(o.id);setVisibleOrganelles(v=>v.includes(o.id)?v:[...v,o.id]);}} aria-pressed={selected===o.id} className={`min-w-0 flex-1 rounded-xl border px-3 py-3 text-left text-xs font-bold transition ${selected===o.id?"border-cyan-400/60 bg-cyan-400/10 text-cyan-200":"border-white/10 bg-white/[.03] text-slate-300 hover:bg-white/[.07]"}`}>
                <span className="mb-2 block h-2 w-2 rounded-full" style={{background:`rgb(${o.color.map(c=>Math.round(c*255)).join(",")})`}}/>
                {o.name}
              </button>
              <button type="button" aria-label={`${visibleOrganelles.includes(o.id)?"Hide":"Show"} ${o.name}`} aria-pressed={visibleOrganelles.includes(o.id)} onClick={()=>setVisibleOrganelles(v=>v.includes(o.id)?v.filter(id=>id!==o.id):[...v,o.id])} className="rounded-lg border border-white/10 px-2 text-[10px] text-slate-300 hover:bg-white/10">
                {visibleOrganelles.includes(o.id)?"●":"○"}
              </button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={()=>{setVisibleOrganelles(ORGANELLES.map(o=>o.id));setIsolateSelected(false);}} className="rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-[10px] font-bold text-cyan-200">Show all structures</button>
          <button type="button" onClick={()=>{setVisibleOrganelles([]);setIsolateSelected(false);}} className="rounded-lg border border-white/10 px-3 py-2 text-[10px] font-bold text-slate-300 hover:bg-white/10">Hide all</button>
        </div>
        <p className="mt-3 text-[10px] leading-relaxed text-slate-500">Select a structure to inspect it; selecting a hidden structure automatically makes it visible. Use the dot controls to hide or restore individual structures.</p>
      </div>
      <div className="rounded-[24px] border border-cyan-400/20 bg-gradient-to-br from-[#10234b] to-[#0b1838] p-5">
        <p className="text-[10px] font-bold uppercase tracking-[.2em] text-cyan-300">Selected structure</p>
        <h3 className="mt-2 text-xl font-black text-white">{active.name}</h3>
        <p className="mt-1 text-xs font-bold text-cyan-200">{active.role}</p>
        <p className="mt-4 text-sm leading-relaxed text-slate-300">{active.detail}</p>
        <div className="mt-5 border-t border-white/10 pt-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Learning prompt</p><p className="mt-2 text-xs leading-relaxed text-slate-300">How would damage to the {active.name.toLowerCase()} affect the normal functioning of this cell?</p></div>
      </div>
      <div className="rounded-[24px] border border-white/10 bg-[#0b1838] p-5"><h3 className="font-bold text-white">Learning objectives</h3><ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-300"><li>• Identify key animal-cell organelles.</li><li>• Relate each structure to its major function.</li><li>• Explain how organelles work together to maintain cell activity.</li></ul></div>
    </aside>
  </section>;
}
