export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="panel-title">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-[#6b6477]">{subtitle}</p> : null}
      </div>
      <div>{actions}</div>
    </div>
  );
}