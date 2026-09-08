"use client";

import React, { useState } from "react";
import {
	Copy,
	Download,
	Settings,
	Shuffle,
	CheckCircle,
	AlertCircle,
	Zap,
	Shield,
	Sparkles,
	Cpu,
	Lock,
	Fingerprint,
	Dices,
	RotateCcw,
	Github,
} from "lucide-react";

import { CodeEditor } from "@/components/CodeEditor";
import { BackgroundGradientAnimation } from "@/components/BackgroundGradient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ParseError } from "@/lib/parser";

const DEFAULT_LUA_CODE = `-- Advanced Game Inventory System
-- Showcases: Tables, Metatables, Closures, Error Handling

local Inventory = {}
Inventory.__index = Inventory

function Inventory.new(maxSlots, playerName)
	local self = setmetatable({}, Inventory)
	self.items = {}
	self.maxSlots = maxSlots or 20
	self.playerName = playerName or "Player"
	self.gold = 0
	return self
end

function Inventory:addItem(itemName, quantity, rarity)
	local slot = #self.items + 1
	if slot > self.maxSlots then
		return false, "Inventory full"
	end

	local multiplier = 1.0
	if rarity == "rare" then
		multiplier = 1.5
	elseif rarity == "epic" then
		multiplier = 2.0
	elseif rarity == "legendary" then
		multiplier = 3.0
	end

	local item = {
		name = itemName,
		qty = quantity or 1,
		rarity = rarity or "common",
		value = math.floor((quantity or 1) * 10 * multiplier),
	}

	table.insert(self.items, item)
	return true, "Added " .. itemName
end

function Inventory:getTotalValue()
	local total = self.gold
	for i = 1, #self.items do
		total = total + self.items[i].value
	end
	return total
end

local inv = Inventory.new(25, "Hero")
inv:addItem("Health Potion", 5, "common")
inv:addItem("Dragon Scale", 1, "legendary")

print("Inventory value: " .. inv:getTotalValue() .. " gold")
`;

type Level = 1 | 2 | 3;

interface EngineSettings {
	level: Level;
	strings: boolean;
	constants: boolean;
	antiTamper: boolean;
	confusable: boolean;
	opaque: boolean;
	seed: string;
}

interface ApiResult {
	success: boolean;
	code?: string;
	seed?: number;
	config?: Record<string, boolean>;
	error?: string;
}

function levelDefaults(level: Level): Omit<EngineSettings, "level" | "seed" | "strings"> {
	if (level === 1) return { constants: false, antiTamper: false, confusable: false, opaque: false };
	if (level === 3) return { constants: true, antiTamper: true, confusable: true, opaque: true };
	return { constants: true, antiTamper: true, confusable: true, opaque: false };
}

const LEVEL_LABEL: Record<Level, string> = { 1: "Basic", 2: "Standard", 3: "Maximum" };
const LEVEL_DESC: Record<Level, string> = {
	1: "Bytecode compile only. Fast output, lightest runtime overhead.",
	2: "Adds constant encoding, anti-tamper checks, and confusable identifiers.",
	3: "Everything in Standard, plus opaque predicates for maximum analysis resistance.",
};

export default function Home() {
	const [inputCode, setInputCode] = useState(DEFAULT_LUA_CODE);
	const [outputCode, setOutputCode] = useState("");
	const [isProcessing, setIsProcessing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [inputError, setInputError] = useState<ParseError | undefined>(undefined);
	const [copySuccess, setCopySuccess] = useState(false);
	const [resultSeed, setResultSeed] = useState<number | null>(null);
	const [resultConfig, setResultConfig] = useState<Record<string, boolean> | null>(null);
	const [showSuccess, setShowSuccess] = useState(false);

	const [settings, setSettings] = useState<EngineSettings>({
		level: 2,
		strings: true,
		constants: true,
		antiTamper: true,
		confusable: true,
		opaque: false,
		seed: "",
	});

	const applyLevel = (level: Level) => {
		setSettings(prev => ({ ...prev, level, ...levelDefaults(level) }));
	};

	const toggle = (key: keyof Omit<EngineSettings, "level" | "seed">) => {
		setSettings(prev => ({ ...prev, [key]: !prev[key] }));
	};

	const randomizeSeed = () => {
		setSettings(prev => ({ ...prev, seed: String(Math.floor(Math.random() * 4294967295)) }));
	};

	const obfuscateCode = async () => {
		setIsProcessing(true);
		setError(null);
		setInputError(undefined);
		setCopySuccess(false);
		setResultConfig(null);
		setResultSeed(null);

		try {
			const res = await fetch("/api/obfuscate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					code: inputCode,
					level: settings.level,
					strings: settings.strings,
					constants: settings.constants,
					antiTamper: settings.antiTamper,
					confusable: settings.confusable,
					opaque: settings.opaque,
					seed: settings.seed || undefined,
				}),
			});

			const result: ApiResult = await res.json();

			if (result.success && result.code) {
				setOutputCode(result.code);
				setResultSeed(result.seed ?? null);
				setResultConfig(result.config ?? null);
				setShowSuccess(true);
				setTimeout(() => setShowSuccess(false), 1500);
			} else {
				setError(result.error || "Failed to obfuscate code");
				setOutputCode("");

				// The VM compiler surfaces Lua parse errors as "Line N: message" style text —
				// try to pull a line number out so the editor can point at it.
				const match = /line[:\s]+(\d+)/i.exec(result.error || "");
				if (match) {
					setInputError({ message: result.error || "Parse error", line: Number(match[1]) });
				}
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Network error while contacting the obfuscator API");
			setOutputCode("");
		} finally {
			setIsProcessing(false);
		}
	};

	const copyToClipboard = async () => {
		try {
			await navigator.clipboard.writeText(outputCode);
			setCopySuccess(true);
			setTimeout(() => setCopySuccess(false), 2000);
		} catch {
			setError("Failed to copy to clipboard");
		}
	};

	const downloadCode = () => {
		const blob = new Blob([outputCode], { type: "text/plain" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "obfuscated.lua";
		a.click();
		URL.revokeObjectURL(url);
	};

	const resetAll = () => {
		setInputCode(DEFAULT_LUA_CODE);
		setOutputCode("");
		setError(null);
		setInputError(undefined);
		setResultSeed(null);
		setResultConfig(null);
	};

	const handleInputChange = (value: string) => {
		setInputCode(value);
		if (inputError) setInputError(undefined);
	};

	const sizeRatio = outputCode && inputCode ? (outputCode.length / inputCode.length).toFixed(1) : null;

	return (
		<BackgroundGradientAnimation containerClassName="min-h-screen h-auto w-full" interactive={false}>
			<div className="relative z-10 min-h-screen w-full overflow-y-auto">
				{/* Header */}
				<header className="border-b border-white/10 backdrop-blur-xl bg-black/20 sticky top-0 z-20">
					<div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
								<Cpu className="w-5 h-5 text-white" />
							</div>
							<div>
								<p className="text-white font-bold leading-none tracking-tight">Flexozy VM</p>
								<p className="text-[11px] text-gray-400 font-medium leading-none mt-1">Lua Bytecode Obfuscator</p>
							</div>
						</div>
						<a
							href="https://github.com"
							target="_blank"
							rel="noreferrer"
							className="hidden sm:flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors"
						>
							<Github className="w-4 h-4" />
							<span>Source</span>
						</a>
					</div>
				</header>

				{/* Hero */}
				<section className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-8 text-center">
					<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-blue-300 mb-5">
						<Sparkles className="w-3.5 h-3.5" />
						Custom VM &amp; bytecode engine — not a text transform
					</div>
					<h1 className="text-3xl sm:text-5xl font-bold text-white tracking-tight text-balance">
						Compile your Lua into a <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">virtual machine</span>
					</h1>
					<p className="mt-4 text-gray-400 max-w-2xl mx-auto text-sm sm:text-base">
						Every build compiles your script to a custom instruction set and pairs it with a freshly generated
						interpreter. There&apos;s no original Lua syntax left to read — only VM opcodes, encoded constants, and
						(optionally) anti-tamper checks.
					</p>
				</section>

				{/* Main workspace */}
				<section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16 grid grid-cols-1 xl:grid-cols-[1fr_1fr_320px] gap-4">
					{/* Input */}
					<Card className="bg-white/[0.03] border-white/10 backdrop-blur-xl overflow-hidden p-0 gap-0">
						<div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
							<div className="flex items-center gap-2">
								<div className="w-2 h-2 rounded-full bg-red-400/80" />
								<div className="w-2 h-2 rounded-full bg-yellow-400/80" />
								<div className="w-2 h-2 rounded-full bg-green-400/80" />
								<span className="ml-2 text-xs font-medium text-gray-400">source.lua</span>
							</div>
							<button
								onClick={resetAll}
								className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors"
							>
								<RotateCcw className="w-3 h-3" /> Reset
							</button>
						</div>
						<div className="h-[420px] xl:h-[520px]">
							<CodeEditor value={inputCode} onChange={handleInputChange} language="lua" error={inputError} />
						</div>
					</Card>

					{/* Output */}
					<Card className="bg-white/[0.03] border-white/10 backdrop-blur-xl overflow-hidden p-0 gap-0 relative">
						<div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
							<span className="text-xs font-medium text-gray-400">obfuscated.lua</span>
							<div className="flex items-center gap-1">
								<Button
									variant="ghost"
									size="sm"
									onClick={copyToClipboard}
									disabled={!outputCode}
									aria-label={copySuccess ? "Copied to clipboard" : "Copy obfuscated code to clipboard"}
									className="h-7 px-2 text-gray-400 hover:text-white"
								>
									{copySuccess ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
								</Button>
								<Button
									variant="ghost"
									size="sm"
									onClick={downloadCode}
									disabled={!outputCode}
									aria-label="Download obfuscated code as .lua file"
									className="h-7 px-2 text-gray-400 hover:text-white"
								>
									<Download className="w-3.5 h-3.5" />
								</Button>
							</div>
						</div>
						<div className="h-[420px] xl:h-[520px]">
							{outputCode ? (
								<CodeEditor value={outputCode} language="lua" readOnly height="100%" />
							) : (
								<div className="flex flex-col items-center justify-center h-full text-center px-6">
									<div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3">
										<Shield className="w-6 h-6 text-gray-500" />
									</div>
									<p className="text-sm text-gray-500 font-medium">Ready for obfuscation</p>
									<p className="text-xs text-gray-600 mt-1">Your compiled VM output will appear here</p>
								</div>
							)}
						</div>
						{showSuccess && (
							<div className="absolute top-14 right-4 flex items-center gap-2 bg-green-500/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg animate-in fade-in slide-in-from-top-2">
								<CheckCircle className="w-4 h-4 text-white" />
								<p className="text-white font-bold text-sm">Build complete</p>
							</div>
						)}
					</Card>

					{/* Settings */}
					<Card className="bg-white/[0.03] border-white/10 backdrop-blur-xl p-5 gap-5 h-fit xl:sticky xl:top-24">
						<div className="flex items-center gap-2">
							<Settings className="w-4 h-4 text-blue-400" />
							<h2 className="text-sm font-bold text-white">Build settings</h2>
						</div>

						<div className="space-y-2">
							<Label className="text-xs text-gray-400">Protection level</Label>
							<Select value={String(settings.level)} onValueChange={v => applyLevel(Number(v) as Level)}>
								<SelectTrigger className="w-full bg-white/5 border-white/10 text-white">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{([1, 2, 3] as Level[]).map(lvl => (
										<SelectItem key={lvl} value={String(lvl)}>
											{LEVEL_LABEL[lvl]}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<p className="text-[11px] text-gray-500 leading-relaxed">{LEVEL_DESC[settings.level]}</p>
						</div>

						<div className="h-px bg-white/10" />

						<div className="space-y-4">
							<SettingRow
								icon={<Lock className="w-3.5 h-3.5" />}
								label="String encryption"
								description="Encode every string literal instead of storing it as plain text."
								checked={settings.strings}
								onChange={() => toggle("strings")}
							/>
							<SettingRow
								icon={<Zap className="w-3.5 h-3.5" />}
								label="Constant encoding"
								description="Rewrite numeric constants as small expressions."
								checked={settings.constants}
								onChange={() => toggle("constants")}
							/>
							<SettingRow
								icon={<Shield className="w-3.5 h-3.5" />}
								label="Anti-tamper checks"
								description="Embed runtime integrity checks that misbehave if the VM is patched."
								checked={settings.antiTamper}
								onChange={() => toggle("antiTamper")}
							/>
							<SettingRow
								icon={<Fingerprint className="w-3.5 h-3.5" />}
								label="Confusable identifiers"
								description="Use visually ambiguous Unicode identifiers in the generated VM."
								checked={settings.confusable}
								onChange={() => toggle("confusable")}
							/>
							<SettingRow
								icon={<Sparkles className="w-3.5 h-3.5" />}
								label="Opaque predicates"
								description="Insert always-true/false branches to mislead static analysis."
								checked={settings.opaque}
								onChange={() => toggle("opaque")}
							/>
						</div>

						<div className="h-px bg-white/10" />

						<div className="space-y-2">
							<Label className="text-xs text-gray-400">Seed (optional)</Label>
							<div className="flex gap-2">
								<input
									value={settings.seed}
									onChange={e => setSettings(prev => ({ ...prev, seed: e.target.value }))}
									placeholder="random"
									className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-white placeholder:text-gray-600 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring"
								/>
								<Button
									type="button"
									variant="outline"
									size="icon"
									onClick={randomizeSeed}
									className="bg-white/5 border-white/10 text-gray-300 hover:text-white shrink-0"
									aria-label="Randomize seed"
								>
									<Dices className="w-4 h-4" />
								</Button>
							</div>
							<p className="text-[11px] text-gray-500">Same seed + same settings = byte-identical build.</p>
						</div>

						<Button
							onClick={obfuscateCode}
							disabled={isProcessing || !inputCode.trim()}
							aria-label="Obfuscate Lua code"
							className="w-full h-11 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 text-white font-semibold shadow-lg shadow-blue-500/20"
						>
							<span className="relative z-10 flex items-center gap-2">
								<Shuffle className={cn("w-4 h-4", isProcessing && "animate-spin")} />
								{isProcessing ? "Compiling…" : "Obfuscate"}
							</span>
						</Button>

						{(resultSeed !== null || resultConfig) && (
							<div className="rounded-lg bg-white/5 border border-white/10 p-3 space-y-2">
								<p className="text-xs font-semibold text-gray-300">Last build</p>
								<div className="flex flex-wrap gap-1.5 text-[11px]">
									{resultSeed !== null && (
										<span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
											seed {resultSeed}
										</span>
									)}
									{sizeRatio && (
										<span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
											{sizeRatio}× size
										</span>
									)}
									{resultConfig &&
										Object.entries(resultConfig)
											.filter(([, v]) => v === true)
											.map(([k]) => (
												<span key={k} className="px-2 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/10">
													{k}
												</span>
											))}
								</div>
							</div>
						)}
					</Card>
				</section>

				{/* Error banner */}
				{error && (
					<section className="max-w-7xl mx-auto px-4 sm:px-6 -mt-10 pb-10">
						<div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
							<AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
							<div>
								<p className="text-sm font-semibold text-red-300">Obfuscation error</p>
								<p className="text-sm text-red-400/90 mt-0.5 break-words">{error}</p>
							</div>
						</div>
					</section>
				)}

				{/* Why a VM approach */}
				<section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 border-t border-white/10">
					<h2 className="text-2xl font-bold text-white text-center mb-2">Why bytecode + a VM instead of text tricks</h2>
					<p className="text-gray-400 text-center max-w-2xl mx-auto text-sm mb-10">
						Most Lua &quot;obfuscators&quot; just rename variables and mangle strings — the control flow and logic are
						still plainly visible. This engine compiles your script away entirely.
					</p>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<FeatureCard
							icon={<Cpu className="w-5 h-5" />}
							title="Custom instruction set"
							body="Your Lua chunk is compiled to a private opcode format, unique to this engine — not standard Lua bytecode."
						/>
						<FeatureCard
							icon={<Shield className="w-5 h-5" />}
							title="No leftover syntax"
							body="The shipped file is a generated interpreter plus a data blob. There are no original function or variable names left to read."
						/>
						<FeatureCard
							icon={<Lock className="w-5 h-5" />}
							title="Encrypted strings & constants"
							body="String and number literals are encoded, not just concatenated or reordered."
						/>
						<FeatureCard
							icon={<Fingerprint className="w-5 h-5" />}
							title="Per-build randomization"
							body="Opcode assignment, identifiers, and layout are re-randomized (or seeded) on every build, so two builds never look alike."
						/>
						<FeatureCard
							icon={<AlertCircle className="w-5 h-5" />}
							title="Anti-tamper checks"
							body="Optional runtime integrity checks make the VM misbehave if someone patches the generated interpreter."
						/>
						<FeatureCard
							icon={<Sparkles className="w-5 h-5" />}
							title="Opaque predicates"
							body="Always-true/false branches are woven in at maximum protection to slow down static analysis tools."
						/>
					</div>
				</section>

				{/* How it works */}
				<section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 border-t border-white/10">
					<h2 className="text-2xl font-bold text-white text-center mb-10">How it works</h2>
					<div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
						{[
							{ n: "01", t: "Parse", d: "Your Lua source is parsed into an AST." },
							{ n: "02", t: "Compile", d: "The AST is compiled to custom VM bytecode." },
							{ n: "03", t: "Encode", d: "Strings, constants, and opcodes are encoded per your settings." },
							{ n: "04", t: "Generate", d: "A fresh interpreter is generated to run that exact bytecode." },
						].map(step => (
							<div key={step.n} className="rounded-xl bg-white/[0.03] border border-white/10 p-4">
								<p className="text-xs font-mono text-blue-400 mb-2">{step.n}</p>
								<p className="text-sm font-semibold text-white mb-1">{step.t}</p>
								<p className="text-xs text-gray-500 leading-relaxed">{step.d}</p>
							</div>
						))}
					</div>
				</section>

				{/* FAQ */}
				<section className="max-w-4xl mx-auto px-4 sm:px-6 py-16 border-t border-white/10">
					<h2 className="text-2xl font-bold text-white text-center mb-8">FAQ</h2>
					<div className="space-y-3">
						<FaqItem
							q="Will the obfuscated file behave exactly like my original script?"
							a="Yes. The VM executes the exact logic your original chunk described — obfuscation only changes how that logic is represented on disk, not what it does. Always test the output before shipping it."
						/>
						<FaqItem
							q="Which Lua version is supported?"
							a="Input is parsed as Lua 5.1 syntax, which is what Roblox, FiveM, Garry's Mod, and most game-modding runtimes use."
						/>
						<FaqItem
							q="Does my code leave my browser?"
							a="The source is sent to a serverless function to be compiled, and is not stored — nothing is written to a database or logged."
						/>
						<FaqItem
							q="What does the seed field do?"
							a="Leave it blank for a fresh random build every time. Set it to any value to get a byte-identical, reproducible build across runs."
						/>
						<FaqItem
							q="Can this be reversed?"
							a="No obfuscation is unbreakable, but compiling to a private bytecode format wrapped in a generated interpreter is significantly harder to reverse than renaming variables or encoding strings alone, since there's no original control flow left in the file."
						/>
					</div>
				</section>

				{/* Footer */}
				<footer className="border-t border-white/10 py-8">
					<div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
						<p>Flexozy VM — built on the lua-vm-obfuscator engine.</p>
						<p>Free to use. No signup required.</p>
					</div>
				</footer>
			</div>
		</BackgroundGradientAnimation>
	);
}

function SettingRow({
	icon,
	label,
	description,
	checked,
	onChange,
}: {
	icon: React.ReactNode;
	label: string;
	description: string;
	checked: boolean;
	onChange: () => void;
}) {
	return (
		<div className="flex items-start justify-between gap-3">
			<div className="flex items-start gap-2.5">
				<div className="mt-0.5 text-gray-400">{icon}</div>
				<div>
					<Label className="text-sm text-white font-medium">{label}</Label>
					<p className="text-[11px] text-gray-500 leading-relaxed mt-0.5">{description}</p>
				</div>
			</div>
			<Switch checked={checked} onCheckedChange={onChange} className="mt-0.5 shrink-0" />
		</div>
	);
}

function FeatureCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
	return (
		<div className="rounded-xl bg-white/[0.03] border border-white/10 p-5 hover:bg-white/[0.05] transition-colors">
			<div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-blue-300 mb-3">
				{icon}
			</div>
			<p className="text-sm font-semibold text-white mb-1">{title}</p>
			<p className="text-xs text-gray-500 leading-relaxed">{body}</p>
		</div>
	);
}

function FaqItem({ q, a }: { q: string; a: string }) {
	return (
		<details className="group rounded-xl bg-white/[0.03] border border-white/10 p-4 open:bg-white/[0.05] transition-colors">
			<summary className="cursor-pointer text-sm font-semibold text-white list-none flex items-center justify-between">
				{q}
				<span className="text-gray-500 group-open:rotate-45 transition-transform text-lg leading-none">+</span>
			</summary>
			<p className="text-xs text-gray-500 leading-relaxed mt-3">{a}</p>
		</details>
	);
}
