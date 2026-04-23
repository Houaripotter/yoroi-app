// TorchModule.swift — contrôle du flash/torche de l'iPhone depuis JS
import AVFoundation
import Foundation

@objc(TorchModule)
class TorchModule: NSObject {

  @objc static func requiresMainQueueSetup() -> Bool { return false }

  /// Allume ou éteint le flash
  @objc func setTorch(_ on: Bool) {
    guard let device = AVCaptureDevice.default(for: .video),
          device.hasTorch else { return }
    do {
      try device.lockForConfiguration()
      device.torchMode = on ? .on : .off
      device.unlockForConfiguration()
    } catch {
      // Appareil sans torche ou déjà en cours d'utilisation
    }
  }

  /// Flash stroboscopique : allume/éteint rapidement n fois
  @objc func strobe(_ count: Int, interval: Double) {
    guard let device = AVCaptureDevice.default(for: .video),
          device.hasTorch else { return }
    var i = 0
    Timer.scheduledTimer(withTimeInterval: interval, repeats: true) { timer in
      do {
        try device.lockForConfiguration()
        device.torchMode = (i % 2 == 0) ? .on : .off
        device.unlockForConfiguration()
      } catch {}
      i += 1
      if i >= count * 2 {
        timer.invalidate()
        // S'assurer que le flash est éteint à la fin
        try? device.lockForConfiguration()
        device.torchMode = .off
        device.unlockForConfiguration()
      }
    }
  }
}
