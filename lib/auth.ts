import { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { prisma } from "./prisma";

const ADMIN_IDS = (process.env.ADMIN_DISCORD_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Discord's /users/@me response includes `avatar_decoration_data` (the
// animated "frame" some users have around their avatar) whenever it's set,
// but nothing in this project ever read it — so the frame silently never
// showed up. This builds its CDN url from the asset hash.
function avatarDecorationUrl(profile: any): string | null {
  const asset = profile?.avatar_decoration_data?.asset;
  if (!asset) return null;
  return `https://cdn.discordapp.com/avatar-decoration-presets/${asset}.png?size=160`;
}

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID as string,
      clientSecret: process.env.DISCORD_CLIENT_SECRET as string,
      authorization: { params: { scope: "identify email" } },
      // Discord's /users/@me response includes banner + accent_color when
      // requested with the "identify" scope, but next-auth's default
      // profile() mapper only pulls avatar. We override it to keep banner too.
      profile(profile) {
        const avatar = profile.avatar
          ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.${
              profile.avatar.startsWith("a_") ? "gif" : "png"
            }?size=256`
          : `https://cdn.discordapp.com/embed/avatars/${
              Number(profile.discriminator ?? "0") % 5
            }.png`;

        const banner = profile.banner
          ? `https://cdn.discordapp.com/banners/${profile.id}/${profile.banner}.${
              profile.banner.startsWith("a_") ? "gif" : "png"
            }?size=600`
          : null;

        return {
          id: profile.id,
          name: profile.username,
          email: profile.email,
          image: avatar,
          discordId: profile.id,
          username: profile.username,
          discriminator: profile.discriminator,
          avatar,
          banner,
          avatarDecoration: avatarDecorationUrl(profile),
        } as any;
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, profile }) {
      if (profile) {
        const p = profile as any;
        const discordId = p.id;
        const avatar = p.avatar
          ? `https://cdn.discordapp.com/avatars/${discordId}/${p.avatar}.${
              String(p.avatar).startsWith("a_") ? "gif" : "png"
            }?size=256`
          : `https://cdn.discordapp.com/embed/avatars/0.png`;
        const banner = p.banner
          ? `https://cdn.discordapp.com/banners/${discordId}/${p.banner}.${
              String(p.banner).startsWith("a_") ? "gif" : "png"
            }?size=600`
          : null;

        const isAdmin = ADMIN_IDS.includes(discordId);
        const avatarDecoration = avatarDecorationUrl(p);

        const user = await prisma.user.upsert({
          where: { discordId },
          update: { username: p.username, avatar, banner, avatarDecoration, email: p.email, isAdmin },
          create: {
            discordId,
            username: p.username,
            discriminator: p.discriminator,
            avatar,
            banner,
            avatarDecoration,
            email: p.email,
            isAdmin,
          },
        });

        token.uid = user.id;
        token.discordId = discordId;
        token.username = p.username;
        token.avatar = avatar;
        token.banner = banner;
        token.avatarDecoration = avatarDecoration;
        token.isAdmin = isAdmin;
      }
      return token;
    },
    async session({ session, token }) {
      (session.user as any).id = token.uid;
      (session.user as any).discordId = token.discordId;
      (session.user as any).username = token.username;
      (session.user as any).avatar = token.avatar;
      (session.user as any).banner = token.banner;
      (session.user as any).avatarDecoration = token.avatarDecoration;
      (session.user as any).isAdmin = token.isAdmin;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
