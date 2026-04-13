export default function Modal({ open, title, onClose, children }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1f1730]/45 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-2xl rounded-2xl border border-[#e6deef] bg-white p-6 shadow-[0_22px_60px_rgba(29,14,43,0.24)]">
        <div className="mb-4 flex items-center justify-between border-b border-[#efe8f6] pb-3">
          <h3 className="text-lg font-bold text-[#261d35]">{title}</h3>
          <button onClick={onClose} className="btn-secondary px-2.5 py-1">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
