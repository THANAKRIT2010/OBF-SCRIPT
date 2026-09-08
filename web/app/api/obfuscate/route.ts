import { NextRequest, NextResponse } from "next/server";
// The engine (lib/engine) is a verbatim copy of the vm-obf `src/` compiler —
// see lib/engine/README.txt for how to keep it in sync with the root project.
import { obfuscate } from "@/lib/engine";

export const runtime = "nodejs";

const MAX_SOURCE_BYTES = 1024 * 1024; // 1 MB, matches the standalone /api/obfuscate function
const ALLOWED_LEVELS = [1, 2, 3];

export async function OPTIONS() {
	return new NextResponse(null, {
		status: 204,
		headers: {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "POST, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, Authorization",
		},
	});
}

export async function POST(req: NextRequest) {
	try {
		const body = await req.json().catch(() => ({}));
		const source = typeof body?.code === "string" ? body.code : "";

		if (!source.trim()) {
			return NextResponse.json(
				{ success: false, error: 'Missing Lua source. Send JSON: {"code":"print(\\"Hello\\")"}' },
				{ status: 400 }
			);
		}

		if (Buffer.byteLength(source, "utf8") > MAX_SOURCE_BYTES) {
			return NextResponse.json(
				{ success: false, error: "Lua source is too large. Maximum size is 1 MB." },
				{ status: 413 }
			);
		}

		const requestedLevel = Number(body?.level ?? 2);
		const level = ALLOWED_LEVELS.includes(requestedLevel) ? requestedLevel : 2;

		const opts: Record<string, unknown> = {
			level,
			strings: body?.strings !== false,
			constants: body?.constants !== false,
			antiTamper: body?.antiTamper !== false,
			confusable: body?.confusable !== false,
			opaque: body?.opaque === true,
		};

		if (body?.seed !== undefined && body?.seed !== null && body?.seed !== "") {
			opts.seed = typeof body.seed === "number" ? body.seed : String(body.seed);
		}

		const result = obfuscate(source, opts);

		return NextResponse.json(
			{ success: true, code: result.code, seed: result.seed, config: result.config },
			{ headers: { "Access-Control-Allow-Origin": "*" } }
		);
	} catch (error) {
		console.error(error);
		return NextResponse.json(
			{ success: false, error: error instanceof Error ? error.message : "Obfuscation failed." },
			{ status: 400 }
		);
	}
}
