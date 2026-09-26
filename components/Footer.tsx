import Link from "next/link";

export default function Footer() {
  return (
    <footer className="glass-card rounded-xl mt-8 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 px-4 py-4">
        <Link href="/" className="flex items-center gap-2">
          <p className="font-semibold text-lg">
            Flex<span className="accent-text">ozy</span>
          </p>
        </Link>
        <div className="flex gap-3">
          <a
            href="https://discord.gg/afUkge8rJe"
            target="_blank"
            rel="noreferrer"
            aria-label="Discord"
            className="size-8 flex items-center justify-center rounded-full text-white/70 hover:text-[#5865f2] hover:bg-white/5 hover:scale-110 transition-all duration-200"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.1.1 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.1 16.1 0 0 0-4.8 0c-.14-.34-.35-.76-.54-1.09c-.01-.02-.04-.03-.07-.03c-1.5.26-2.93.71-4.27 1.33c-.01 0-.02.01-.03.02c-2.72 4.07-3.47 8.03-3.1 11.95c0 .02.01.04.03.05c1.8 1.32 3.53 2.12 5.24 2.65c.03.01.06 0 .07-.02c.4-.55.76-1.13 1.07-1.74c.02-.04 0-.08-.04-.09c-.57-.22-1.11-.48-1.64-.78c-.04-.02-.04-.08-.01-.11c.11-.08.22-.17.33-.25c.02-.02.05-.02.07-.01c3.44 1.57 7.15 1.57 10.55 0c.02-.01.05-.01.07.01c.11.09.22.17.33.26c.04.03.04.09-.01.11c-.52.31-1.07.56-1.64.78c-.04.01-.05.06-.04.09c.32.61.68 1.19 1.07 1.74c.03.01.06.02.09.01c1.72-.53 3.45-1.33 5.25-2.65c.02-.01.03-.03.03-.05c.44-4.53-.73-8.46-3.1-11.95c-.01-.01-.02-.02-.04-.02M8.52 14.91c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.84 2.12-1.89 2.12m6.97 0c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.83 2.12-1.89 2.12" />
            </svg>
          </a>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-4 bg-black/20">
        <p className="text-sm text-white/60">
          © {new Date().getFullYear()} Flexozy. All rights reserved.
        </p>
        <p className="text-xs text-white/40">
          สคริปต์ โปรแกรม และคีย์ลิขสิทธิ์ — ส่งมอบอัตโนมัติทันทีหลังชำระเงิน
        </p>
      </div>
    </footer>
  );
}
