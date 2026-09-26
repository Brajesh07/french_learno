import React from "react";

type ToggleButtonProps = {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
};

const ToggleButton = ({ active, onClick, children }: ToggleButtonProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors flex flex-col w-[clamp(80px,22vw,224px)] h-[clamp(80px,10vw,160px)] text-left justify-between cursor-pointer ${
        active ? "bg-white text-gray-900 shadow" : " text-white bg-white/20"
      }`}
    >
      <span className="mr-2 inline-block h-4 w-4 rounded-full bg-current" />
      {children}
    </button>
  );
};

export default ToggleButton;
