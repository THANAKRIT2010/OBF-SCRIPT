export function BrandMark({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`flex items-center justify-center rounded-xl bg-brand text-primary-foreground shadow-soft ${
          size === "lg" ? "h-11 w-11" : "h-9 w-9"
        }`}
      >
        <svg viewBox="0 0 24 24" className={size === "lg" ? "h-6 w-6" : "h-5 w-5"} fill="none">
          <path
            d="M7 4h10l-1.6 5H19l-9 11 2-7.5H6.5L7 4z"
            fill="currentColor"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="leading-tight">
        <p className={`font-extrabold tracking-tight ${size === "lg" ? "text-xl" : "text-base"}`}>
          Flexozy
        </p>
        <p className="text-[11px] font-medium text-muted-foreground">Discord Bot Hosting</p>
      </div>
    </div>
  );
}
