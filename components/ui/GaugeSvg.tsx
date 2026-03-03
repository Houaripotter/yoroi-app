import React from 'react';
import Svg, { Path, Circle, Text as SvgText } from 'react-native-svg';

interface GaugeSvgProps {
  /** Current value */
  value: number;
  /** Min value of the range */
  min: number;
  /** Max value of the range */
  max: number;
  /** Reference numbers to show along the arc */
  refNumbers?: number[];
  /** Segment colors (from left to right). Default: yellow-to-red */
  segmentColors?: string[];
  /** Width of the SVG */
  width?: number;
  /** Height of the SVG */
  height?: number;
  /** Text color for numbers */
  textColor?: string;
  /** Muted text color for non-active numbers */
  mutedColor?: string;
}

export const GaugeSvg: React.FC<GaugeSvgProps> = ({
  value,
  min,
  max,
  refNumbers,
  segmentColors = ['#FACC15', '#F59E0B', '#F97316', '#EA580C', '#DC2626'],
  width = 145,
  height = 82,
  textColor = '#1A2E3B',
  mutedColor = '#9BB0BF',
}) => {
  const R = 42;
  const CX = width / 2;
  const CY = height - 18;
  const SW = 11;
  const numR = R + 16;
  const range = max - min || 1;
  const progress = Math.max(0, Math.min(1, (value - min) / range));

  const arcPt = (deg: number) => ({
    x: CX + R * Math.cos((deg * Math.PI) / 180),
    y: CY - R * Math.sin((deg * Math.PI) / 180),
  });

  const numPt = (deg: number) => ({
    x: CX + numR * Math.cos((deg * Math.PI) / 180),
    y: CY - numR * Math.sin((deg * Math.PI) / 180),
  });

  const arcD = (from: number, to: number) => {
    const p1 = arcPt(from);
    const p2 = arcPt(to);
    return `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} A ${R} ${R} 0 0 1 ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  };

  // Build segments
  const segCount = segmentColors.length;
  const segAngle = 180 / segCount;
  const segments = segmentColors.map((color, i) => ({
    from: 180 - i * segAngle,
    to: 180 - (i + 1) * segAngle + 1,
    color,
  }));

  // Current position dot
  const angle = 180 - progress * 180;
  const dot = arcPt(angle);

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Arc segments */}
      {segments.map((seg, i) => (
        <Path
          key={i}
          d={arcD(seg.from, seg.to)}
          stroke={seg.color}
          strokeWidth={SW}
          fill="none"
          strokeLinecap={i === 0 || i === segments.length - 1 ? 'round' : 'butt'}
        />
      ))}

      {/* Reference numbers along the arc */}
      {refNumbers?.map((num) => {
        const a = 180 - ((num - min) / range) * 180;
        const pt = numPt(a);
        const isCurrent = Math.abs(num - value) < (range * 0.05);
        return (
          <SvgText
            key={num}
            x={pt.x}
            y={pt.y + (isCurrent ? 5 : 4)}
            textAnchor="middle"
            fontSize={isCurrent ? 13 : 9}
            fontWeight={isCurrent ? '900' : '600'}
            fill={isCurrent ? textColor : mutedColor}
          >
            {num}
          </SvgText>
        );
      })}

      {/* Current value big at top */}
      <SvgText
        x={CX}
        y={CY - numR + 2}
        textAnchor="middle"
        fontSize={15}
        fontWeight="900"
        fill={textColor}
      >
        {value}
      </SvgText>

      {/* Dot indicator */}
      <Circle
        cx={dot.x}
        cy={dot.y}
        r={6}
        fill="#FFF"
        stroke={textColor}
        strokeWidth={3}
      />
    </Svg>
  );
};

export default GaugeSvg;
