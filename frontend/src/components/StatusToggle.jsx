export default function StatusToggle({ active, onToggle, label }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      aria-pressed={active}
      className={`relative inline-flex h-8 w-16 items-center rounded-full border transition duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 ${active
        ? 'border-emerald-600 bg-emerald-500/90 shadow-[inset_0_2px_8px_rgba(0,0,0,0.25)] focus:ring-emerald-500/35'
        : 'border-[#e12d2d] bg-[#e12d2d]/90 shadow-[inset_0_2px_8px_rgba(0,0,0,0.25)] focus:ring-[#e12d2d]/35'
      }`}
    >
      <span
        className={`mx-1 inline-block h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-300 ${active ? 'translate-x-8' : 'translate-x-0'}`}
      />
      <span className="sr-only">{label}</span>
    </button>
  );
}