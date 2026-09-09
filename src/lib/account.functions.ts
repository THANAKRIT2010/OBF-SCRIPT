import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { z } from "zod";

import { SESSION_COOKIE, verifySession, type SessionUser } from "./session.server";

async function currentUser(): Promise<SessionUser | null> {
  return verifySession(getCookie(SESSION_COOKIE));
}

async function requireUser(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const getSessionUser = createServerFn({ method: "GET" }).handler(async () => {
  const user = await currentUser();
  const configured = Boolean(process.env["DISCORD_CLIENT_ID"] && process.env["DISCORD_CLIENT_SECRET"]);
  return { user, discordConfigured: configured };
});

export const getDashboard = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireUser();
  const supabase = await db();

  const [tokens, quests, settings] = await Promise.all([
    supabase
      .from("bot_tokens")
      .select("id, label, is_active, created_at, token")
      .eq("user_id", user.uid)
      .order("created_at", { ascending: false }),
    supabase
      .from("quest_logs")
      .select("id, quest_name, game, status, progress, expires_at, created_at")
      .eq("user_id", user.uid)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("bot_settings").select("*").eq("user_id", user.uid).maybeSingle(),
  ]);

  return {
    user,
    tokens: (tokens.data ?? []).map((row) => ({
      id: row.id,
      label: row.label,
      isActive: row.is_active,
      createdAt: row.created_at,
      preview: `${row.token.slice(0, 6)}••••••••${row.token.slice(-4)}`,
    })),
    quests: quests.data ?? [],
    settings:
      settings.data ?? {
        user_id: user.uid,
        timezone: "Asia/Bangkok",
        auto_claim: true,
        notify_dm: true,
        notify_channel_id: null,
        updated_at: new Date().toISOString(),
      },
  };
});

export const addToken = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        label: z.string().trim().min(1).max(60),
        token: z.string().trim().min(20).max(200),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const user = await requireUser();
    const supabase = await db();
    const { error } = await supabase.from("bot_tokens").insert({
      user_id: user.uid,
      label: data.label,
      token: data.token,
    });
    if (error) throw new Error("บันทึกโทเคนไม่สำเร็จ");
    return { ok: true };
  });

export const toggleToken = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), isActive: z.boolean() }).parse(data),
  )
  .handler(async ({ data }) => {
    const user = await requireUser();
    const supabase = await db();
    await supabase
      .from("bot_tokens")
      .update({ is_active: data.isActive })
      .eq("id", data.id)
      .eq("user_id", user.uid);
    return { ok: true };
  });

export const deleteToken = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const user = await requireUser();
    const supabase = await db();
    await supabase.from("bot_tokens").delete().eq("id", data.id).eq("user_id", user.uid);
    return { ok: true };
  });

export const saveSettings = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        timezone: z.string().trim().min(1).max(60),
        autoClaim: z.boolean(),
        notifyDm: z.boolean(),
        notifyChannelId: z.string().trim().max(40).nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const user = await requireUser();
    const supabase = await db();
    const { error } = await supabase.from("bot_settings").upsert(
      {
        user_id: user.uid,
        timezone: data.timezone,
        auto_claim: data.autoClaim,
        notify_dm: data.notifyDm,
        notify_channel_id: data.notifyChannelId || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error("บันทึกการตั้งค่าไม่สำเร็จ");
    return { ok: true };
  });

export const addQuest = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        questName: z.string().trim().min(1).max(120),
        game: z.string().trim().max(80).nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const user = await requireUser();
    const supabase = await db();
    const { error } = await supabase.from("quest_logs").insert({
      user_id: user.uid,
      quest_name: data.questName,
      game: data.game || null,
    });
    if (error) throw new Error("เพิ่มเควสไม่สำเร็จ");
    return { ok: true };
  });

export const updateQuestStatus = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["pending", "running", "done", "failed"]),
        progress: z.number().int().min(0).max(100),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const user = await requireUser();
    const supabase = await db();
    await supabase
      .from("quest_logs")
      .update({ status: data.status, progress: data.progress })
      .eq("id", data.id)
      .eq("user_id", user.uid);
    return { ok: true };
  });

export const deleteQuest = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const user = await requireUser();
    const supabase = await db();
    await supabase.from("quest_logs").delete().eq("id", data.id).eq("user_id", user.uid);
    return { ok: true };
  });
