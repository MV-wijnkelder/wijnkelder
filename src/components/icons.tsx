import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Symbol({ children, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {children}
    </svg>
  );
}

export function WineglassIcon(props: IconProps) {
  return <Symbol {...props}><path d="M7 3h10l-.7 5.1a4.34 4.34 0 0 1-8.6 0L7 3Z" /><path d="M12 12.2V21M8.5 21h7" /><path d="M8.1 7h7.8" /></Symbol>;
}

export function CameraIcon(props: IconProps) {
  return <Symbol {...props}><path d="M4.5 7.5h2.2l1.4-2h7.8l1.4 2h2.2a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18V9a1.5 1.5 0 0 1 1.5-1.5Z" /><circle cx="12" cy="13" r="3.5" /></Symbol>;
}

export function PhotoIcon(props: IconProps) {
  return <Symbol {...props}><rect x="3" y="4" width="18" height="16" rx="2.5" /><circle cx="8.5" cy="9" r="1.5" /><path d="m5 18 5-5 3 3 2-2 4 4" /></Symbol>;
}

export function ChevronLeftIcon(props: IconProps) {
  return <Symbol {...props}><path d="m15 18-6-6 6-6" /></Symbol>;
}

export function ArrowClockwiseIcon(props: IconProps) {
  return <Symbol {...props}><path d="M20 7v5h-5" /><path d="M18.5 15.5A7.5 7.5 0 1 1 19.7 9" /></Symbol>;
}

export function PlusIcon(props: IconProps) {
  return <Symbol {...props}><path d="M12 5v14M5 12h14" /></Symbol>;
}

export function CheckIcon(props: IconProps) {
  return <Symbol {...props}><path d="m5 12.5 4.2 4.2L19 7" /></Symbol>;
}
