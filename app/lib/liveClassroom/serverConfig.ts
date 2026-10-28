import { getSupabaseServerClient } from "@/app/lib/supabaseServer";
import { getLiveClassroomConfig, type LiveClassroomConfig } from "@/app/lib/platformConfig";

const CONFIG_KEY = "live_classroom_config";

export async function readLiveConfigServer(): Promise<LiveClassroomConfig> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Server-side configuration storage is not configured.");
  }
  const db = getSupabaseServerClient();
  const { data, error } = await db.from("exam_config").select("config_value").eq("config_key", CONFIG_KEY).maybeSingle();
  if (error) {
    console.error("[live-config] Read failed:", error.code, error.message);
    throw new Error("Unable to read live service configuration.");
  }
  return (data?.config_value as LiveClassroomConfig | undefined) ?? getLiveClassroomConfig();
}

export async function writeLiveConfigServer(config: LiveClassroomConfig): Promise<void> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Server-side configuration storage is not configured.");
  }
  const db = getSupabaseServerClient();
  const { error } = await db.from("exam_config").upsert({
    config_key: CONFIG_KEY,
    config_value: config,
    updated_at: new Date().toISOString(),
  }, { onConflict: "config_key" });
  if (error) {
    console.error("[live-config] Write failed:", error.code, error.message);
    throw new Error("Database error saving live service configuration.");
  }
  const { data, error: verifyError } = await db.from("exam_config").select("config_key").eq("config_key", CONFIG_KEY).maybeSingle();
  if (verifyError || !data) {
    throw new Error("Live service configuration could not be verified after saving.");
  }
}
