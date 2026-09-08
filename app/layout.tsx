import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://vm-obf.example.com";

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 5,
	themeColor: "#007AFF",
};

export const metadata: Metadata = {
	metadataBase: new URL(siteUrl),
	title: {
		default: "Flexozy VM — Lua Bytecode Obfuscator",
		template: "%s | Flexozy VM",
	},
	description:
		"Compile your Lua script into a custom bytecode format and ship it inside a generated, single-use virtual machine. No readable Lua survives in the output — just VM instructions. Free, in-browser, no signup.",
	keywords: [
		"lua obfuscator",
		"lua vm obfuscator",
		"lua bytecode obfuscator",
		"lua vm protection",
		"roblox lua obfuscator",
		"fivem lua obfuscator",
		"gmod lua obfuscator",
		"lua script protection",
		"lua anti tamper",
		"virtual machine obfuscation",
	],
	authors: [{ name: "Flexozy" }],
	creator: "Flexozy",
	publisher: "Flexozy",
	formatDetection: { email: false, address: false, telephone: false },
	openGraph: {
		type: "website",
		locale: "en_US",
		url: siteUrl,
		title: "Flexozy VM — Lua Bytecode Obfuscator",
		description:
			"Compile Lua into a custom bytecode format wrapped in a generated virtual machine. Stronger than text-transform obfuscators — there is no original syntax left to read.",
		siteName: "Flexozy VM",
	},
	twitter: {
		card: "summary_large_image",
		title: "Flexozy VM — Lua Bytecode Obfuscator",
		description:
			"Compile Lua into a custom bytecode format wrapped in a generated virtual machine. Free, instant, in-browser.",
	},
	robots: {
		index: true,
		follow: true,
		googleBot: { index: true, follow: true, "max-video-preview": -1, "max-image-preview": "large", "max-snippet": -1 },
	},
	icons: {
		icon: [
			{ url: "/favicon.ico", sizes: "any" },
			{ url: "/icon.png", type: "image/png", sizes: "32x32" },
		],
		apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
	},
	category: "technology",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" className="dark">
			<head>
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{
						__html: JSON.stringify({
							"@context": "https://schema.org",
							"@type": "SoftwareApplication",
							name: "Flexozy VM",
							applicationCategory: "DeveloperApplication",
							operatingSystem: "Any",
							description:
								"Free online Lua VM/bytecode obfuscator. Compiles Lua source into a custom instruction set executed by a generated virtual machine, with optional string encryption, constant encoding, anti-tamper checks, confusable identifiers, and opaque predicates.",
							url: siteUrl,
							offers: { "@type": "Offer", price: "0", priceCurrency: "USD", availability: "https://schema.org/InStock" },
							featureList: [
								"Custom Lua bytecode compiler",
								"Generated single-use virtual machine per build",
								"String encryption",
								"Constant/number encoding",
								"Anti-tamper runtime checks",
								"Confusable (homoglyph) identifiers",
								"Opaque predicates",
								"Deterministic builds via seed",
							],
							softwareVersion: "0.1.0",
							provider: { "@type": "Organization", name: "Flexozy", url: siteUrl },
						}),
					}}
				/>
			</head>
			<body className="dark">{children}</body>
		</html>
	);
}
