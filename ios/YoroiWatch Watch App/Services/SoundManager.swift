// ============================================
// YOROI WATCH - Sound Manager
// Gère la lecture des sons Gong et Beep
// ============================================

import Foundation
import AVFoundation

class SoundManager {
    static let shared = SoundManager()
    private var player: AVAudioPlayer?
    
    func playSound(named soundName: String) {
        // soundName sans extension
        guard let url = Bundle.main.url(forResource: soundName, withExtension: "mp3") else {
            print("❌ Son \(soundName).mp3 non trouvé")
            return
        }
        
        do {
            player = try AVAudioPlayer(contentsOf: url)
            player?.prepareToPlay()
            player?.play()
        } catch {
            print("❌ Erreur lecture son: \(error.localizedDescription)")
        }
    }
}
