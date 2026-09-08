/**
 * Minimal shared types for inline editor error markers.
 * The actual Lua parsing/validation happens server-side inside the VM
 * obfuscator engine (see lib/engine) — this file just carries the shape
 * of a parse error so the Monaco editor can render a red squiggle.
 */
export interface ParseError {
	message: string;
	line?: number;
	column?: number;
}
