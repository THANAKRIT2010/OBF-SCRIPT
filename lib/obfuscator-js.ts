import JavaScriptObfuscator from "javascript-obfuscator";

/**
 * JavaScript obfuscation, backed by the battle-tested `javascript-obfuscator`
 * package (AST-based, via Babel) rather than the regex-based approach used
 * for Lua. JS syntax (template literals, destructuring, arrow functions,
 * regex literals, etc.) is far too complex to safely rewrite with text-level
 * regex passes, so we lean on a real parser/transformer here.
 */

export interface JsObfuscationOptions {
	/** 0-100. Drives how many/how aggressive the transformations are. */
	protectionLevel?: number;
}

export interface JsObfuscationResult {
	success: boolean;
	code?: string;
	error?: string;
}

/**
 * Banner injected at the top of every successfully obfuscated file, as a
 * plain block comment so it survives whatever compact/minify settings are
 * used (javascript-obfuscator only strips *existing* comments from the
 * input, it never removes comments it didn't generate, since it doesn't
 * re-parse its own final output).
 */
const JS_PROTECTION_BANNER = `/*
 * Protected by Flexozy
 * https://flexozy.xyz
 */`;

/**
 * Maps the shared 0-100 protection slider onto javascript-obfuscator's
 * option set. Roughly mirrors the Lua protection-level tiers so the same
 * slider "feels" consistent across languages.
 */
function buildObfuscatorOptions(protectionLevel: number) {
	const level = Math.max(0, Math.min(100, protectionLevel));

	return {
		compact: true,
		simplify: true,
		target: "browser" as const,

		identifierNamesGenerator: "hexadecimal" as const,
		renameGlobals: false,

		stringArray: level >= 20,
		stringArrayThreshold: Math.min(1, level / 100),
		stringArrayEncoding: (level >= 80 ? ["rc4"] : level >= 40 ? ["base64"] : []) as ("base64" | "rc4")[],
		// v4 renamed these from rotateStringArray/shuffleStringArray - the old
		// names are silently ignored by the validator, so they were no-ops.
		stringArrayRotate: true,
		stringArrayShuffle: true,
		splitStrings: level >= 60,
		splitStringsChunkLength: 6,

		numbersToExpressions: level >= 50,
		transformObjectKeys: level >= 60,

		controlFlowFlattening: level >= 60,
		controlFlowFlatteningThreshold: level / 100,
		deadCodeInjection: level >= 50,
		deadCodeInjectionThreshold: Math.min(0.4, level / 200),

		disableConsoleOutput: level >= 70,
		debugProtection: level >= 85,
		// v4 also changed this from a boolean/array to a plain number of ms.
		// Passing an array here fails option validation and makes
		// JavaScriptObfuscator.obfuscate() throw on every single call,
		// which is why JS obfuscation never actually worked.
		debugProtectionInterval: level >= 85 ? 4000 : 0,
		selfDefending: level >= 75,

		unicodeEscapeSequence: false,
	};
}

/**
 * Obfuscates JavaScript source code with configurable strength.
 */
export function obfuscateJavaScript(code: string, options: JsObfuscationOptions = {}): JsObfuscationResult {
	const protectionLevel = options.protectionLevel ?? 50;

	if (!code || !code.trim()) {
		return { success: false, error: "No code provided" };
	}

	try {
		const obfuscationResult = JavaScriptObfuscator.obfuscate(code, buildObfuscatorOptions(protectionLevel) as any);

		const obfuscatedCode = obfuscationResult.getObfuscatedCode();

		return {
			success: true,
			code: `${JS_PROTECTION_BANNER}\n\n${obfuscatedCode}`,
		};
	} catch (error: any) {
		return {
			success: false,
			error: error?.message || "JavaScript obfuscation failed",
		};
	}
}
