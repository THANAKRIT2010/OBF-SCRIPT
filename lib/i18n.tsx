"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

export type Locale = "en" | "th";

export const translations = {
	en: {
		appName: "Flexozy",
		tagline: "Professional code protection & security",
		copy: "Copy",
		copied: "Copied!",
		download: "Download",
		obfuscate: "Obfuscate",
		processing: "Processing...",
		obfuscationComplete: "Obfuscation Complete!",
		codeProtected: "Your code is now protected",
		originalCode: "Original Lua Code",
		readyForObfuscation: "Ready for obfuscation",
		obfuscatedOutput: "Obfuscated Output",
		protectedAndSecured: "Protected & secured",
		active: "Active",
		settings: "Settings",
		protectionLevel: "Protection Level",
		mangleNames: "Mangle Names",
		encodeStrings: "Encode Strings",
		encodeNumbers: "Encode Numbers",
		controlFlow: "Control Flow",
		minify: "Minify",
		signedInAs: "Signed in as",
		signOut: "Sign out",
		admin: "Admin",
		language: "Language",
	},
	th: {
		appName: "บิล ลัว ออบฟัสเคเตอร์",
		tagline: "เครื่องมือปกป้องและรักษาความปลอดภัยโค้ดระดับมืออาชีพ",
		copy: "คัดลอก",
		copied: "คัดลอกแล้ว!",
		download: "ดาวน์โหลด",
		obfuscate: "แปลงโค้ด",
		processing: "กำลังประมวลผล...",
		obfuscationComplete: "แปลงโค้ดสำเร็จแล้ว!",
		codeProtected: "โค้ดของคุณได้รับการปกป้องแล้ว",
		originalCode: "โค้ด Lua ต้นฉบับ",
		readyForObfuscation: "พร้อมสำหรับการแปลงโค้ด",
		obfuscatedOutput: "ผลลัพธ์ที่แปลงแล้ว",
		protectedAndSecured: "ปลอดภัยและได้รับการป้องกัน",
		active: "ใช้งานอยู่",
		settings: "ตั้งค่า",
		protectionLevel: "ระดับการป้องกัน",
		mangleNames: "สลับชื่อตัวแปร",
		encodeStrings: "เข้ารหัสข้อความ",
		encodeNumbers: "เข้ารหัสตัวเลข",
		controlFlow: "ซับซ้อนลำดับการทำงาน",
		minify: "ย่อขนาดโค้ด",
		signedInAs: "เข้าสู่ระบบในชื่อ",
		signOut: "ออกจากระบบ",
		admin: "หลังบ้าน",
		language: "ภาษา",
	},
} as const;

export type TranslationKey = keyof (typeof translations)["en"];

interface LanguageContextValue {
	locale: Locale;
	setLocale: (locale: Locale) => void;
	t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const STORAGE_KEY = "lua-obfuscator-locale";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
	const [locale, setLocaleState] = useState<Locale>("th");

	useEffect(() => {
		const stored = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
		if (stored === "en" || stored === "th") {
			setLocaleState(stored);
		}
	}, []);

	const setLocale = useCallback((next: Locale) => {
		setLocaleState(next);
		window.localStorage.setItem(STORAGE_KEY, next);
	}, []);

	const t = useCallback((key: TranslationKey) => translations[locale][key], [locale]);

	return <LanguageContext.Provider value={{ locale, setLocale, t }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
	const ctx = useContext(LanguageContext);
	if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
	return ctx;
}
