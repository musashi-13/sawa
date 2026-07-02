import { Layers, Plus } from "lucide-react";

interface AddBarProps {
  onAddTask: () => void;
  onAddBundle: () => void;
}

export function AddBar({ onAddTask, onAddBundle }: AddBarProps) {
  return (
    <div className="flex gap-2.5">
      <button
        onClick={onAddTask}
        className="bg-bg-soft border-border-warm flex flex-[0.7] items-center justify-center gap-2 rounded-full border px-4 py-2.5 transition-transform active:scale-[0.98]"
      >
        <Plus size={17} className="text-clay" />
        <span className="text-cream-soft text-[14px]">Add a task</span>
      </button>
      <button
        onClick={onAddBundle}
        className="bg-bg-soft border-border-warm flex flex-[0.3] items-center justify-center gap-1.5 rounded-full border px-3 py-2.5 transition-transform active:scale-[0.98]"
      >
        <Layers size={16} className="text-clay" />
        <span className="text-cream-soft text-[13px]">Bundle</span>
      </button>
    </div>
  );
}
