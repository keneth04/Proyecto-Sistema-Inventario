export default function ToggleSwitch({ checked, onChange, disabled = false, label }) {
  return (
    <label className="inline-flex items-center gap-3 text-sm text-[#322645]">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label || 'Cambiar estado'}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`toggle-switch ${!checked ? 'toggle-switch--off' : ''} ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
      >
        <span className={`toggle-switch__thumb ${checked ? 'toggle-switch__thumb--on' : ''}`} />
      </button>
      {label ? <span className="font-medium">{label}</span> : null}
    </label>
  );
}