function Icon({ children, className = '' }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function HomeIcon({ className }) {
  return (
    <Icon className={className}>
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h5v-6h4v6h5V10" />
    </Icon>
  );
}

export function SearchIcon({ className }) {
  return (
    <Icon className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </Icon>
  );
}

export function PlusIcon({ className }) {
  return (
    <Icon className={className}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </Icon>
  );
}

export function UserIcon({ className }) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="8" r="3" />
      <path d="M5 21a7 7 0 0 1 14 0" />
    </Icon>
  );
}

export function TagIcon({ className }) {
  return (
    <Icon className={className}>
      <path d="M20.5 13.5 13.5 20.5a2 2 0 0 1-2.8 0L3 12.8V3h9.8l7.7 7.7a2 2 0 0 1 0 2.8Z" />
      <path d="M7.5 7.5h.01" />
    </Icon>
  );
}

export function CalendarIcon({ className }) {
  return (
    <Icon className={className}>
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
    </Icon>
  );
}

export function LocationIcon({ className }) {
  return (
    <Icon className={className}>
      <path d="M12 21s7-5.2 7-12a7 7 0 1 0-14 0c0 6.8 7 12 7 12Z" />
      <circle cx="12" cy="9" r="2.5" />
    </Icon>
  );
}

export function ChevronRightIcon({ className }) {
  return (
    <Icon className={className}>
      <path d="m9 18 6-6-6-6" />
    </Icon>
  );
}

export function ChevronLeftIcon({ className }) {
  return (
    <Icon className={className}>
      <path d="m15 18-6-6 6-6" />
    </Icon>
  );
}

export function SortDownIcon({ className }) {
  return (
    <Icon className={className}>
      <path d="M8 4v12" />
      <path d="m5 13 3 3 3-3" />
      <path d="M14 7h5" />
      <path d="M14 12h4" />
      <path d="M14 17h3" />
    </Icon>
  );
}

export function SortUpIcon({ className }) {
  return (
    <Icon className={className}>
      <path d="M8 20V8" />
      <path d="m5 11 3-3 3 3" />
      <path d="M14 7h3" />
      <path d="M14 12h4" />
      <path d="M14 17h5" />
    </Icon>
  );
}

export function SparkIcon({ className }) {
  return (
    <Icon className={className}>
      <path d="M12 3 9.8 9.8 3 12l6.8 2.2L12 21l2.2-6.8L21 12l-6.8-2.2L12 3Z" />
    </Icon>
  );
}

export function InfoIcon({ className }) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </Icon>
  );
}
