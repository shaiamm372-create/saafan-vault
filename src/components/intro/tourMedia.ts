import type { StopId } from "./tourScene";

/**
 * Real photos or videos shown behind Hasawi at each stop of the tour.
 * Put the files in /public/tour and list them here (jpg, png, webp or mp4).
 * A stop with no media shows the 3D scene instead.
 *
 * Example:
 *   oasis: { src: "/tour/oasis.mp4", credit: "Photo: KFU Media Center" },
 */
export const TOUR_MEDIA: Partial<Record<StopId, { src: string; credit?: string }>> = {};

/**
 * Hasawi's intro video (made in HeyGen). When set, the home page opens with this
 * video instead of the 3D tour. Put the file in /public/tour.
 */
export const INTRO_VIDEO: string | null = null;
