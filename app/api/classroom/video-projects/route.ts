import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getSupabaseServerClient } from "@/app/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const supabase = getSupabaseServerClient(token);

    const { data: projects, error } = await supabase
      .from("classroom_video_projects")
      .select("*")
      .eq("tutor_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.warn("[video-projects/GET] Error:", error.message);
      return NextResponse.json({ projects: [] });
    }

    return NextResponse.json({ success: true, projects: projects || [] });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load video projects." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const supabase = getSupabaseServerClient(token);
    const body = await request.json().catch(() => ({}));

    const {
      id,
      title,
      subject,
      topic,
      description,
      status,
      layout_mode,
      pip_position,
      pip_size,
      quality_preset,
      orientation,
      last_recording_url,
      last_recording_duration,
      last_recording_size,
    } = body;

    const payload = {
      tutor_id: user.id,
      title: title || "Untitled Video Lesson",
      subject: subject || null,
      topic: topic || null,
      description: description || null,
      status: status || "draft",
      layout_mode: layout_mode || "whiteboard_pip",
      pip_position: pip_position || "bottom_right",
      pip_size: pip_size || "medium",
      quality_preset: quality_preset || "1080p",
      orientation: orientation || "landscape",
      last_recording_url: last_recording_url || null,
      last_recording_duration: last_recording_duration || 0,
      last_recording_size: last_recording_size || 0,
      updated_at: new Date().toISOString(),
    };

    let result;
    if (id) {
      const { data, error } = await supabase
        .from("classroom_video_projects")
        .update(payload)
        .eq("id", id)
        .eq("tutor_id", user.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabase
        .from("classroom_video_projects")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return NextResponse.json({ success: true, project: result });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save video project." },
      { status: 500 }
    );
  }
}
