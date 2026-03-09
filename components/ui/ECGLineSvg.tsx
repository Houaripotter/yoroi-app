import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface ECGLineSvgProps {
  width: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
  cycles?: number;
}

export const ECGLineSvg: React.FC<ECGLineSvgProps> = ({
  width: w,
  height: h = 45,
  color = '#EC4899',
  strokeWidth: sw = 2,
  cycles = 3,
}) => {
  const mid = h * 0.5;
  const cw = w / (cycles - 0.5);
  let d = `M 0 ${mid}`;

  for (let c = 0; c < cycles; c++) {
    const x = c * cw;
    d += ` L ${(x + cw * 0.08).toFixed(1)} ${mid}`;
    d += ` L ${(x + cw * 0.16).toFixed(1)} ${(mid - 5).toFixed(1)}`;
    d += ` L ${(x + cw * 0.24).toFixed(1)} ${mid}`;
    d += ` L ${(x + cw * 0.3).toFixed(1)} ${(mid + 2).toFixed(1)}`;
    d += ` L ${(x + cw * 0.36).toFixed(1)} ${(mid - 22).toFixed(1)}`;
    d += ` L ${(x + cw * 0.42).toFixed(1)} ${(mid + 14).toFixed(1)}`;
    d += ` L ${(x + cw * 0.48).toFixed(1)} ${mid}`;
    d += ` L ${(x + cw * 0.62).toFixed(1)} ${(mid - 4).toFixed(1)}`;
    d += ` L ${(x + cw * 0.72).toFixed(1)} ${mid}`;
  }
  d += ` L ${w} ${mid}`;

  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <Path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export default ECGLineSvg;
