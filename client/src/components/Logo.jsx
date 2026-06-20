/**
 * Logo Jasa Warga — Komponen SVG reusable
 * Rounded square hijau dengan ikon perisai & checkmark
 */
export default function Logo({ size = 48 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="64" height="64" rx="14" fill="var(--color-fresh-grass, #8ed462)" />
            <path
                d="M32 12C26.48 12 22 16.48 22 22v4c0 8 10 16 10 16s10-8 10-16v-4c0-5.52-4.48-10-10-10z"
                fill="#ffffff"
                stroke="var(--color-ink-black, #2c2e2a)"
                strokeWidth="1.5"
                strokeLinejoin="round"
            />
            <path
                d="M27 24l4 4 6-6"
                stroke="var(--color-ink-black, #2c2e2a)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <circle cx="32" cy="50" r="4" fill="#ffffff" opacity="0.6" />
        </svg>
    );
}
