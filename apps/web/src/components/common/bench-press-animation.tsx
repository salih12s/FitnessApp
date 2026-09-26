import {
  animate,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'motion/react';
import * as m from 'motion/react-m';
import type { MotionValue } from 'motion/react';
import { Pause, Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import benchPressBodyUrl from '@/assets/muscles/bench-press-body.svg';

const upperArmLength = 55;
const forearmLength = 55;
const topBarY = 43;
const bottomBarY = 124;

interface Point {
  x: number;
  y: number;
}

const arms = [
  { shoulder: { x: 221, y: 151 }, wristX: 221, side: -1 },
  { shoulder: { x: 287, y: 151 }, wristX: 287, side: 1 },
] as const;

function barY(progress: number) {
  return topBarY + (bottomBarY - topBarY) * progress;
}

function elbowFor(shoulder: Point, wrist: Point, side: number): Point {
  const dx = wrist.x - shoulder.x;
  const dy = wrist.y - shoulder.y;
  const distance = Math.hypot(dx, dy);
  const midpointX = (shoulder.x + wrist.x) / 2;
  const midpointY = (shoulder.y + wrist.y) / 2;
  const offset = Math.sqrt(upperArmLength ** 2 - (distance / 2) ** 2);

  return {
    x: midpointX + side * (-dy / distance) * offset,
    y: midpointY + side * (dx / distance) * offset,
  };
}

function segmentTransform(start: Point, end: Point) {
  const angle = (Math.atan2(end.y - start.y, end.x - start.x) * 180) / Math.PI;
  return `translate(${start.x}px, ${start.y}px) rotate(${angle}deg)`;
}

function Arm({
  progress,
  shoulder,
  wristX,
  side,
}: {
  progress: MotionValue<number>;
  shoulder: Point;
  wristX: number;
  side: number;
}) {
  const elbow = useTransform(progress, (value) =>
    elbowFor(shoulder, { x: wristX, y: barY(value) }, side),
  );
  const upperTransform = useTransform(elbow, (point) =>
    segmentTransform(shoulder, point),
  );
  const forearmTransform = useTransform(progress, (value) => {
    const wrist = { x: wristX, y: barY(value) };
    return segmentTransform(elbowFor(shoulder, wrist, side), wrist);
  });
  const elbowTransform = useTransform(
    elbow,
    (point) => `translate(${point.x}px, ${point.y}px)`,
  );

  return (
    <g>
      <circle cx={shoulder.x} cy={shoulder.y} fill="#676c74" r="13" />
      <m.g style={{ transform: upperTransform }}>
        <path
          d={`M0-11C16-13 37-12 ${upperArmLength} -8V8C35 12 15 13 0 11Z`}
          fill="#5b6068"
          stroke="#9aa0a8"
          strokeOpacity="0.55"
          strokeWidth="1.5"
        />
        <path
          d="M10-5C22-8 32-8 44-5"
          fill="none"
          stroke="var(--primary)"
          strokeOpacity="0.43"
          strokeWidth="4"
        />
      </m.g>
      <m.g style={{ transform: elbowTransform }}>
        <circle fill="#6c7179" r="9" />
      </m.g>
      <m.g style={{ transform: forearmTransform }}>
        <path
          d={`M0-8C15-10 39-9 ${forearmLength} -7V7C39 9 15 10 0 8Z`}
          fill="#6b7078"
          stroke="#a9aeb6"
          strokeOpacity="0.55"
          strokeWidth="1.5"
        />
        <path
          d="M11-4C25-6 37-6 48-4"
          fill="none"
          stroke="#adb2ba"
          strokeOpacity="0.4"
          strokeWidth="2"
        />
      </m.g>
    </g>
  );
}

export function BenchPressAnimation() {
  const reducedMotion = useReducedMotion();
  const progress = useMotionValue(0);
  const controlsRef = useRef<ReturnType<typeof animate> | null>(null);
  const playingRef = useRef(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const barTransform = useTransform(
    progress,
    (value) => `translate(0px, ${barY(value)}px)`,
  );

  useEffect(() => {
    if (reducedMotion) {
      progress.set(0);
      return;
    }

    const controls = animate(progress, 1, {
      duration: 2.2,
      ease: 'easeInOut',
      repeat: Infinity,
      repeatDelay: 0.2,
      repeatType: 'reverse',
    });
    controlsRef.current = controls;
    if (!playingRef.current) {
      controls.pause();
    }

    return () => {
      controls.stop();
      controlsRef.current = null;
    };
  }, [progress, reducedMotion]);

  function togglePlayback() {
    if (playingRef.current) {
      controlsRef.current?.pause();
    } else {
      controlsRef.current?.play();
    }
    playingRef.current = !playingRef.current;
    setIsPlaying(playingRef.current);
  }

  return (
    <figure className="relative mt-6 overflow-hidden rounded-lg border border-border bg-surface px-4 pb-2 pt-4 sm:px-5 sm:pb-4">
      <div className="relative flex items-center justify-between gap-4">
        <figcaption className="text-base font-semibold text-foreground">
          Hareket gösterimi
        </figcaption>
        {!reducedMotion ? (
          <button
            aria-label={isPlaying ? 'Animasyonu duraklat' : 'Animasyonu oynat'}
            className="grid size-11 shrink-0 place-items-center rounded-md border border-border-strong bg-surface text-foreground outline-none transition-colors hover:bg-surface-elevated focus-visible:ring-3 focus-visible:ring-ring"
            onClick={togglePlayback}
            type="button"
          >
            {isPlaying ? (
              <Pause aria-hidden="true" className="size-4" />
            ) : (
              <Play aria-hidden="true" className="size-4" />
            )}
          </button>
        ) : null}
      </div>
      <svg
        aria-label="Yatar pozdaki sporcu, iki eliyle barı göğsüne doğru indirip tekrar yukarı itiyor."
        className="relative mx-auto block h-auto w-full max-w-3xl"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        viewBox="0 18 600 235"
      >
        <image height="300" href={benchPressBodyUrl} width="600" />
        <path
          d="M177 154c17-11 42-14 66-9 14 3 26 9 35 15-10 14-27 23-47 25-22 2-41-5-54-18z"
          fill="var(--primary)"
          fillOpacity="0.68"
        />
        <path
          d="M249 146c17 0 35 4 52 10 11 4 21 10 28 17-9 9-24 14-42 13-18-1-34-7-45-16z"
          fill="var(--primary)"
          fillOpacity="0.53"
        />
        <path
          d="M220 151c-14 0-24 5-30 14m97-14c12 2 22 7 30 15"
          fill="none"
          stroke="var(--primary)"
          strokeOpacity="0.9"
          strokeWidth="2"
        />
        {arms.map((arm) => (
          <Arm key={arm.wristX} progress={progress} {...arm} />
        ))}
        <m.g data-bench-bar style={{ transform: barTransform }}>
          <rect fill="#9aa0a8" height="6" rx="3" width="202" x="153" y="-3" />
          <rect
            fill="#4d525a"
            height="31"
            rx="4"
            width="10"
            x="166"
            y="-15.5"
          />
          <rect
            fill="#676c74"
            height="39"
            rx="4"
            width="12"
            x="178"
            y="-19.5"
          />
          <rect
            fill="#676c74"
            height="39"
            rx="4"
            width="12"
            x="318"
            y="-19.5"
          />
          <rect
            fill="#4d525a"
            height="31"
            rx="4"
            width="10"
            x="332"
            y="-15.5"
          />
          {arms.map(({ wristX }) => (
            <g key={wristX} transform={`translate(${wristX} 0)`}>
              <path
                d="M-9 4v-6c0-6 4-10 9-10s9 4 9 10v6"
                fill="none"
                stroke="#adb2ba"
                strokeLinecap="round"
                strokeWidth="5"
              />
              <path
                d="M-7 5c5 4 9 4 14 0"
                fill="none"
                stroke="#6d727a"
                strokeLinecap="round"
                strokeWidth="4"
              />
            </g>
          ))}
        </m.g>
      </svg>
    </figure>
  );
}
