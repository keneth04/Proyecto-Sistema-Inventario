export default function StatCard({ label, value }) {
  return (
    <div className="card">
      <p className="text-xs uppercase tracking-[0.12em] text-[#765492]">{label}</p>
      <p className="mt-2 text-3xl font-bold text-[#261d35]">{value}</p>
    </div>
  );
}