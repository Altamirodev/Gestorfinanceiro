type Tone = "default" | "critical" | "warning" | "good";

const toneClass: Record<Tone, string> = {
  default: "",
  critical: "border-critical/40 bg-critical-bg",
  warning: "border-warning/40 bg-warning-bg",
  good: "border-good/40 bg-good-bg",
};
const toneInk: Record<Tone, string> = {
  default: "text-ink-2",
  critical: "text-critical",
  warning: "text-warning",
  good: "text-good",
};
const icon: Record<Tone, string> = { default: "", critical: "⚠", warning: "◷", good: "✓" };

export function Stat({ label, value, hint, tone = "default" }: { label: string; value: string; hint?: string; tone?: Tone }) {
  return (
    <div className={`card p-4 ${toneClass[tone]}`}>
      <p className={`text-sm font-medium ${toneInk[tone]}`}>
        {icon[tone] && <span aria-hidden className="mr-1">{icon[tone]}</span>}
        {label}
      </p>
      <p className="tabular mt-1 text-2xl font-semibold tracking-tight text-ink">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-3">{hint}</p>}
    </div>
  );
}
