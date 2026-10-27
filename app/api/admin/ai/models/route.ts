import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getAIPlatformConfig,
  saveAIPlatformConfig,
  type AIModelDefinition,
  type AIRoutingStrategy,
  type AIModelStrength,
} from "@/app/lib/platformConfig";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";

export const dynamic = "force-dynamic";

/**
 * Validates whether the requesting user is a Super Admin.
 */
async function verifySuperAdmin(request: NextRequest): Promise<{
  authorized: boolean;
  user?: { id: string; email: string };
  error?: string;
}> {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return { authorized: false, error: "Supabase configuration is missing." };
  }

  if (!token) {
    return { authorized: false, error: "Missing authorization token." };
  }

  const userClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: authUser, error: authError } = await userClient.auth.getUser(token);
  if (authError || !authUser?.user) {
    return { authorized: false, error: "Invalid session." };
  }

  // 1. Check RPC get_admin_role
  const { data: rpcRole } = await userClient.rpc("get_admin_role");
  if (rpcRole === "super_admin") {
    return {
      authorized: true,
      user: { id: authUser.user.id, email: authUser.user.email || "" },
    };
  }

  // 2. Fallback check admin_users / admin_user_roles via server client
  const serverSupabase = getSupabaseServerClient();
  const { data: adminRecord } = await serverSupabase
    .from("admin_users")
    .select("role")
    .eq("id", authUser.user.id)
    .maybeSingle();

  if (adminRecord?.role === "super_admin") {
    return {
      authorized: true,
      user: { id: authUser.user.id, email: authUser.user.email || "" },
    };
  }

  const { data: roleRecord } = await serverSupabase
    .from("admin_user_roles")
    .select("role")
    .eq("user_id", authUser.user.id)
    .maybeSingle();

  if (roleRecord?.role === "super_admin") {
    return {
      authorized: true,
      user: { id: authUser.user.id, email: authUser.user.email || "" },
    };
  }

  return {
    authorized: false,
    error: "Forbidden: Managing the AI Model Pool and Shuffling Strategy requires Super Admin privileges.",
  };
}

/**
 * GET: Returns the full model pool and routing strategy
 */
export async function GET() {
  try {
    const config = await getAIPlatformConfig();
    return NextResponse.json({
      routing_strategy: config.routing_strategy || "auto_strength",
      pinned_model_id: config.pinned_model_id,
      model_pool: config.model_pool || [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load model pool." },
      { status: 500 }
    );
  }
}

/**
 * POST: Adds a new model to the pool, or updates an existing model.
 * Super Admin Only.
 */
export async function POST(request: NextRequest) {
  const auth = await verifySuperAdmin(request);
  if (!auth.authorized || !auth.user) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, provider, modelIdentifier, strength, priority, dailyQuotaLimit, maxTokens, notes } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Model name is required." }, { status: 400 });
    }
    const validProviders = ["gemini", "groq", "openai", "anthropic", "openrouter"];
    if (!validProviders.includes(provider)) {
      return NextResponse.json({ error: "Provider must be 'gemini', 'groq', 'openai', 'anthropic', or 'openrouter'." }, { status: 400 });
    }
    if (!modelIdentifier || typeof modelIdentifier !== "string" || !modelIdentifier.trim()) {
      return NextResponse.json({ error: "Model identifier is required." }, { status: 400 });
    }

    const validStrengths: AIModelStrength[] = ["reasoning_stem", "speed_drill", "general", "failover"];
    const modelStrength: AIModelStrength = validStrengths.includes(strength) ? strength : "general";

    const config = await getAIPlatformConfig();
    const pool = [...(config.model_pool || [])];

    // Check if model already exists (by ID or modelIdentifier)
    const existingIndex = pool.findIndex(
      (m) => m.modelIdentifier.toLowerCase() === modelIdentifier.toLowerCase().trim()
    );

    const modelId =
      body.id ||
      `${provider}-${modelIdentifier.replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase()}-${Date.now().toString(36)}`;

    const newModel: AIModelDefinition = {
      id: modelId,
      name: name.trim(),
      provider,
      modelIdentifier: modelIdentifier.trim(),
      strength: modelStrength,
      priority: Number(priority) || pool.length + 1,
      enabled: typeof body.enabled === "boolean" ? body.enabled : true,
      maxTokens: Number(maxTokens) || 350,
      dailyQuotaLimit: Number(dailyQuotaLimit) || (provider === "gemini" ? 1500 : 1000),
      notes: typeof notes === "string" ? notes.trim() : "",
      addedAt: new Date().toISOString(),
      addedBy: auth.user.email,
    };

    if (existingIndex >= 0) {
      pool[existingIndex] = { ...pool[existingIndex], ...newModel };
    } else {
      pool.push(newModel);
    }

    config.model_pool = pool;
    const ok = await saveAIPlatformConfig(config, auth.user);
    if (!ok) {
      return NextResponse.json({ error: "Failed to save updated model pool." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: existingIndex >= 0 ? "Model updated successfully." : "New model added to pool.",
      model: newModel,
      model_pool: pool,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to add model." },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Removes a model from the pool.
 * Super Admin Only.
 */
export async function DELETE(request: NextRequest) {
  const auth = await verifySuperAdmin(request);
  if (!auth.authorized || !auth.user) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const modelId = searchParams.get("id");
    if (!modelId) {
      return NextResponse.json({ error: "Model ID is required." }, { status: 400 });
    }

    const config = await getAIPlatformConfig();
    const pool = config.model_pool || [];

    if (pool.length <= 1) {
      return NextResponse.json(
        { error: "Cannot delete the last remaining model in the pool. Add an alternative first." },
        { status: 400 }
      );
    }

    const updatedPool = pool.filter((m) => m.id !== modelId && m.modelIdentifier !== modelId);
    if (updatedPool.length === pool.length) {
      return NextResponse.json({ error: "Model not found in pool." }, { status: 404 });
    }

    config.model_pool = updatedPool;
    if (config.pinned_model_id === modelId) {
      config.pinned_model_id = updatedPool[0]?.id;
    }

    const ok = await saveAIPlatformConfig(config, auth.user);
    if (!ok) {
      return NextResponse.json({ error: "Failed to persist deletion." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Model removed from pool.",
      model_pool: updatedPool,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete model." },
      { status: 500 }
    );
  }
}

/**
 * PATCH: Updates routing strategy, pins a model, or toggles enable/disable.
 * Super Admin Only.
 */
export async function PATCH(request: NextRequest) {
  const auth = await verifySuperAdmin(request);
  if (!auth.authorized || !auth.user) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  try {
    const body = await request.json();
    const config = await getAIPlatformConfig();

    if (body.routing_strategy) {
      const validStrategies: AIRoutingStrategy[] = ["auto_strength", "load_balance", "priority_failover", "admin_pinned"];
      if (!validStrategies.includes(body.routing_strategy)) {
        return NextResponse.json({ error: "Invalid routing strategy." }, { status: 400 });
      }
      config.routing_strategy = body.routing_strategy;
    }

    if (body.pinned_model_id !== undefined) {
      config.pinned_model_id = body.pinned_model_id;
    }

    // Toggle model enabled or priority
    if (body.toggle_model_id) {
      const pool = config.model_pool || [];
      const model = pool.find((m) => m.id === body.toggle_model_id);
      if (model) {
        if (typeof body.enabled === "boolean") {
          model.enabled = body.enabled;
        } else {
          model.enabled = !model.enabled;
        }
      }
      config.model_pool = pool;
    }

    // Update custom provider API keys (Super Admin Credentials Vault)
    if (body.provider_keys && typeof body.provider_keys === "object") {
      config.provider_keys = {
        ...(config.provider_keys || {}),
        ...(typeof body.provider_keys.openai === "string" ? { openai: body.provider_keys.openai.trim() } : {}),
        ...(typeof body.provider_keys.anthropic === "string" ? { anthropic: body.provider_keys.anthropic.trim() } : {}),
        ...(typeof body.provider_keys.openrouter === "string" ? { openrouter: body.provider_keys.openrouter.trim() } : {}),
        ...(typeof body.provider_keys.gemini === "string" ? { gemini: body.provider_keys.gemini.trim() } : {}),
        ...(typeof body.provider_keys.groq === "string" ? { groq: body.provider_keys.groq.trim() } : {}),
      };
    }

    const ok = await saveAIPlatformConfig(config, auth.user);
    if (!ok) {
      return NextResponse.json({ error: "Failed to save strategy changes." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "AI Model Pool & Shuffling Strategy updated.",
      routing_strategy: config.routing_strategy,
      pinned_model_id: config.pinned_model_id,
      model_pool: config.model_pool,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update strategy." },
      { status: 500 }
    );
  }
}
