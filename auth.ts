import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";

/**
 * Comma separated list of Discord user IDs that are allowed to view the
 * admin dashboard at /admin. Set this in your Vercel Environment Variables,
 * e.g. ADMIN_DISCORD_IDS=123456789012345678,987654321098765432
 *
 * To find your own Discord user ID: enable Developer Mode in Discord
 * (Settings -> Advanced -> Developer Mode), then right click your profile
 * and choose "Copy User ID".
 */
export function getAdminDiscordIds(): string[] {
	return (process.env.ADMIN_DISCORD_IDS || "")
		.split(",")
		.map(id => id.trim())
		.filter(Boolean);
}

export const { handlers, signIn, signOut, auth } = NextAuth({
	providers: [
		Discord({
			clientId: process.env.AUTH_DISCORD_ID,
			clientSecret: process.env.AUTH_DISCORD_SECRET,
		}),
	],
	callbacks: {
		async jwt({ token, profile }) {
			// `profile` is only available on the initial sign-in request.
			if (profile) {
				token.discordId = (profile as { id?: string }).id;
				token.username =
					(profile as { username?: string; global_name?: string }).global_name ||
					(profile as { username?: string }).username;
				token.avatar = (profile as { image_url?: string }).image_url;
			}
			return token;
		},
		async session({ session, token }) {
			if (session.user) {
				session.user.id = (token.discordId as string) || "";
				session.user.name = (token.username as string) || session.user.name;
				session.user.isAdmin = getAdminDiscordIds().includes((token.discordId as string) || "");
			}
			return session;
		},
	},
	pages: {
		signIn: "/login",
	},
	trustHost: true,
});
