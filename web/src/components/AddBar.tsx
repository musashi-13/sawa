import { Plus } from "lucide-react";

interface AddBarProps {
  onAddTask: () => void;
  onAddBundle: () => void;
}

export function AddBar({ onAddTask, onAddBundle }: AddBarProps) {
  return (
    <div className="flex gap-2.5">
      <button
        onClick={onAddTask}
        data-tour="add"
        className="bg-bg-soft border-border-warm flex flex-[0.7] items-center justify-center gap-2 rounded-full border px-4 py-2.5 transition-transform active:scale-[0.98]"
      >
        <Plus size={17} className="text-gold shrink-0" />
        <span className="text-cream-soft text-[14px] leading-none">Add a task</span>
      </button>
      <button
        onClick={onAddBundle}
        data-tour="bundle"
        className="bg-bg-soft border-border-warm flex flex-[0.3] items-center justify-center gap-1.5 rounded-full border px-3 py-2.5 transition-transform active:scale-[0.98]"
      >
        {/* 束 = "bundle" — same glyph as the bundle card, in place of a generic icon.
            top offset optically centers the CJK glyph against the Latin text. */}
        <span className="text-gold relative top-[1.5px] shrink-0 font-serif text-[15px] leading-none">
          束
        </span>
        <span className="text-cream-soft text-[13px] leading-none">Bundle</span>
      </button>
    </div>
  );
}
