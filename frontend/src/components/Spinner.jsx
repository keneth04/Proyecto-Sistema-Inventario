export default function Spinner({ label = 'Cargando...' }) {
  return (
    <div className="flex items-center justify-center gap-2 text-sm text-[#4a4a4a]">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#d9dde6] border-t-[#835da2]" />
      <span>{label}</span>
    </div>
  );
}
