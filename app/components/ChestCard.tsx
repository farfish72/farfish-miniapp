// app/components/ChestCard.tsx
type Props = {
  title: string;
  description?: string;
  badge?: string;
  progress?: number;
  variant?: "bronze" | "silver" | "default";
  actionLabel?: string;
  actionDisabled?: boolean;
  onAction?: () => void;
  infoLabel?: string;
  onInfo?: () => void;
  disclaimer?: string;
};

export default function ChestCard({
  title,
  description,
  badge,
  progress,
  variant = "default",
  actionLabel,
  actionDisabled = false,
  onAction,
  infoLabel,
  onInfo,
  disclaimer,
}: Props) {
  const accent =
    variant === "bronze"
      ? "bg-emerald-400/80"
      : variant === "silver"
      ? "bg-sky-400/70"
      : "bg-emerald-400/70";

  const effectiveActionLabel =
    actionLabel ??
    (badge === "Locked" ? "Locked — stake to unlock" : "Open now");

  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-2xl font-semibold">{title}</h3>
          {description && (
            <p className="text-sm text-white/70 mt-1">{description}</p>
          )}
        </div>

        {badge && (
          <div className="shrink-0">
            <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
              {badge}
            </span>
          </div>
        )}
      </div>

      {typeof progress === "number" && (
        <div className="mt-4">
          <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className={`${accent} h-full`}
              style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
            />
          </div>
          <div className="mt-2 text-sm text-white/70">{progress}%</div>
        </div>
      )}

      {disclaimer && (
        <div className="mt-4 text-xs text-white/70 text-center">
          {disclaimer}
        </div>
      )}

      <div className="mt-4 space-y-3">
        <button
          type="button"
          className={`w-full rounded-lg py-3 font-semibold transition ${
            actionDisabled
              ? "bg-white/10 text-white/40 cursor-not-allowed"
              : `${accent} text-black`
          }`}
          onClick={() => {
            if (actionDisabled) return;
            onAction?.();
          }}
          disabled={actionDisabled}
        >
          {effectiveActionLabel}
        </button>

        {onInfo && (
          <button
            type="button"
            className="w-full rounded-lg border border-white/10 bg-transparent py-3 text-sm text-white/70 hover:bg-white/5 transition"
            onClick={onInfo}
          >
            {infoLabel ?? "Info"}
          </button>
        )}
      </div>
    </article>
  );
}
