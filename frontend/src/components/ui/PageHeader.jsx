export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h2 className="panel-title">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-[#6b6477]">{subtitle}</p> : null}
      </div>
      <div className="w-full sm:w-auto [&>*]:w-full sm:[&>*]:w-auto">{actions}</div>
    </div>
  );
}