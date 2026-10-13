import type { ReactNode } from 'react';

interface IconProps {
  size?: number;
}

function Svg({ size = 18, children }: IconProps & { children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

export const IconUpload = (p: IconProps) => <Svg {...p}><path d="M12 15V4" /><path d="m7 9 5-5 5 5" /><path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" /></Svg>;
export const IconDownload = (p: IconProps) => <Svg {...p}><path d="M12 4v11" /><path d="m7 10 5 5 5-5" /><path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" /></Svg>;
export const IconPrint = (p: IconProps) => <Svg {...p}><path d="M7 9V4h10v5" /><rect x="4" y="9" width="16" height="7" rx="1.5" /><path d="M7 14h10v6H7z" /></Svg>;
export const IconSave = (p: IconProps) => <Svg {...p}><path d="M5 4h11l3 3v13H5z" /><path d="M8 4v5h7V4" /><path d="M8 20v-6h8v6" /></Svg>;
export const IconFolder = (p: IconProps) => <Svg {...p}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></Svg>;
export const IconWand = (p: IconProps) => <Svg {...p}><path d="m4 20 11-11" /><path d="m14 4 1 2 2 1-2 1-1 2-1-2-2-1 2-1z" /><path d="M19 13v3" /><path d="M17.5 14.5h3" /></Svg>;
export const IconTrash = (p: IconProps) => <Svg {...p}><path d="M4 7h16" /><path d="M9 7V4h6v3" /><path d="M6 7l1 13h10l1-13" /></Svg>;
export const IconInfo = (p: IconProps) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 8h.01" /></Svg>;
export const IconAlert = (p: IconProps) => <Svg {...p}><path d="M12 3 2 20h20z" /><path d="M12 10v4" /><path d="M12 17h.01" /></Svg>;
export const IconChart = (p: IconProps) => <Svg {...p}><path d="M4 20V4" /><path d="M4 20h16" /><path d="M8 16v-5" /><path d="M12 16V8" /><path d="M16 16v-3" /></Svg>;
export const IconFile = (p: IconProps) => <Svg {...p}><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" /><path d="M9 13h6" /><path d="M9 17h6" /></Svg>;
export const IconTable = (p: IconProps) => <Svg {...p}><rect x="3" y="5" width="18" height="14" rx="1.5" /><path d="M3 10h18" /><path d="M9 10v9" /></Svg>;
