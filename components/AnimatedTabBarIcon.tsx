import { View } from 'react-native';

interface AnimatedTabBarIconProps {
  focused: boolean;
  children: React.ReactNode;
}

export function AnimatedTabBarIcon({ focused, children }: AnimatedTabBarIconProps) {
  return <View>{children}</View>;
}
