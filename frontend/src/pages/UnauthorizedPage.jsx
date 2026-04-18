import { Link } from 'react-router-dom';

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="card max-w-md text-center">
        <h1 className="text-3xl font-bold">403</h1>
        <p className="mt-2 text-[#6b6477]">No tienes permisos para acceder a esta vista.</p>
        <Link className="btn-primary mt-4 inline-block" to="/">Ir al dashboard</Link>
      </div>
    </div>
  );
}