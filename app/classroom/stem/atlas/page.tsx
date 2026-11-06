import CellAtlasViewer from "./CellAtlasViewer";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";
import { getUserFromRequest } from "@/app/lib/supabaseServer";
import { resolveStemAccessContext } from "@/app/lib/stem/stemAccess";

export const metadata = {
  title: "3D Cell Atlas | BrainLab STEM Studio",
  description: "Explore an interactive schematic 3D animal cell and learn the functions of its organelles.",
};

export const dynamic = "force-dynamic";

export default async function StemAtlasPage() {
  const requestHeaders = new Headers(await headers());
  const authRequest = new NextRequest("https://brainlabacademy.com.ng/classroom/stem/atlas", {
    headers: requestHeaders,
  });
  const user = await getUserFromRequest(authRequest);

  if (!user) {
    redirect("/account?next=%2Fclassroom%2Fstem%2Fatlas");
  }

  const bearerToken = requestHeaders.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  const access = await resolveStemAccessContext(user, bearerToken);

  if (access.accessLevel === "none" && !access.isPrivileged) {
    redirect("/pricing?feature=stem");
  }

  return <main className="min-h-screen bg-[#070d1e] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-7xl space-y-7">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-400"><Link href="/classroom/stem" className="hover:text-white">STEM Studio</Link><span>/</span><span className="text-cyan-300">3D Atlas</span></nav>
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="max-w-3xl"><p className="text-xs font-bold uppercase tracking-[.24em] text-cyan-300">BrainLab · Interactive science</p><h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">Explore life in three dimensions.</h1><p className="mt-3 text-sm leading-relaxed text-slate-300">Start with the animal cell. Select an organelle to understand its structure and role, then rotate and zoom the model to explore it from different angles.</p></div>
        <Link href="/classroom/stem" className="inline-flex w-fit items-center rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-xs font-bold text-white hover:bg-white/10">← Back to STEM Studio</Link>
      </header>
      <CellAtlasViewer />
    </div>
  </main>;
}
