import { useId } from 'react';

/**
 * Keffiyeh (كوفية) motifs as tiling SVG patterns, drawn in `currentColor`
 * so the parent decides black-on-white or white-on-black:
 *
 *  net    — the fishnet lattice (diamonds with a smaller diamond inside)
 *  chevron — the bold zig-zag bands that run along the cloth's edge
 *  leaves — the olive-leaf border that trims the fishnet
 *  full   — all three composed into one cloth: leaves / chevron / net / chevron / leaves
 */
export type KeffiyehVariant = 'net' | 'chevron' | 'leaves' | 'full';

type Props = {
  variant?: KeffiyehVariant;
  /** tile size in px for the net; chevron/leaves scale with it */
  size?: number;
  strokeWidth?: number;
  className?: string;
  style?: React.CSSProperties;
};

/** Four stacked zig-zags per band, like the scarf's edge. Fractions of the band height. */
const CHEVRON_AMP = 0.26;
const CHEVRON_ROWS = [0.06, 0.28, 0.5, 0.72];

export function KeffiyehPattern({ variant = 'net', size = 44, strokeWidth = 1.2, className = '', style }: Props) {
  const uid = useId().replace(/:/g, '');
  const net = `kf-net-${uid}`;
  const chevron = `kf-chev-${uid}`;
  const leaves = `kf-leaf-${uid}`;
  const half = size / 2;
  const q = size / 4;
  const bandH = size * 0.7;

  return (
    <svg aria-hidden className={className} style={style} width="100%" height="100%" preserveAspectRatio="none">
      <defs>
        <pattern id={net} width={size} height={size} patternUnits="userSpaceOnUse">
          <g fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="square">
            <path d={`M0 ${half} L${half} 0 L${size} ${half} L${half} ${size} Z`} />
            <path d={`M${q} ${half} L${half} ${q} L${size - q} ${half} L${half} ${size - q} Z`} />
            <path d={`M0 0 L${size} ${size} M${size} 0 L0 ${size}`} strokeOpacity="0.45" />
          </g>
        </pattern>
        <pattern id={chevron} width={size} height={bandH} patternUnits="userSpaceOnUse">
          <g fill="none" stroke="currentColor" strokeWidth={strokeWidth * 1.6} strokeLinejoin="miter">
            {CHEVRON_ROWS.map((top) => (
              <path key={top} d={`M0 ${bandH * (top + CHEVRON_AMP)} L${half} ${bandH * top} L${size} ${bandH * (top + CHEVRON_AMP)}`} />
            ))}
          </g>
        </pattern>
        <pattern id={leaves} width={size} height={bandH} patternUnits="userSpaceOnUse">
          <g fill="none" stroke="currentColor" strokeWidth={strokeWidth * 1.4} strokeLinecap="round">
            <path d={`M${q} ${bandH * 0.5} h${half}`} />
            <path d={`M${q} ${bandH * 0.5} q${q} ${-q} ${half} 0 q${-q} ${q} ${-half} 0z`} />
            <path d={`M${half} ${bandH * 0.5} q${q * 0.5} ${-q * 0.6} ${q} ${-bandH * 0.42}`} />
            <path d={`M${half} ${bandH * 0.5} q${q * 0.5} ${q * 0.6} ${q} ${bandH * 0.42}`} />
          </g>
        </pattern>
      </defs>

      {variant === 'net' && <rect width="100%" height="100%" fill={`url(#${net})`} />}
      {variant === 'chevron' && <rect width="100%" height="100%" fill={`url(#${chevron})`} />}
      {variant === 'leaves' && <rect width="100%" height="100%" fill={`url(#${leaves})`} />}
      {variant === 'full' && (
        <>
          <rect x="0" y="0" width="100%" height={bandH} fill={`url(#${leaves})`} />
          <rect x="0" y={bandH} width="100%" height={bandH} fill={`url(#${chevron})`} />
          <rect x="0" y={bandH * 2} width="100%" height={`calc(100% - ${bandH * 4}px)`} fill={`url(#${net})`} />
          <rect x="0" y={`calc(100% - ${bandH * 2}px)`} width="100%" height={bandH} fill={`url(#${chevron})`} />
          <rect x="0" y={`calc(100% - ${bandH}px)`} width="100%" height={bandH} fill={`url(#${leaves})`} />
        </>
      )}
    </svg>
  );
}

/** A thin horizontal keffiyeh chevron strip, used as a section divider. */
export function KeffiyehBand({ className = '', height = 30 }: { className?: string; height?: number }) {
  return (
    <div aria-hidden className={`w-full overflow-hidden ${className}`} style={{ height }}>
      <KeffiyehPattern variant="chevron" size={28} strokeWidth={1} />
    </div>
  );
}
