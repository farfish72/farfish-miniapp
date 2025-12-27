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
  secondaryActionLabel?: string;
  secondaryActionDisabled?: boolean;
  onSecondaryAction?: () => void;
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
  secondaryActionLabel,
  secondaryActionDisabled = false,
  onSecondaryAction,
}: Props) {
  const accent =
    variant === "bronze"
      ? "bg-emerald-400/80"
      : variant === "silver"
      ? "bg-sky-400/70"
      : "bg-emerald-400/70";

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
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">
            {badge}
          </span>
        )}
      </div>

      {typeof progress === "number" && (
        <div className="mt-4">
          <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className={`${accent} h-full`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 text-xs text-white/70">{progress}%</div>
        </div>
      )}

      <div className="space-y-2">
        {actionLabel && onAction && (
          <button
            type="button"
            className={`w-full rounded-lg py-3 font-semibold transition ${
              actionDisabled
                ? "bg-white/10 text-white/40 cursor-not-allowed"
                : `${accent} text-black`
            }`}
            onClick={onAction}
            disabled={actionDisabled}
          >
            {actionLabel}
          </button>
        )}
        
        {secondaryActionLabel && onSecondaryAction && (
          <button
            type="button"
            className={`w-full rounded-lg border border-white/20 py-2.5 text-sm font-medium transition ${
              secondaryActionDisabled
                ? "text-white/40 cursor-not-allowed"
                : "text-white/80 hover:bg-white/5"
            }`}
            onClick={onSecondaryAction}
            disabled={secondaryActionDisabled}
          >
            {secondaryActionLabel}
          </button>
        )}
      </div>
    </article>
  );
}
