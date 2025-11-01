'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

type Density = 'low' | 'med' | 'high';

export interface PopupChipsMotionProps {
  labels?: string[];
  isOpen: boolean;
  density?: Density;
  className?: string;
}

const DEFAULT_LABELS = [
  'Aesthetic dermal', 'BioPlus Co', 'Caregen', 'Dexlevo', 'Dongkook', 'Dr. PPS',
  'Filmed', 'Galderma', 'Guna', 'HyaluAl', 'Italfarmacia', 'Jalor', 'JM Biotech',
  'Koru pharma', 'Lab in cube', 'Merz Aesthetics', 'Mesorga', 'Nahyco', 'Neauvia',
  'Oreon', 'Professional Derma', 'Professional dietetics', 'Promoitalia', 'Quiver',
  'Revolax', 'Richesse', 'Tiramer', 'Vaim', 'Victoria sun', 'VM corporation'
];

function getMaxByDensity(density: Density): number {
  if (density === 'low') return 14;
  if (density === 'high') return 36;
  return 24; // med
}

// Small helper to clamp a value
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export default function PopupChipsMotion({ labels, isOpen, density = 'med', className }: PopupChipsMotionProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dims, setDims] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  const items = useMemo(() => {
    const base = (labels && labels.length ? labels : DEFAULT_LABELS).slice();
    return base.slice(0, getMaxByDensity(density));
  }, [labels, density]);

  // Measure container size for random positioning
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setDims({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Cursor speed detection for subtle global shake
  const lastPos = useRef<{ x: number; y: number; t: number } | null>(null);
  const [shake, setShake] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const now = performance.now();
      if (lastPos.current) {
        const dt = Math.max(1, now - lastPos.current.t);
        const dx = e.clientX - lastPos.current.x;
        const dy = e.clientY - lastPos.current.y;
        const speed = Math.sqrt(dx * dx + dy * dy) / dt;
        // threshold -> if fast, nudge chips slightly
        if (speed > 0.8) {
          setShake({ x: clamp(dx * 0.08, -6, 6), y: clamp(dy * 0.08, -6, 6) });
        } else {
          setShake({ x: 0, y: 0 });
        }
      }
      lastPos.current = { x: e.clientX, y: e.clientY, t: now };
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className={
        `relative w-full h-[45vh] md:h-[50vh] overflow-hidden rounded-2xl border border-gray-200 bg-white ${className || ''}`
      }
    >
      {items.map((label, idx) => (
        <Chip key={`${label}-${idx}`} label={label} container={dims} shake={shake} />
      ))}
    </div>
  );
}

function Chip({ label, container, shake }: { label: string; container: { w: number; h: number }; shake: { x: number; y: number } }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [0, 100], [0, 2]);

  // Random initial pos within container bounds
  useEffect(() => {
    const pad = 24;
    const startX = Math.random() * Math.max(0, container.w - 200 - pad) + pad;
    const startY = pad; // start wyżej
    x.set(startX);
    y.set(startY);

    // Drop to bottom with subtle bounce (bez pętli, jednorazowa animacja)
    const bottomY = clamp(container.h - 56 - pad, pad, Number.MAX_SAFE_INTEGER);
    animate(y, bottomY, { type: 'spring', stiffness: 220, damping: 22, bounce: 0.35 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [container.w, container.h]);

  // Apply shake as a tiny offset
  const shakeX = useTransform(x, (v) => v + shake.x);
  const shakeY = useTransform(y, (v) => v + shake.y);

  // Drag constraints and post-drag bounce to the bounds
  const pad = 24;
  const bounds = {
    left: pad,
    top: pad,
    right: Math.max(pad, container.w - 200 - pad),
    bottom: Math.max(pad, container.h - 56 - pad)
  };

  const handleDragEnd = () => {
    const cx = clamp(x.get(), bounds.left, bounds.right);
    const cy = clamp(y.get(), bounds.top, bounds.bottom);
    const hitX = cx !== x.get();
    const hitY = cy !== y.get();
    if (hitX) animate(x, cx, { type: 'spring', stiffness: 300, damping: 20, bounce: 0.4 });
    if (hitY) animate(y, cy, { type: 'spring', stiffness: 300, damping: 20, bounce: 0.4 });
  };

  return (
    <motion.div
      className="absolute"
      style={{ x: shakeX, y: shakeY }}
      drag
      dragMomentum
      dragElastic={0.18}
      dragConstraints={bounds}
      onDragEnd={handleDragEnd}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
    >
      <motion.button
        className="px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm text-sm text-gray-900"
        style={{ rotate }}
      >
        {label}
      </motion.button>
    </motion.div>
  );
}

/*
Przykład użycia w popupie:

{isOpen && (
  <PopupChipsMotion
    isOpen
    labels={["Aesthetic dermal", "BioPlus Co", "Caregen"]}
    density="med"
  />
)}
*/


