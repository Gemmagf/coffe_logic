import { colorFor } from '../../lib/colors';
import { initials } from '../../lib/format';

export default function Avatar({ name, size = 32, id }: { name: string; size?: number; id?: string }) {
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: Math.round(size * 0.38), background: colorFor(id ?? name) }} title={name}>
      {initials(name)}
    </span>
  );
}
