import logoImage from '../assets/brand/hispacontact-logo.png';
import markImage from '../assets/brand/hispacontact-mark.png';

export function BrandMark({ className = '' }) {
  return (
    <img
      src={markImage}
      alt="hispacontact"
      className={`h-10 w-10 object-contain ${className}`}
      draggable={false}
    />
  );
}

export default function BrandLogo({ compact = false, className = '' }) {
  if (compact) return <BrandMark className={className} />;

  return (
    <img
      src={logoImage}
      alt="hispacontact"
      className={`h-14 w-auto object-contain ${className}`}
      draggable={false}
    />
  );
}