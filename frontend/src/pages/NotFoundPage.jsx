import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="card max-w-md text-center">
        <h1 className="text-3xl font-bold">404</h1>
        <p className="mt-2 text-[#6b6477]">La ruta no existe.</p>
        <Link className="btn-primary mt-4 inline-block" to="/">Volver al inicio</Link>
      </div>
    </div>
  );
}