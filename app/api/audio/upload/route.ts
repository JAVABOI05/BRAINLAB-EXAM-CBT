import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getSupabaseServerClient } from "@/app/lib/supabaseServer";
import { getAudioPolicyConfig } from "@/app/lib/platformConfig";

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = await getAudioPolicyConfig();
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const assetType =
      (formData.get("asset_type") as string) ||
      (formData.get("assetType") as string) ||
      "tutor_voice_note";
    const title = (formData.get("title") as string) || "Voice Note";
    const courseId =
      (formData.get("course_id") as string) ||
      (formData.get("courseId") as string) ||
      null;
    const assignmentId =
      (formData.get("assignment_id") as string) ||
      (formData.get("assignmentId") as string) ||
      null;
    const durationSeconds = parseFloat(
      (formData.get("duration_seconds") as string) ||
      (formData.get("durationSeconds") as string) ||
      "0"
    );

    if (!file) {
      return NextResponse.json({ error: "No audio file provided." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // 1. Role Verification & Permission Enforcing
    const { data: adminRole } = await supabase
      .from("admin_user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const { data: tutorMembership } = await supabase
      .from("learning_subject_memberships")
      .select("id")
      .eq("user_id", user.id)
      .eq("membership_role", "tutor")
      .limit(1)
      .maybeSingle();

    const isTutorOrAdmin =
      Boolean(adminRole && ["super_admin", "platform_admin", "teacher", "ai_learning_admin"].includes(adminRole.role)) ||
      Boolean(adminUser && ["super_admin", "platform_admin", "teacher", "ai_learning_admin"].includes(adminUser.role)) ||
      Boolean(tutorMembership);

    // If student submission: enforce student audio submission policies
    if (assetType === "student_submission") {
      if (!config.student_audio_enabled_globally) {
        return NextResponse.json(
          { error: "Audio submissions are disabled platform-wide by administrators." },
          { status: 403 }
        );
      }

      if (assignmentId) {
        const { data: assignment } = await supabase
          .from("assignments")
          .select("id, allow_audio_submission")
          .eq("id", assignmentId)
          .maybeSingle();

        if (assignment && !assignment.allow_audio_submission) {
          return NextResponse.json(
            { error: "This specific assignment does not accept audio submissions." },
            { status: 403 }
          );
        }
      }
    } else if (assetType === "discussion_audio") {
      // Discussion voice notes in chat and study circles are permitted for all authenticated users
    } else {
      // For tutor voice notes or lesson audio, sender must be tutor or admin
      if (!isTutorOrAdmin) {
        let isCourseTutor = false;
        if (courseId) {
          const { data: course } = await supabase
            .from("courses")
            .select("tutor_id")
            .eq("id", courseId)
            .maybeSingle();
          if (course && course.tutor_id === user.id) isCourseTutor = true;
        }

        if (!isCourseTutor) {
          return NextResponse.json(
            { error: "Forbidden. Only authorized instructors can publish voice notes or lessons." },
            { status: 403 }
          );
        }
      }
    }

    // 2. Validate File Size
    const maxBytes = (config.max_file_size_mb || 25) * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json(
        { error: `File size exceeds the allowed limit of ${config.max_file_size_mb}MB.` },
        { status: 400 }
      );
    }

    // 3. Validate MIME Type
    const mimeType = file.type || "audio/webm";
    const allowed = config.allowed_formats || ["audio/webm", "audio/mp4", "audio/ogg", "audio/mpeg", "audio/wav"];
    const isMimeAllowed = allowed.some((fmt: string) => mimeType.includes(fmt.replace("audio/", "")));
    if (!isMimeAllowed && !mimeType.startsWith("audio/")) {
      return NextResponse.json(
        { error: `Unsupported audio format (${mimeType}). Accepted: webm, mp4, ogg, mp3, wav.` },
        { status: 400 }
      );
    }

    // 4. In a production storage bucket, the file would be uploaded to Supabase Storage.
    const fileBytes = await file.arrayBuffer();
    const base64Audio = `data:${mimeType};base64,${Buffer.from(fileBytes).toString("base64")}`;

    // 5. Insert Audio Asset Record into database
    const { data: asset, error: insertError } = await supabase
      .from("audio_assets")
      .insert({
        user_id: user.id,
        asset_type: assetType,
        title,
        file_url: base64Audio,
        duration_seconds: durationSeconds,
        file_size_bytes: file.size,
        mime_type: mimeType,
        course_id: courseId || null,
        metadata: {
          original_filename: file.name,
          uploaded_by: user.email,
          assignment_id: assignmentId || null,
        },
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      asset: {
        id: asset.id,
        title: asset.title,
        duration_seconds: asset.duration_seconds,
        asset_type: asset.asset_type,
        created_at: asset.created_at,
        file_url: asset.file_url,
      },
    });
  } catch (error: unknown) {
    console.error("[audio/upload] Error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed." }, { status: 500 });
  }
}
