import { Flame, Settings2 } from "lucide-react";

interface TopBarProps {
  name: string;
  streak: number;
  leftCount: number;
  completedToday: number;
  failedCount: number;
  failedView: boolean;
  onManageStreams: () => void;
}

export function TopBar({
  name,
  streak,
  leftCount,
  completedToday,
  failedCount,
  failedView,
  onManageStreams,
}: TopBarProps) {
  return (
    <header className="px-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-cream text-[22px] font-medium">沢</span>
          <span className="text-cream-soft text-[15px]">Hi, {name}</span>
        </div>
        <div className="flex items-center gap-3.5">
          <div className="flex items-center gap-1.5" title={`${streak} day streak`}>
            <Flame size={15} className="text-clay" />
            <span className="text-[13px] font-medium text-[#b7ac98]">{streak}</span>
          </div>
          <button
            onClick={onManageStreams}
            aria-label="Manage streams"
            title="Manage streams"
            className="text-muted transition-colors hover:text-cream-soft active:scale-90"
          >
            <Settings2 size={16} />
          </button>
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
