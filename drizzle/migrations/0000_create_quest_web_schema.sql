CREATE TABLE public.discord_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_id TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  global_name TEXT,
  avatar TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.discord_users TO service_role;
ALTER TABLE public.discord_users ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.bot_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.discord_users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  token TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX bot_tokens_user_id_idx ON public.bot_tokens(user_id);
GRANT ALL ON public.bot_tokens TO service_role;
ALTER TABLE public.bot_tokens ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.quest_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.discord_users(id) ON DELETE CASCADE,
  quest_name TEXT NOT NULL,
  game TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  progress INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX quest_logs_user_id_idx ON public.quest_logs(user_id);
GRANT ALL ON public.quest_logs TO service_role;
ALTER TABLE public.quest_logs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.bot_settings (
  user_id UUID PRIMARY KEY REFERENCES public.discord_users(id) ON DELETE CASCADE,
  timezone TEXT NOT NULL DEFAULT 'Asia/Bangkok',
  auto_claim BOOLEAN NOT NULL DEFAULT true,
  notify_dm BOOLEAN NOT NULL DEFAULT true,
  notify_channel_id TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.bot_settings TO service_role;
ALTER TABLE public.bot_settings ENABLE ROW LEVEL SECURITY;