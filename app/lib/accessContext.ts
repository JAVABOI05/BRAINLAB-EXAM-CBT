// Typed client for the additive access-management session context.
// This is a read-only source of context; callers must still enforce authorization
// on the server and in Supabase RLS. It does not replace legacy admin role checks.
import { supabase } from "./supabase";

export type AccessSessionRole = {
  assignment_id: string;
  role_key: string;
  role_name: string;
  resource_scope: Record<string, unknown>;
  expires_at: string | null;
};

export type AccessSessionContext = {
  user_id: string;
  roles: AccessSessionRole[];
  permissions: string[];
};

export async function getAccessSessionContext(): Promise<AccessSessionContext | null> {
  const { data, error } = await supabase.rpc("access_get_session_context");
  if (error || !data || typeof data !== "object") return null;

  const value = data as Record<string, unknown>;
  if (typeof value.user_id !== "string" || !Array.isArray(value.roles) || !Array.isArray(value.permissions)) {
    return null;
  }

  const roles = value.roles.filter((item): item is AccessSessionRole => {
    if (!item || typeof item !== "object") return false;
    const role = item as Record<string, unknown>;
    return typeof role.assignment_id === "string"
      && typeof role.role_key === "string"
      && typeof role.role_name === "string"
      && !!role.resource_scope
      && typeof role.resource_scope === "object"
      && (role.expires_at === null || typeof role.expires_at === "string");
  });

  const permissions = value.permissions.filter((item): item is string => typeof item === "string");
  return { user_id: value.user_id, roles, permissions };
}
