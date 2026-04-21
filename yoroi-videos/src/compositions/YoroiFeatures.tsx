import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  spring,
  interpolate,
  Sequence,
  Img,
  staticFile,
} from 'remotion';
import { YOROI } from '../colors';

// ============================================================
// YOROI FEATURES — Short TikTok (1080x1920, 15s)
// Showcase rapide des features clés — style "hook fort"
// ============================================================

const FPS = 30;
const TOTAL_FRAMES = 450; // 15s

const fadeIn = (frame: number, start: number, duration = 15) =>
  interpolate(frame, [start, start + duration], [0, 1], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });

const slideRight = (frame: number, start: number, duration = 18) =>
  interpolate(frame, [start, start + duration], [-80, 0], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });

// Stat card component
const StatCard: React.FC<{
  label: string;
  value: string;
  unit?: string;
  color: string;
  frame: number;
  startFrame: number;
}> = ({ label, value, unit, color, frame, startFrame }) => {
  const opacity = fadeIn(frame, startFrame, 15);
  const x = slideRight(frame, startFrame, 15);
  const numericVal = parseFloat(value);
  const animatedVal = isNaN(numericVal)
    ? value
    : interpolate(frame, [startFrame, startFrame + 30], [0, numericVal], {
        extrapolateRight: 'clamp',
        extrapolateLeft: 'clamp',
      }).toFixed(value.includes('.') ? 1 : 0);

  return (
    <div style={{
      opacity,
      transform: `translateX(${x}px)`,
      background: `${color}12`,
      border: `2px solid ${color}40`,
      borderRadius: 24,
      padding: '24px 32px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      flex: 1,
      boxShadow: `0 0 20px ${color}20`,
    }}>
      <div style={{
        fontSize: 22,
        color: `${color}CC`,
        fontFamily: 'system-ui, sans-serif',
        letterSpacing: 1,
        textTransform: 'uppercase',
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 56,
        fontWeight: 900,
        color: YOROI.white,
        fontFamily: 'system-ui, sans-serif',
        lineHeight: 1,
      }}>
        {animatedVal}
        {unit && <span style={{ fontSize: 28, color: color, marginLeft: 6 }}>{unit}</span>}
      </div>
    </div>
  );
};

// Rank badge component
const RankBadge: React.FC<{ rank: string; label: string; color: string; frame: number; startFrame: number; active?: boolean }> = ({
  rank, label, color, frame, startFrame, active
}) => {
  const opacity = fadeIn(frame, startFrame, 12);
  const scale = spring({ fps: FPS, frame: Math.max(0, frame - startFrame), config: { damping: 10, stiffness: 200 } });

  return (
    <div style={{
      opacity,
      transform: `scale(${scale})`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 10,
    }}>
      <div style={{
        width: active ? 110 : 80,
        height: active ? 110 : 80,
        borderRadius: active ? 22 : 16,
        background: active ? color : `${color}20`,
        border: `3px solid ${color}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: active ? 44 : 32,
        boxShadow: active ? `0 0 30px ${color}80` : 'none',
      }}>
        ⚔️
      </div>
      <div style={{
        fontSize: active ? 20 : 16,
        color: active ? color : `${YOROI.white}50`,
        fontFamily: 'system-ui, sans-serif',
        fontWeight: active ? 700 : 400,
      }}>
        {rank}
      </div>
      <div style={{
        fontSize: 13,
        color: active ? `${YOROI.white}80` : `${YOROI.white}30`,
      }}>
        {label}
      </div>
    </div>
  );
};

// ---- Intro hook (0–2s / 0–60) ----
const IntroScene: React.FC<{ frame: number }> = ({ frame }) => {
  const line1 = fadeIn(frame, 5, 15);
  const line2 = fadeIn(frame, 20, 15);
  const line3 = fadeIn(frame, 35, 15);

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: '0 70px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        <div style={{ opacity: line1, fontSize: 48, color: YOROI.textMuted, fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>
          Tu fais du BJJ 🥋
        </div>
        <div style={{ opacity: line2, fontSize: 48, color: YOROI.textMuted, fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>
          Tu liftes. Tu cours. 💪
        </div>
        <div style={{
          opacity: line3,
          fontSize: 64,
          fontWeight: 900,
          color: YOROI.volt,
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
          textShadow: `0 0 30px ${YOROI.volt}`,
        }}>
          Y'a une app pour toi.
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---- Stats scene (2s–5s / 60–150) ----
const StatsScene: React.FC<{ frame: number }> = ({ frame }) => {
  const localFrame = frame - 60;
  const titleOp = fadeIn(localFrame, 0, 20);

  return (
    <AbsoluteFill style={{ justifyContent: 'center', padding: '0 50px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {/* Title */}
        <div style={{
          opacity: titleOp,
          fontSize: 36,
          color: YOROI.teal,
          fontFamily: 'system-ui, sans-serif',
          letterSpacing: 3,
          textTransform: 'uppercase',
          fontWeight: 700,
          textAlign: 'center',
          marginBottom: 10,
        }}>
          📊 TES STATS EN TEMPS RÉEL
        </div>

        {/* Stats grid */}
        <div style={{ display: 'flex', gap: 20 }}>
          <StatCard label="Poids" value="82.4" unit="kg" color={YOROI.teal} frame={localFrame} startFrame={15} />
          <StatCard label="Muscle" value="43.2" unit="%" color={YOROI.volt} frame={localFrame} startFrame={25} />
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          <StatCard label="Graisse" value="14.8" unit="%" color="#FF6B9D" frame={localFrame} startFrame={35} />
          <StatCard label="Séances" value="148" color="#FFD700" frame={localFrame} startFrame={45} />
        </div>

        {/* XP bar */}
        <div style={{
          opacity: fadeIn(localFrame, 55, 15),
          background: YOROI.bgCard,
          borderRadius: 20,
          padding: '20px 28px',
          border: `1px solid ${YOROI.volt}30`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 24, color: YOROI.white, fontFamily: 'system-ui, sans-serif', fontWeight: 700 }}>
              XP Total
            </div>
            <div style={{ fontSize: 24, color: YOROI.volt, fontFamily: 'system-ui, sans-serif', fontWeight: 700 }}>
              {Math.round(interpolate(localFrame, [55, 85], [0, 4820], { extrapolateRight: 'clamp' }))} / 5000
            </div>
          </div>
          <div style={{ background: `${YOROI.white}15`, borderRadius: 10, height: 16, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${interpolate(localFrame, [55, 85], [0, 96], { extrapolateRight: 'clamp' })}%`,
              background: `linear-gradient(to right, ${YOROI.volt}, ${YOROI.neonGreen})`,
              borderRadius: 10,
              boxShadow: `0 0 15px ${YOROI.volt}80`,
            }} />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---- BJJ scene (5s–8s / 150–240) ----
const BJJScene: React.FC<{ frame: number }> = ({ frame }) => {
  const localFrame = frame - 150;
  const titleOp = fadeIn(localFrame, 0, 20);

  const techniques = [
    { name: 'Guard Passé', count: 23, color: YOROI.volt },
    { name: 'Armbar', count: 41, color: '#FF6B9D' },
    { name: 'RNC', count: 18, color: YOROI.teal },
    { name: 'Triangle', count: 29, color: '#FFD700' },
  ];

  return (
    <AbsoluteFill style={{ justifyContent: 'center', padding: '0 50px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        <div style={{
          opacity: titleOp,
          fontSize: 36,
          color: YOROI.volt,
          fontFamily: 'system-ui, sans-serif',
          letterSpacing: 3,
          textTransform: 'uppercase',
          fontWeight: 700,
          textAlign: 'center',
        }}>
          🥋 TON CARNET BJJ/MMA
        </div>

        {techniques.map((t, i) => {
          const barWidth = interpolate(localFrame, [20 + i * 12, 50 + i * 12], [0, (t.count / 50) * 100], { extrapolateRight: 'clamp' });
          return (
            <div key={t.name} style={{
              opacity: fadeIn(localFrame, 15 + i * 12, 15),
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 30, color: YOROI.white, fontFamily: 'system-ui, sans-serif', fontWeight: 700 }}>{t.name}</div>
                <div style={{ fontSize: 30, color: t.color, fontFamily: 'system-ui, sans-serif', fontWeight: 700 }}>{Math.round(interpolate(localFrame, [20 + i * 12, 50 + i * 12], [0, t.count], { extrapolateRight: 'clamp' }))}×</div>
              </div>
              <div style={{ background: `${YOROI.white}10`, borderRadius: 8, height: 12 }}>
                <div style={{
                  width: `${barWidth}%`,
                  height: '100%',
                  background: t.color,
                  borderRadius: 8,
                  boxShadow: `0 0 10px ${t.color}80`,
                }} />
              </div>
            </div>
          );
        })}

        <div style={{
          opacity: fadeIn(localFrame, 70, 15),
          textAlign: 'center',
          fontSize: 26,
          color: YOROI.textMuted,
          fontFamily: 'system-ui, sans-serif',
        }}>
          Tes techniques. Ta progression. Ton historique.
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---- Ranks scene (8s–11s / 240–330) ----
const RanksScene: React.FC<{ frame: number }> = ({ frame }) => {
  const localFrame = frame - 240;
  const titleOp = fadeIn(localFrame, 0, 20);

  const ranks = [
    { rank: 'ASHIGARU', label: 'Lv.1', color: '#CD7F32' },
    { rank: 'SAMURAI', label: 'Lv.2', color: '#C0C0C0' },
    { rank: 'HATAMOTO', label: 'Lv.3', color: '#FFD700' },
    { rank: 'DAIMYŌ', label: 'Lv.4', color: YOROI.volt },
  ];

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: '0 50px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 40, alignItems: 'center', width: '100%' }}>
        <div style={{
          opacity: titleOp,
          fontSize: 36,
          color: '#FFD700',
          fontFamily: 'system-ui, sans-serif',
          letterSpacing: 3,
          textTransform: 'uppercase',
          fontWeight: 700,
          textAlign: 'center',
          textShadow: '0 0 20px #FFD70080',
        }}>
          🏆 SYSTÈME DE RANGS
        </div>

        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', alignItems: 'flex-end' }}>
          {ranks.map((r, i) => (
            <RankBadge
              key={r.rank}
              {...r}
              frame={localFrame}
              startFrame={15 + i * 15}
              active={i === 2}
            />
          ))}
        </div>

        <div style={{
          opacity: fadeIn(localFrame, 70, 20),
          textAlign: 'center',
          padding: '0 40px',
        }}>
          <div style={{
            fontSize: 44,
            fontWeight: 900,
            color: YOROI.white,
            fontFamily: 'system-ui, sans-serif',
          }}>
            Gravis les rangs.
          </div>
          <div style={{
            fontSize: 44,
            fontWeight: 900,
            color: '#FFD700',
            fontFamily: 'system-ui, sans-serif',
            textShadow: '0 0 20px #FFD70080',
          }}>
            Deviens Daimyō. ⚔️
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---- Privacy scene (11s–13s / 330–390) ----
const PrivacyScene: React.FC<{ frame: number }> = ({ frame }) => {
  const localFrame = frame - 330;

  const items = [
    { icon: '🔒', text: 'Données stockées sur TON téléphone', delay: 10 },
    { icon: '☁️', text: 'Zéro cloud — zéro serveur', delay: 22 },
    { icon: '👁️', text: 'Personne ne lit tes données', delay: 34 },
    { icon: '✅', text: 'Open source & transparent', delay: 46 },
  ];

  return (
    <AbsoluteFill style={{ justifyContent: 'center', padding: '0 60px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
        <div style={{
          opacity: fadeIn(localFrame, 0, 20),
          fontSize: 36,
          color: '#7C3AED',
          fontFamily: 'system-ui, sans-serif',
          letterSpacing: 3,
          textTransform: 'uppercase',
          fontWeight: 700,
          textAlign: 'center',
          textShadow: '0 0 20px #7C3AED80',
        }}>
          🔒 100% PRIVÉ
        </div>

        {items.map((item) => (
          <div key={item.text} style={{
            opacity: fadeIn(localFrame, item.delay, 15),
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            background: '#7C3AED12',
            border: '1px solid #7C3AED40',
            borderRadius: 20,
            padding: '20px 28px',
          }}>
            <div style={{ fontSize: 40 }}>{item.icon}</div>
            <div style={{ fontSize: 30, color: YOROI.white, fontFamily: 'system-ui, sans-serif', lineHeight: 1.3 }}>
              {item.text}
            </div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ---- Final CTA (13s–15s / 390–450) ----
const FinalCTA: React.FC<{ frame: number }> = ({ frame }) => {
  const localFrame = frame - 390;
  const logoScale = spring({ fps: FPS, frame: localFrame, config: { damping: 12, stiffness: 120 } });
  const opacity = fadeIn(localFrame, 0, 20);
  const btnScale = spring({ fps: FPS, frame: Math.max(0, localFrame - 25), config: { damping: 8, stiffness: 150 } });
  const btnOp = fadeIn(localFrame, 25, 15);

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 36,
        opacity,
        transform: `scale(${logoScale})`,
      }}>
        <Img
          src={staticFile('assets/mascot.png')}
          style={{ width: 220, height: 220, objectFit: 'contain' }}
        />

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 80, fontWeight: 900, color: YOROI.white, fontFamily: 'system-ui, sans-serif', letterSpacing: 10 }}>
            YOROI
          </div>
          <div style={{ fontSize: 24, color: YOROI.volt, fontFamily: 'system-ui, sans-serif', letterSpacing: 4 }}>
            🎌 L'ARMURE DE TON CORPS
          </div>
        </div>

        <div style={{
          opacity: btnOp,
          transform: `scale(${btnScale})`,
          background: YOROI.volt,
          paddingTop: 24,
          paddingBottom: 24,
          paddingLeft: 60,
          paddingRight: 60,
          borderRadius: 100,
          boxShadow: `0 0 40px ${YOROI.volt}60`,
        }}>
          <div style={{
            fontSize: 32,
            fontWeight: 900,
            color: YOROI.bgBlack,
            fontFamily: 'system-ui, sans-serif',
          }}>
            📲 GRATUIT sur App Store
          </div>
        </div>

        <div style={{
          opacity: fadeIn(localFrame, 40, 15),
          fontSize: 24,
          color: YOROI.textMuted,
          fontFamily: 'system-ui, sans-serif',
          letterSpacing: 2,
          textAlign: 'center',
        }}>
          #YOROI #BJJ #MMA #GracieBarrra #Fitness
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ============================================================
// MAIN COMPOSITION
// ============================================================
export const YoroiFeatures: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{
      background: `radial-gradient(ellipse at 50% 30%, #1A1A2E 0%, ${YOROI.bgBlack} 60%)`,
    }}>
      {/* Watermark */}
      <div style={{
        position: 'absolute',
        top: 60,
        right: 50,
        opacity: 0.25,
        fontSize: 20,
        color: YOROI.volt,
        fontFamily: 'system-ui, sans-serif',
        fontWeight: 700,
        letterSpacing: 4,
        zIndex: 100,
      }}>
        YOROI 鎧
      </div>

      <Sequence from={0} durationInFrames={60}>
        <IntroScene frame={frame} />
      </Sequence>

      <Sequence from={60} durationInFrames={90}>
        <StatsScene frame={frame} />
      </Sequence>

      <Sequence from={150} durationInFrames={90}>
        <BJJScene frame={frame} />
      </Sequence>

      <Sequence from={240} durationInFrames={90}>
        <RanksScene frame={frame} />
      </Sequence>

      <Sequence from={330} durationInFrames={60}>
        <PrivacyScene frame={frame} />
      </Sequence>

      <Sequence from={390} durationInFrames={60}>
        <FinalCTA frame={frame} />
      </Sequence>
    </AbsoluteFill>
  );
};
