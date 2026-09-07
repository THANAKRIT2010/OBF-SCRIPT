import { sql } from "@vercel/postgres";

export interface ObfuscationLogRow {
	id: number;
	discord_id: string;
	username: string;
	avatar_url: string | null;
	input_code: string;
	input_length: number;
	output_length: number;
	options: Record<string, unknown>;
	created_at: string;
}

let tableReady: Promise<void> | null = null;

/**
 * Lazily creates the logs table on first use. Vercel Postgres is serverless
 * so we can't rely on a one-off migration step running before deploy -
 * this keeps setup to "just add the Postgres integration" with no extra CLI step.
 */
function ensureTable(): Promise<void> {
	if (!tableReady) {
		tableReady = sql`
			CREATE TABLE IF NOT EXISTS obfuscation_logs (
				id SERIAL PRIMARY KEY,
				discord_id TEXT NOT NULL,
				username TEXT NOT NULL,
				avatar_url TEXT,
				input_code TEXT NOT NULL,
				input_length INTEGER NOT NULL,
				output_length INTEGER NOT NULL,
				options JSONB NOT NULL DEFAULT '{}'::jsonb,
				created_at TIMESTAMPTZ NOT NULL DEFAULT now()
			);
		`.then(() => undefined);
	}
	return tableReady;
}

export async function insertObfuscationLog(entry: {
	discordId: string;
	username: string;
	avatarUrl: string | null;
	inputCode: string;
	inputLength: number;
	outputLength: number;
	options: Record<string, unknown>;
}): Promise<void> {
	await ensureTable();
	// Cap the stored source at ~200KB so a huge paste can't blow up the row/table.
	const truncatedCode =
		entry.inputCode.length > 200_000 ? entry.inputCode.slice(0, 200_000) + "\n-- (truncated)" : entry.inputCode;

	await sql`
		INSERT INTO obfuscation_logs (discord_id, username, avatar_url, input_code, input_length, output_length, options)
		VALUES (
			${entry.discordId},
			${entry.username},
			${entry.avatarUrl},
			${truncatedCode},
			${entry.inputLength},
			${entry.outputLength},
			${JSON.stringify(entry.options)}::jsonb
		);
	`;
}

export async function getRecentObfuscationLogs(limit = 200): Promise<ObfuscationLogRow[]> {
	await ensureTable();
	const { rows } = await sql<ObfuscationLogRow>`
		SELECT id, discord_id, username, avatar_url, input_code, input_length, output_length, options, created_at
		FROM obfuscation_logs
		ORDER BY created_at DESC
		LIMIT ${limit};
	`;
	return rows;
}
