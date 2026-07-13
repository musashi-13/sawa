import type { ReactNode } from "react";
import { Flame, Settings2 } from "lucide-react";
import { SawaStamp } from "./SawaStamp";

interface TopBarProps {
  name: string;
  streak: number;
  leftCount: number;
  completedToday: number;
  failedCount: number;
  failedView: boolean;
  onManageStreams: () => void;
  /** Auth profile control, injected only when Clerk is enabled. */
  profileSlot?: ReactNode;
}

export function TopBar({
  name,
  streak,
  leftCount,
  completedToday,
  failedCount,
  failedView,
  onManageStreams,
  profileSlot,
}: TopBarProps) {
  return (
    <header className="px-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <SawaStamp size={30} />
          <span className="text-cream-soft text-[15px]">
            {name ? `Hi, ${name}` : "Hi"}
          </span>
        </div>
        <div className="flex items-center gap-3.5">
          <div
            data-tour="streak"
            className="bg-bg-soft border-border-warm flex items-center gap-1.5 rounded-full border px-2.5 py-1"
            title={`${streak} day streak`}
          >
            <Flame size={14} className="text-clay" />
            <span className="text-[13px] font-medium text-[#b7ac98]">{streak}</span>
          </div>
          <button
            onClick={onManageStreams}
            aria-label="Manage streams"
            title="Manage streams"
            className="text-muted flex items-center transition-colors hover:text-cream-soft active:scale-90"
          >
            <Settings2 size={18} />
          </button>
          {profileSlot}
        </div>
      </div>
      <div className="text-muted-soft mt-2.5 text-[12px]">
        {failedView ? (
          <span>
            {failedCount} missed · → revive · ← discard
          </span>
        ) : (
          <span>
            {leftCount} left · {completedToday} complete
            {failedCount > 0 && <> · {failedCount} failed</>}
          </span>
        )}
      </div>
    </header>
  );
}
