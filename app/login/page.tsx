import { signIn, auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function LoginPage({
	searchParams,
}: {
	searchParams: Promise<{ callbackUrl?: string }>;
}) {
	const session = await auth();
	const { callbackUrl } = await searchParams;

	if (session) {
		redirect(callbackUrl || "/");
	}

	return (
		<main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
			<div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 text-center shadow-2xl">
				<h1 className="text-2xl font-bold text-white mb-2">Bill&apos;s Lua Obfuscator</h1>
				<p className="text-sm text-gray-300 mb-8">
					กรุณาเข้าสู่ระบบด้วย Discord เพื่อใช้งานเครื่องมือนี้
					<br />
					<span className="text-gray-400">Please sign in with Discord to continue</span>
				</p>
				<form
					action={async () => {
						"use server";
						await signIn("discord", { redirectTo: callbackUrl || "/" });
					}}
				>
					<button
						type="submit"
						className="w-full flex items-center justify-center gap-3 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] transition-colors text-white font-semibold py-3 px-4 shadow-lg"
					>
						<svg viewBox="0 0 127.14 96.36" className="w-5 h-5 fill-current" aria-hidden="true">
							<path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z" />
						</svg>
						เข้าสู่ระบบด้วย Discord
					</button>
				</form>
			</div>
		</main>
	);
}
