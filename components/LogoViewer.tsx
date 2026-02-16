import React from 'react';
import {
  Modal,
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { X } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

interface LogoViewerProps {
  visible: boolean;
  onClose: () => void;
}

export const LogoViewer: React.FC<LogoViewerProps> = ({ visible, onClose }) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <X size={28} color="#FFF" />
        </TouchableOpacity>

        <Image
          source={require('../assets/logo d\'app/logo1.png')}
          style={styles.fullImage}
          resizeMode="contain"
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  fullImage: {
    width: width * 0.98,
    height: height * 0.85,
  },
});
