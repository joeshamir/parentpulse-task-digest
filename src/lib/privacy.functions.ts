import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Data-subject rights (Israeli Privacy Protection Law / GDPR):
 * export everything we hold about the caller, or erase it completely.
 * Both act strictly on the authenticated caller's own rows.
 */
export const exportMyData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;

    const [groups, tasks, summaries, notifications, consents, privacyPrefs, sessions, pushSubs] =
      await Promise.all([
        supabase.from("tracked_groups").select("*").eq("user_id", userId),
        supabase.from("action_items").select("*").eq("user_id", userId),
        supabase.from("daily_summaries").select("*").eq("user_id", userId),
        supabase.from("notification_prefs").select("*").eq("user_id", userId),
        supabase.from("user_consents").select("*").eq("user_id", userId),
        supabase.from("privacy_prefs").select("*").eq("user_id", userId),
        supabase
          .from("whatsapp_sessions")
          .select("id, status, updated_at, reconnect_requested_at")
          .eq("user_id", userId),
        supabase
          .from("push_subscriptions")
          .select("id, user_agent, created_at")
          .eq("user_id", userId),
      ]);

    return {
      exported_at: new Date().toISOString(),
      account: {
        user_id: userId,
        email: (claims as { email?: string } | null)?.email ?? null,
      },
      note:
        "ParentPulse never stores WhatsApp message content, media or voice audio. Only the structured items below are kept.",
      tracked_groups: groups.data ?? [],
      action_items: tasks.data ?? [],
      daily_summaries: summaries.data ?? [],
      notification_prefs: notifications.data ?? [],
      privacy_prefs: privacyPrefs.data ?? [],
      consents: consents.data ?? [],
      whatsapp_sessions: sessions.data ?? [],
      push_subscriptions: pushSubs.data ?? [],
    };
  });

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Delete the caller's own rows through their own RLS-scoped client first.
    const tables = [
      "action_items",
      "daily_summaries",
      "tracked_groups",
      "push_subscriptions",
      "notification_prefs",
      "whatsapp_sessions",
      "privacy_prefs",
      "user_consents",
    ] as const;

    for (const table of tables) {
      const { error } = await supabase.from(table).delete().eq("user_id", userId);
      if (error) throw new Error(`Failed to delete ${table}: ${error.message}`);
    }

    // Removing the auth identity itself requires admin privileges.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);

    return { deleted: true };
  });
