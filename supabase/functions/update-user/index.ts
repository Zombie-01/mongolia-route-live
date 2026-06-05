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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData, error: roleError } = await supabaseAuth
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (roleError || roleData?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden: admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: UpdateUserData = await req.json();
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
      const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUser(
        body.userId,
        updateData,
      );
      if (updateError) {
        return new Response(
          JSON.stringify({ error: `Failed to update user: ${updateError.message}` }),
          {
            status: 400,
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
        console.warn("Failed to update profile metadata", profileError);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("update-user error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
