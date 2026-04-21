import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
  Img,
  staticFile,
} from 'remotion';
import { YOROI } from '../colors';

// ============================================================
// YOROI TRAILER — TikTok/Instagram Reel (1080x1920, 30s)
// ============================================================

const FPS = 30;

// ---- Helpers ----
const fadeIn = (frame: number, start: number, duration = 20) =>
  interpolate(frame, [start, start + duration], [0, 1], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });

const slideUp = (frame: number, start: number, duration = 20) =>
  interpolate(frame, [start, start + duration], [60, 0], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });

// ---- Particle background ----
const Particles: React.FC<{ frame: number }> = ({ frame }) => {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: (i * 173 + 47) % 100,
    y: ((frame * (0.3 + (i % 5) * 0.1) + i * 200) % 120) - 10,
    size: 2 + (i % 4),
    opacity: 0.1 + (i % 3) * 0.1,
  }));

  return (
    <>
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            backgroundColor: YOROI.volt,
            opacity: p.opacity,
            boxShadow: `0 0 ${p.size * 3}px ${YOROI.volt}`,
          }}
        />
      ))}
    </>
  );
};

// ---- Grid lines background ----
const GridLines: React.FC<{ opacity: number }> = ({ opacity }) => (
  <div style={{ position: 'absolute', inset: 0, opacity }}>
    {Array.from({ length: 8 }, (_, i) => (
      <div
        key={`v${i}`}
        style={{
          position: 'absolute',
          left: `${(i + 1) * 12.5}%`,
          top: 0,
          bottom: 0,
          width: 1,
          background: `linear-gradient(to bottom, transparent, ${YOROI.volt}20, transparent)`,
        }}
      />
    ))}
    {Array.from({ length: 14 }, (_, i) => (
      <div
        key={`h${i}`}
        style={{
          position: 'absolute',
          top: `${(i + 1) * 7.14}%`,
          left: 0,
          right: 0,
          height: 1,
          background: `linear-gradient(to right, transparent, ${YOROI.volt}15, transparent)`,
        }}
      />
    ))}
  </div>
);

// ---- Scene 1: Hook (0–2.5s / frames 0–75) ----
const Scene1Hook: React.FC<{ frame: number }> = ({ frame }) => {
  const titleOpacity = fadeIn(frame, 5, 25);
  const titleY = slideUp(frame, 5, 25);
  const line2Opacity = fadeIn(frame, 25, 20);
  const line2Y = slideUp(frame, 25, 20);
  const pulseScale = 1 + Math.sin(frame * 0.15) * 0.015;

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <GridLines opacity={0.4} />
      <Particles frame={frame} />

      {/* Top accent line */}
      <div style={{
        position: 'absolute',
        top: 160,
        width: 120,
        height: 3,
        background: `linear-gradient(to right, transparent, ${YOROI.volt}, transparent)`,
        opacity: fadeIn(frame, 0, 15),
      }} />

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 24,
        transform: `scale(${pulseScale})`,
      }}>
        <div style={{
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          textAlign: 'center',
          padding: '0 60px',
        }}>
          <div style={{
            fontSize: 88,
            fontWeight: 900,
            color: YOROI.white,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            letterSpacing: -2,
            lineHeight: 1,
            textTransform: 'uppercase',
          }}>
            TON CORPS
          </div>
          <div style={{
            fontSize: 88,
            fontWeight: 900,
            color: YOROI.volt,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            letterSpacing: -2,
            lineHeight: 1,
            textTransform: 'uppercase',
            textShadow: `0 0 40px ${YOROI.volt}, 0 0 80px ${YOROI.voltGlow}`,
          }}>
            C'EST TON
          </div>
          <div style={{
            fontSize: 88,
            fontWeight: 900,
            color: YOROI.white,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            letterSpacing: -2,
            lineHeight: 1,
            textTransform: 'uppercase',
          }}>
            ARMURE
          </div>
        </div>

        <div style={{
          opacity: line2Opacity,
          transform: `translateY(${line2Y}px)`,
          textAlign: 'center',
          padding: '0 80px',
        }}>
          <div style={{
            fontSize: 32,
            color: YOROI.textMuted,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            letterSpacing: 1,
          }}>
            Construis-la. Porte-la. Chaque jour.
          </div>
        </div>
      </div>

      {/* Bottom accent */}
      <div style={{
        position: 'absolute',
        bottom: 160,
        width: 120,
        height: 3,
        background: `linear-gradient(to right, transparent, ${YOROI.volt}, transparent)`,
        opacity: fadeIn(frame, 10, 15),
      }} />
    </AbsoluteFill>
  );
};

// ---- Scene 2: Logo reveal (2.5s–5s / frames 75–150) ----
const Scene2Logo: React.FC<{ frame: number }> = ({ frame }) => {
  const localFrame = frame - 75;
  const logoScale = spring({ fps: FPS, frame: localFrame, config: { damping: 12, stiffness: 120 } });
  const logoOpacity = fadeIn(localFrame, 0, 20);
  const textOpacity = fadeIn(localFrame, 25, 20);
  const tagOpacity = fadeIn(localFrame, 40, 20);
  const glowIntensity = interpolate(localFrame, [0, 40], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <GridLines opacity={0.3} />
      <Particles frame={localFrame} />

      {/* Glow circle behind logo */}
      <div style={{
        position: 'absolute',
        width: 400,
        height: 400,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${YOROI.volt}${Math.round(glowIntensity * 20).toString(16).padStart(2,'0')} 0%, transparent 70%)`,
      }} />

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 32,
      }}>
        {/* Logo */}
        <div style={{
          opacity: logoOpacity,
          transform: `scale(${logoScale})`,
          width: 220,
          height: 220,
          borderRadius: 44,
          overflow: 'hidden',
          boxShadow: `0 0 60px ${YOROI.volt}50, 0 0 120px ${YOROI.volt}20`,
        }}>
          <Img src={staticFile('assets/yoroi-logo-volt.png')} style={{ width: '100%', height: '100%' }} />
        </div>

        {/* App name */}
        <div style={{ opacity: textOpacity, textAlign: 'center' }}>
          <div style={{
            fontSize: 100,
            fontWeight: 900,
            color: YOROI.white,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            letterSpacing: 12,
            textTransform: 'uppercase',
          }}>
            YOROI
          </div>
          <div style={{
            fontSize: 28,
            color: YOROI.volt,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            letterSpacing: 6,
            textTransform: 'uppercase',
          }}>
            鎧 — L'ARMURE DE TON CORPS
          </div>
        </div>

        {/* Tag */}
        <div style={{
          opacity: tagOpacity,
          paddingTop: 8,
          borderTop: `1px solid ${YOROI.volt}40`,
          width: '80%',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: 24,
            color: YOROI.textMuted,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            letterSpacing: 2,
          }}>
            L'app fitness pour les guerriers
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---- Scene 3: Features (5s–22s / frames 150–660) ----
interface FeatureCard {
  emoji: string;
  title: string;
  desc: string;
  color: string;
}

const features: FeatureCard[] = [
  { emoji: '⚖️', title: 'POIDS & COMPOSITION', desc: 'Suivi précis via balances Tanita\nMasse musculaire · Graisse · Eau', color: YOROI.teal },
  { emoji: '🥋', title: 'BJJ & MMA', desc: 'Log tes séances de combat\nTechniques · Sparring · Progression', color: YOROI.volt },
  { emoji: '🏆', title: 'GAMIFICATION', desc: 'Système de rangs japonais\nAshigaru → Daimyō · XP · Badges', color: '#FFD700' },
  { emoji: '🍱', title: 'NUTRITION', desc: 'Suivi calories et macros\nAdapté à tes objectifs combat', color: '#FF6B9D' },
  { emoji: '⌚', title: 'APPLE WATCH', desc: 'Synchronisation native\nTes données toujours sur toi', color: YOROI.neonGreen },
  { emoji: '🔒', title: '100% PRIVÉ', desc: 'Tes données restent sur ton tel\nZéro cloud · Zéro tracking', color: '#7C3AED' },
];

const FEATURE_DURATION = 85; // frames per feature

const FeatureSlide: React.FC<{ feature: FeatureCard; localFrame: number; index: number }> = ({ feature, localFrame }) => {
  const opacity = fadeIn(localFrame, 0, 18);
  const slideY = slideUp(localFrame, 0, 18);
  const exitOpacity = interpolate(localFrame, [FEATURE_DURATION - 20, FEATURE_DURATION], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const combinedOpacity = opacity * exitOpacity;

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: '0 60px' }}>
      <div style={{
        opacity: combinedOpacity,
        transform: `translateY(${slideY}px)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 40,
        width: '100%',
      }}>
        {/* Icon circle */}
        <div style={{
          width: 160,
          height: 160,
          borderRadius: '50%',
          border: `3px solid ${feature.color}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 72,
          boxShadow: `0 0 40px ${feature.color}50`,
          background: `${feature.color}10`,
        }}>
          {feature.emoji}
        </div>

        {/* Title */}
        <div style={{
          fontSize: 56,
          fontWeight: 900,
          color: feature.color,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          letterSpacing: 2,
          textTransform: 'uppercase',
          textAlign: 'center',
          textShadow: `0 0 30px ${feature.color}80`,
        }}>
          {feature.title}
        </div>

        {/* Desc */}
        <div style={{
          fontSize: 34,
          color: YOROI.white,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          textAlign: 'center',
          lineHeight: 1.5,
          opacity: 0.85,
          whiteSpace: 'pre-line',
        }}>
          {feature.desc}
        </div>

        {/* Separator */}
        <div style={{
          width: 80,
          height: 3,
          background: feature.color,
          borderRadius: 2,
          boxShadow: `0 0 12px ${feature.color}`,
        }} />
      </div>
    </AbsoluteFill>
  );
};

const Scene3Features: React.FC<{ frame: number }> = ({ frame }) => {
  const localFrame = frame - 150;
  const currentFeatureIndex = Math.floor(localFrame / FEATURE_DURATION);
  const featureLocalFrame = localFrame % FEATURE_DURATION;
  const currentFeature = features[Math.min(currentFeatureIndex, features.length - 1)];

  // Progress dots
  const dotsOpacity = fadeIn(localFrame, 0, 20);

  return (
    <AbsoluteFill>
      <GridLines opacity={0.25} />
      <Particles frame={localFrame} />

      {currentFeature && (
        <FeatureSlide
          feature={currentFeature}
          localFrame={featureLocalFrame}
          index={currentFeatureIndex}
        />
      )}

      {/* Progress dots */}
      <div style={{
        position: 'absolute',
        bottom: 120,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        gap: 12,
        opacity: dotsOpacity,
      }}>
        {features.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === currentFeatureIndex ? 32 : 10,
              height: 10,
              borderRadius: 5,
              background: i === currentFeatureIndex ? YOROI.volt : `${YOROI.white}30`,
              transition: 'width 0.3s',
            }}
          />
        ))}
      </div>

      {/* YOROI watermark */}
      <div style={{
        position: 'absolute',
        top: 60,
        right: 50,
        opacity: 0.3,
        fontSize: 22,
        color: YOROI.volt,
        fontFamily: 'system-ui, sans-serif',
        fontWeight: 700,
        letterSpacing: 4,
      }}>
        YOROI 鎧
      </div>
    </AbsoluteFill>
  );
};

// ---- Scene 4: Mascot + CTA (22s–27s / frames 660–810) ----
const Scene4CTA: React.FC<{ frame: number }> = ({ frame }) => {
  const localFrame = frame - 660;
  const mascotScale = spring({ fps: FPS, frame: localFrame, config: { damping: 10, stiffness: 100 } });
  const mascotOpacity = fadeIn(localFrame, 0, 25);
  const textOpacity = fadeIn(localFrame, 30, 20);
  const ctaOpacity = fadeIn(localFrame, 50, 20);
  const ctaScale = spring({ fps: FPS, frame: Math.max(0, localFrame - 50), config: { damping: 8, stiffness: 150 } });
  const badgeOpacity = fadeIn(localFrame, 70, 20);

  const pulseGlow = 1 + Math.sin(localFrame * 0.2) * 0.3;

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <GridLines opacity={0.3} />
      <Particles frame={localFrame} />

      {/* Glow background */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 600,
        height: 600,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${YOROI.volt}${Math.round(pulseGlow * 12).toString(16).padStart(2,'0')} 0%, transparent 70%)`,
      }} />

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 36,
        paddingBottom: 100,
      }}>
        {/* Mascot */}
        <div style={{
          opacity: mascotOpacity,
          transform: `scale(${mascotScale})`,
        }}>
          <Img
            src={staticFile('assets/mascot.png')}
            style={{ width: 280, height: 280, objectFit: 'contain' }}
          />
        </div>

        {/* Text */}
        <div style={{ opacity: textOpacity, textAlign: 'center', padding: '0 60px' }}>
          <div style={{
            fontSize: 52,
            fontWeight: 900,
            color: YOROI.white,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            lineHeight: 1.2,
          }}>
            Prêt à construire
          </div>
          <div style={{
            fontSize: 52,
            fontWeight: 900,
            color: YOROI.volt,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            lineHeight: 1.2,
            textShadow: `0 0 30px ${YOROI.volt}`,
          }}>
            ton armure ?
          </div>
        </div>

        {/* CTA Button */}
        <div style={{
          opacity: ctaOpacity,
          transform: `scale(${ctaScale})`,
          background: YOROI.volt,
          paddingTop: 28,
          paddingBottom: 28,
          paddingLeft: 70,
          paddingRight: 70,
          borderRadius: 100,
          boxShadow: `0 0 40px ${YOROI.volt}60`,
        }}>
          <div style={{
            fontSize: 38,
            fontWeight: 900,
            color: YOROI.bgBlack,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            letterSpacing: 1,
          }}>
            📲 TÉLÉCHARGE YOROI
          </div>
        </div>

        {/* App Store badge */}
        <div style={{ opacity: badgeOpacity }}>
          <Img
            src={staticFile('assets/appstore.png')}
            style={{ height: 60, objectFit: 'contain' }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---- Scene 5: End card (27s–30s / frames 810–900) ----
const Scene5End: React.FC<{ frame: number }> = ({ frame }) => {
  const localFrame = frame - 810;
  const opacity = fadeIn(localFrame, 0, 25);
  const logoScale = spring({ fps: FPS, frame: localFrame, config: { damping: 12, stiffness: 100 } });
  const pulseGlow = 1 + Math.sin(localFrame * 0.25) * 0.5;

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <Particles frame={localFrame} />

      {/* Central glow */}
      <div style={{
        position: 'absolute',
        width: 500,
        height: 500,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${YOROI.volt}${Math.round(pulseGlow * 15).toString(16).padStart(2,'0')} 0%, transparent 70%)`,
      }} />

      <div style={{
        opacity,
        transform: `scale(${logoScale})`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 28,
      }}>
        <div style={{
          width: 200,
          height: 200,
          borderRadius: 40,
          overflow: 'hidden',
          boxShadow: `0 0 80px ${YOROI.volt}60`,
        }}>
          <Img src={staticFile('assets/yoroi-logo-volt.png')} style={{ width: '100%', height: '100%' }} />
        </div>

        <div style={{
          fontSize: 96,
          fontWeight: 900,
          color: YOROI.white,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          letterSpacing: 14,
        }}>
          YOROI
        </div>

        <div style={{
          fontSize: 26,
          color: YOROI.volt,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          letterSpacing: 4,
          textAlign: 'center',
        }}>
          鎧 · YOUR BODY IS YOUR ARMOR
        </div>

        <div style={{
          marginTop: 16,
          fontSize: 28,
          color: YOROI.textMuted,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          letterSpacing: 2,
        }}>
          #YOROI #BJJ #MMA #FITNESS
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ============================================================
// MAIN COMPOSITION
// ============================================================
export const YoroiTrailer: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{
      background: `radial-gradient(ellipse at 50% 0%, #1A1A2E 0%, ${YOROI.bgBlack} 60%)`,
    }}>
      {/* Scene 1: Hook (0–74) */}
      <Sequence from={0} durationInFrames={75}>
        <Scene1Hook frame={frame} />
      </Sequence>

      {/* Scene 2: Logo reveal (75–149) */}
      <Sequence from={75} durationInFrames={75}>
        <Scene2Logo frame={frame} />
      </Sequence>

      {/* Scene 3: Features (150–659) */}
      <Sequence from={150} durationInFrames={510}>
        <Scene3Features frame={frame} />
      </Sequence>

      {/* Scene 4: CTA (660–809) */}
      <Sequence from={660} durationInFrames={150}>
        <Scene4CTA frame={frame} />
      </Sequence>

      {/* Scene 5: End card (810–900) */}
      <Sequence from={810} durationInFrames={90}>
        <Scene5End frame={frame} />
      </Sequence>
    </AbsoluteFill>
  );
};
