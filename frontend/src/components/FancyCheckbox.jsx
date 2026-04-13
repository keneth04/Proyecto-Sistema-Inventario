export default function FancyCheckbox({
  checked,
  onChange,
  label,
  id,
  hideLabel = false,
  className = ''
}) {
  return (
    <label htmlFor={id} className={`group relative inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#e7e0f0] bg-white px-3 py-2 text-sm text-[#1f2937] transition hover:border-[#765492]/45 hover:shadow-sm ${className}`}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="peer sr-only"
      />
      <span className="relative block h-5 w-5 rounded-md border-2 border-[#765492]/65 bg-white transition duration-300 peer-checked:rotate-6 peer-checked:border-[#765492] peer-checked:bg-[#765492] peer-focus-visible:ring-2 peer-focus-visible:ring-[#765492]/25">
        <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-white opacity-0 transition peer-checked:opacity-100">✓</span>
      </span>
      <span className={hideLabel ? 'sr-only' : ''}>{label}</span>
    </label>
  );
}