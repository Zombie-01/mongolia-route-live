import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface UpdateUserData {
  userId: string;
  email?: string;
  password?: string;
  display_name?: string;
  phone?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");

    // Prefer explicit legacy envs, fall back to new JSON envs if provided by platform
    let supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    let supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    const tryParseJsonKeys = (txt: string | null) => {
      if (!txt) return null as null | Record<string, unknown>;
      try {
        return JSON.parse(txt) as Record<string, unknown>;
      } catch (e) {
        return null;
      }
    };

    if (!supabaseServiceKey) {
      const secretKeys = tryParseJsonKeys(
        Deno.env.get("SUPABASE_SECRET_KEYS") ?? Deno.env.get("SUPABASE_SECRET_KEY"),
      );
      if (secretKeys) {
        // Prefer keys with "service" in the name, otherwise pick the first value
        const found = Object.entries(secretKeys).find(([k]) => k.toLowerCase().includes("service"));
        if (found) supabaseServiceKey = String(found[1]);
        else {
          const vals = Object.values(secretKeys).filter(Boolean);
          if (vals.length) supabaseServiceKey = String(vals[0]);
        }
      }
    }

    if (!supabaseAnonKey) {
      const pubKeys = tryParseJsonKeys(
        Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY"),
      );
      if (pubKeys) {
        const found = Object.entries(pubKeys).find(
          ([k]) => k.toLowerCase().includes("anon") || k.toLowerCase().includes("publishable"),
        );
        if (found) supabaseAnonKey = String(found[1]);
        else {
          const vals = Object.values(pubKeys).filter(Boolean);
          if (vals.length) supabaseAnonKey = String(vals[0]);
        }
      }
    }

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      console.error("update-user: missing Supabase envs", {
        SUPABASE_URL: !!supabaseUrl,
        SERVICE_KEY: !!supabaseServiceKey,
        ANON_KEY: !!supabaseAnonKey,
      });
      return new Response(
        JSON.stringify({ error: "Server misconfiguration: missing Supabase env keys" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Extract token from a variety of sources: standard Authorization header,
    // common alternate headers, or cookies (some clients/platforms populate different names).
    const getTokenFromRequest = () => {
      const headerCandidates = [
        "authorization",
        "Authorization",
        "x-supabase-jwt",
        "x-supabase-auth",
        "x-nhost-jwt",
        "sb-access-token",
        "x-access-token",
      ];
      for (const name of headerCandidates) {
        const h = req.headers.get(name);
        if (h) {
          if (h.toLowerCase().startsWith("bearer "))
            return { token: h.replace(/^Bearer\s+/i, ""), source: name };
          return { token: h, source: name };
        }
      }

      const cookie = req.headers.get("cookie");
      if (cookie) {
        const parts = cookie.split(";").map((s) => s.trim());
        for (const p of parts) {
          const [k, v] = p.split("=");
          if (!k) continue;
          // common cookie names observed in various deployments
          if (
            k === "sb:token" ||
            k === "sb_token" ||
            k === "supabase-auth-token" ||
            k === "session"
          ) {
            return { token: decodeURIComponent(v || ""), source: `cookie:${k}` };
          }
        }
      }
      return null;
    };

    const tokenObj = getTokenFromRequest();
    let isServiceAuth = false;
    // If no token supplied, allow service-role apikey header as a fallback (internal use only)
    if (!tokenObj || !tokenObj.token) {
      const apiKeyHeader =
        req.headers.get("apikey") ||
        req.headers.get("x-api-key") ||
        req.headers.get("x-supabase-apikey");
      if (apiKeyHeader && supabaseServiceKey && apiKeyHeader === supabaseServiceKey) {
        isServiceAuth = true;
        try {
          console.info("update-user: authorized via apikey header");
        } catch {}
      } else {
        return new Response(JSON.stringify({ error: "Unauthorized: missing token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const token = tokenObj?.token;
    try {
      if (tokenObj?.source) console.info("update-user: token-source", tokenObj.source);
    } catch {}
    // Log incoming headers for debugging
    try {
      console.info("update-user: incoming-headers", Object.fromEntries(req.headers.entries()));
    } catch {}

    // Capture raw body for logging in case JSON parse fails
    let rawBody = "";
    try {
      rawBody = await req.text();
      console.info("update-user: raw-body", rawBody);
    } catch (e) {
      console.warn("update-user: failed to read raw body", e);
    }
    // Re-create a Request with the raw body for later parsing
    const bodyText = rawBody || "{}";
    const parsedJson = (() => {
      try {
        return JSON.parse(bodyText);
      } catch {
        return null;
      }
    })();
    let callerUserId: string | null = null;
    if (!isServiceAuth) {
      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      });

      const { data: userData, error: authError } = await supabaseAuth.auth.getUser();
      if (authError || !userData.user) {
        console.warn("update-user: auth.getUser failed", authError);
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      callerUserId = userData.user.id;

      const { data: roleData, error: roleError } = await supabaseAuth
        .from("user_roles")
        .select("role")
        .eq("user_id", callerUserId)
        .maybeSingle();

      if (roleError || roleData?.role !== "admin") {
        console.warn("update-user: caller missing admin role", roleError, roleData);
        return new Response(JSON.stringify({ error: "Forbidden: admin role required" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // service auth: caller is the service key, allow operation
      callerUserId = "service";
    }

    const body: UpdateUserData = (parsedJson ??
      (await (async () => {
        try {
          return await (async () => JSON.parse(bodyText))();
        } catch {
          return {};
        }
      })())) as UpdateUserData;
    if (!body.userId) {
      return new Response(JSON.stringify({ error: "Missing required field: userId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });

    // First fetch existing user to preserve metadata (especially the 'role' field)
    const { data: existingUser, error: fetchError } = await supabaseAdmin.auth.admin.getUserById(
      body.userId,
    );
    if (fetchError) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch user: ${fetchError.message}` }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const updateData: Record<string, unknown> = {};
    if (body.email) updateData.email = body.email;
    if (body.password) updateData.password = body.password;
    if (body.display_name || body.phone) {
      // Preserve existing metadata (especially 'role') and merge with new values
      const existingMetadata = existingUser.user?.user_metadata || {};
      updateData.user_metadata = {
        ...existingMetadata, // preserve existing fields like 'role'
        ...(body.display_name ? { display_name: body.display_name } : {}),
        ...(body.phone ? { phone: body.phone } : {}),
      };
    }

    if (Object.keys(updateData).length > 0) {
      // Log existing user and intended update for debugging
      try {
        console.info("update-user: existingUser", {
          id: existingUser.user?.id,
          email: existingUser.user?.email,
          user_metadata: existingUser.user?.user_metadata,
        });
      } catch {}
      console.info("update-user: updateData", updateData);

      try {
        const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUser(
          body.userId,
          updateData,
        );
        if (updateError) {
          console.error("update-user: admin.updateUser failed", updateError);
          return new Response(
            JSON.stringify({ error: `Failed to update user`, details: updateError }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
      } catch (e) {
        console.error("update-user: admin.updateUser threw", e);
        return new Response(
          JSON.stringify({ error: `Failed to update user`, details: String(e) }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    if (body.display_name || body.phone) {
      const profileUpdate: Record<string, unknown> = {};
      if (body.display_name) profileUpdate.display_name = body.display_name;
      if (body.phone) profileUpdate.phone = body.phone;
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update(profileUpdate)
        .eq("id", body.userId);
      if (profileError) {
        // Non-blocking: continue even if profile update fails.
        console.warn("update-user: Failed to update profile metadata", profileError);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("update-user error:", err);
    const msg =
      err && typeof err === "object" && "message" in err ? (err as any).message : String(err);
    return new Response(JSON.stringify({ error: `Internal server error: ${msg}` }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
