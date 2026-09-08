import { NextResponse } from "next/server";

export async function GET() {
	return NextResponse.json({
		success: true,
		service: "Flexozy Lua Obfuscator API",
		endpoint: "POST /api/obfuscate",
		version: "0.1.0",
	});
}
