import React from "react";

const PenIcon = ({ className = "w-6 h-6 mr-2 text-slate-700" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M2 21l1-4 11-11 4 4L7 21H2zM20.7 7.3c.39-.39.39-1.02 0-1.41l-2.6-2.6a.9959.9959 0 0 0-1.41 0l-1.83 1.83 4 4L20.7 7.3z" />
  </svg>
);

const Header = () => {
  return (
    <header className="w-full border-b border-slate-100 bg-white/80 py-3 px-6 shadow-sm sticky top-0 z-20">
      <div className="mx-auto max-w-7xl flex items-center gap-3">
        <PenIcon className="w-6 h-6 text-sky-600" />
        <h1 className="text-lg font-semibold text-slate-900">CanvasLink</h1>
      </div>
    </header>
  );
};

export default Header;
