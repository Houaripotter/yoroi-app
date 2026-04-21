import React from 'react';
import { Composition } from 'remotion';
import { YoroiTrailer } from './compositions/YoroiTrailer';
import { YoroiFeatures } from './compositions/YoroiFeatures';

// ============================================================
// YOROI — Compositions TikTok/Instagram
// Format: 1080x1920 (9:16 vertical)
// ============================================================

export const Root: React.FC = () => {
  return (
    <>
      {/* Trailer — 30 secondes */}
      <Composition
        id="YoroiTrailer"
        component={YoroiTrailer}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />

      {/* Features showcase — 15 secondes */}
      <Composition
        id="YoroiFeatures"
        component={YoroiFeatures}
        durationInFrames={450}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
    </>
  );
};
