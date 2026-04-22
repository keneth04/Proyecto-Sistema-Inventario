import { Navigate } from 'react-router-dom';

export default function ReturnCreatePage() {
  return <Navigate to="/returns" replace />;
}