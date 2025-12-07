import React from 'react';
import Svg, { Path } from 'react-native-svg';

const LogoColor = "#06b6d4";

const YoroiLogo = ({ width = 100, height = 100 }) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
       {/* Casque */}
       <Path 
         fill={LogoColor} 
         opacity={0.8} 
         d="M12 2L3 7V13C3 17.4183 6.58172 21 11 21H13C17.4183 21 21 17.4183 21 13V7L12 2ZM12 4.23607L19 8.125V13C19 16.3137 16.3137 19 13 19H11C7.68629 19 5 16.3137 5 13V8.125L12 4.23607Z" 
       />
       {/* Forme centrale en Y */}
       <Path 
         fill={LogoColor} 
         d="M12 6L15 11H13V16H11V11H9L12 6Z" 
       />
    </Svg>
  );
};
export default YoroiLogo;