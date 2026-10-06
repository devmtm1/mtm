import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { MobileSheet } from './MobileSheet';
import { SERVICES } from './services-links';

export function ServicesSheet({ onClose, title = 'Nos services' }: { onClose: () => void; title?: string }) {
  return (
    <MobileSheet title={title} onClose={onClose}>
      <ul className="flex flex-col gap-1 pb-2">
        {SERVICES.map(({ to, label, description, icon: Icon }) => (
          <li key={to}>
            <Link
              to={to}
              onClick={onClose}
              className="flex items-center gap-3 rounded-2xl px-3 py-3 active:scale-[0.98] active:bg-mtm-bg"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-mtm-primary-subtle text-mtm-primary">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-mtm-text">{label}</span>
                <span className="block truncate text-xs text-mtm-muted">{description}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-mtm-muted" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </MobileSheet>
  );
}
