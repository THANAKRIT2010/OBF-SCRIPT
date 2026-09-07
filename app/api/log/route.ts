import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { insertObfuscationLog } from "@/lib/db";

export async function POST(req: NextRequest) {
	const session = await auth();
	if (!session?.user?.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	let body: { inputCode?: string; outputLength?: number; options?: Record<string, unknown> };
	try {
		body = await req.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}

	const inputCode = typeof body.inputCode === "string" ? body.inputCode : "";
	const outputLength = typeof body.outputLength === "number" ? body.outputLength : 0;
	const options = body.options && typeof body.options === "object" ? body.options : {};

	try {
		await insertObfuscationLog({
			discordId: session.user.id,
			username: session.user.name || "unknown",
			avatarUrl: session.user.image || null,
			inputCode,
			inputLength: inputCode.length,
			outputLength,
			options,
		});
	} catch (err) {
		console.error("Failed to write obfuscation log:", err);
		return NextResponse.json({ error: "Failed to log" }, { status: 500 });
	}

	return NextResponse.json({ ok: true });
}
