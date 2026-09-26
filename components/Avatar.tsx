"use client";

import { useState } from "react";
import Image from "next/image";

/**
 * Bug fix: the avatar was previously rendered as a bare <Image>, with the
 * decoration frame (when present) drawn as a second, separately-sized
 * image absolutely positioned over it. Because the two images didn't share
 * a common sizing box, the frame and the letter-fallback avatar could both
 * paint at once and visibly overlap/stack. This component owns a single
 * fixed-size relative box so exactly one avatar layer and (optionally) one
 * frame layer are ever stacked, always aligned.
 *
 * It also fixes the "frame effect never shows up" bug: `decorationUrl` is
 * now actually read and rendered (see lib/auth.ts), and broken/expired
 * avatar URLs fall back to the initial-letter circle via onError instead
 * of leaving a broken image in place.
 */
export default function Avatar({
  src,
  decorationUrl,
  username,
  size,
  ringClassName = "",
}: {
  src: string | null | undefined;
  decorationUrl?: string | null;
  username: string;
  size: number;
  ringClassName?: string;
}) {
  const [broken, setBroken] = useState(false);
  const showImage = !!src && !broken;
  // The decoration frame is drawn slightly larger than the avatar itself
  // (that's how Discord renders it too), so it needs its own box that's
  // centered on top rather than sized to match the avatar exactly.
  const frameSize = Math.round(size * 1.28);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {showImage ? (
        <Image
          src={src}
          alt={username}
          width={size}
          height={size}
          onError={() => setBroken(true)}
          className={`rounded-full object-cover ${ringClassName}`}
          style={{ width: size, height: size }}
        />
      ) : (
        <div
          className={`w-full h-full rounded-full accent-btn flex items-center justify-center font-bold ${ringClassName}`}
          style={{ fontSize: Math.max(11, size * 0.38) }}
        >
          {username?.[0]?.toUpperCase() || "?"}
        </div>
      )}

      {decorationUrl && (
        <Image
          src={decorationUrl}
          alt=""
          width={frameSize}
          height={frameSize}
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ width: frameSize, height: frameSize }}
        />
      )}
    </div>
  );
}
