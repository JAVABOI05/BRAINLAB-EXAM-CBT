import type { ReactNode } from "react";
import AdminRouteWorkspace from "./AdminRouteWorkspace";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminRouteWorkspace>{children}</AdminRouteWorkspace>;
}
