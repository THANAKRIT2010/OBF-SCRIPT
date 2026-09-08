/**
 * Safe-injection-point detection for text/line-based obfuscation passes.
 *
 * Both dead-code injection and anti-debug injection work by splicing new
 * statement text in between existing lines. Naively doing this after *any*
 * line is unsafe: if that line happens to be inside a multi-line string
 * (`[[...]]` / `[=[...]=]`), a multi-line comment, or in the middle of an
 * unfinished table constructor / function call / expression that continues
 * on the next line, splicing a full statement there produces invalid Lua.
 *
 * This scans the whole source once and returns, for each line index,
 * whether it is safe to insert a brand new top-level statement immediately
 * after that line (i.e. we are at bracket-depth 0, not inside a string or
 * comment, and the line does not look like it continues onto the next one).
 */

const CONTINUATION_ENDINGS = [
	",",
	"+",
	"-",
	"*",
	"/",
	"%",
	"^",
	"=",
	"(",
	"{",
	"[",
	"<",
	">",
	"~",
	"..",
];

const CONTINUATION_WORD_ENDINGS = ["and", "or", "not", "then", "do", "else", "elseif", "return", "local", "function", "in"];

function endsWithContinuation(trimmedLine: string): boolean {
	if (trimmedLine === "") return false;
	for (const suffix of CONTINUATION_ENDINGS) {
		if (trimmedLine.endsWith(suffix)) return true;
	}
	for (const word of CONTINUATION_WORD_ENDINGS) {
		const re = new RegExp(`(?:^|[^a-zA-Z0-9_])${word}$`);
		if (re.test(trimmedLine)) return true;
	}
	return false;
}

/**
 * Returns a boolean array, one entry per line of `code`, where `true` means
 * "safe to append a new standalone statement immediately after this line".
 */
export function computeSafeLineInjectionPoints(code: string): boolean[] {
	const lines = code.split("\n");
	const safe: boolean[] = new Array(lines.length).fill(false);

	let depth = 0; // net (), {}, [] depth outside of strings/comments
	let inLongBracket = false; // inside [[ ]] or [=[ ]=] (string or comment)
	let longBracketEq = -1;
	let inLineString = false;
	let lineStringChar = "";

	for (let li = 0; li < lines.length; li++) {
		const line = lines[li];
		let i = 0;

		while (i < line.length) {
			const ch = line[i];
			const next = line[i + 1];

			if (inLongBracket) {
				// Look for closing ]]  or  ]=...=]
				if (ch === "]") {
					let j = i + 1;
					let eq = 0;
					while (line[j] === "=") {
						eq++;
						j++;
					}
					if (line[j] === "]" && eq === longBracketEq) {
						inLongBracket = false;
						longBracketEq = -1;
						i = j + 1;
						continue;
					}
				}
				i++;
				continue;
			}

			if (inLineString) {
				if (ch === "\\") {
					i += 2;
					continue;
				}
				if (ch === lineStringChar) {
					inLineString = false;
					lineStringChar = "";
				}
				i++;
				continue;
			}

			// Not in a string/long-bracket right now.
			if (ch === "-" && next === "-") {
				// Comment start: check for long-bracket comment --[[ or --[=[
				let j = i + 2;
				if (line[j] === "[") {
					let eq = 0;
					let k = j + 1;
					while (line[k] === "=") {
						eq++;
						k++;
					}
					if (line[k] === "[") {
						inLongBracket = true;
						longBracketEq = eq;
						i = k + 1;
						continue;
					}
				}
				// Single-line comment: rest of line is a comment.
				break;
			}

			if (ch === '"' || ch === "'") {
				inLineString = true;
				lineStringChar = ch;
				i++;
				continue;
			}

			if (ch === "[") {
				// Could be a long-bracket string [[ or [=[, or just an index bracket.
				let eq = 0;
				let k = i + 1;
				while (line[k] === "=") {
					eq++;
					k++;
				}
				if (line[k] === "[") {
					inLongBracket = true;
					longBracketEq = eq;
					i = k + 1;
					continue;
				}
				depth++;
				i++;
				continue;
			}

			if (ch === "(" || ch === "{") {
				depth++;
				i++;
				continue;
			}
			if (ch === ")" || ch === "}" || ch === "]") {
				depth = Math.max(0, depth - 1);
				i++;
				continue;
			}

			i++;
		}

		const trimmed = line.trim();
		const safeHere =
			!inLongBracket &&
			!inLineString &&
			depth === 0 &&
			trimmed !== "" &&
			!trimmed.startsWith("--") &&
			!endsWithContinuation(trimmed);

		safe[li] = safeHere;
	}

	return safe;
}
