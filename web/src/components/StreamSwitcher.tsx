import { ChevronLeft, ChevronRight } from "lucide-react";

interface StreamSwitcherProps {
  name: string;
  count: number;
  index: number;
  /** Index of the Failed bin dot, or -1 if there are no failed tasks. */
  failedDotIndex: number;
  onPrev: () => void;
  onNext: () => void;
}

export function StreamSwitcher({
  name,
  count,
  index,
  failedDotIndex,
  onPrev,
  onNext,
}: StreamSwitcherProps) {
  return (
    <div className="flex items-center justify-center gap-5">
      <button
        aria-label="Previous stream"
        onClick={onPrev}
        className="text-muted transition-transform active:scale-90"
      >
        <ChevronLeft size={22} />
      </button>

      <div className="min-w-[120px] text-center">
        <div className="text-cream text-[15px] font-medium">{name}</div>
        <div className="mt-1.5 flex justify-center gap-1.5">
          {Array.from({ length: count }).map((_, i) => {
            const active = i === index;
            const isFailed = i === failedDotIndex;
            const color = active
              ? isFailed
                ? "#C0584A"
                : "#C96442"
              : isFailed
                ? "#5A3A36"
                : "#4E473C";
            return (
              <span
                key={i}
                className="h-1.5 w-1.5 rounded-full transition-colors"
                style={{ background: color }}
              />
            );
          })}
        </div>
      </div>

      <button
        aria-label="Next stream"
        onClick={onNext}
        className="text-muted transition-transform active:scale-90"
      >
        <ChevronRight size={22} />
      </button>
    </div>
  );
}
