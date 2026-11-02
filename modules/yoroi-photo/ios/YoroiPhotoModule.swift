// YoroiPhotoModule.swift : le pont Expo entre JavaScript et AnalyseVision.swift.
// iPhone, iPad et Mac (Designed for iPad). Aucune permission, aucun reseau.

import ExpoModulesCore
import UIKit

public class YoroiPhotoModule: Module {
  public func definition() -> ModuleDefinition {
    Name("YoroiPhoto")

    Function("capacites") { () -> [String: Any] in
      return [
        "visages": true,
        "detourage": AnalyseVision.detourageDisponible,
        "plateforme": YoroiPhotoModule.plateforme,
        "moteur": AnalyseVision.moteur,
        "versionModele": AnalyseVision.versionModele,
      ]
    }

    // File d'attente du module (pas le fil principal) : l'ecran ne se bloque pas pendant l'analyse
    AsyncFunction("analyserPhoto") { (uri: String) -> [String: Any] in
      let dossier = self.appContext?.config.cacheDirectory?
        .appendingPathComponent("cartes_tmp", isDirectory: true)
        .appendingPathComponent("masques", isDirectory: true)
      var d = AnalyseVision.analyser(uri: uri, dossierMasques: dossier).dictionnaire()
      d["plateforme"] = YoroiPhotoModule.plateforme
      return d
    }
  }

  /// "macos" pour l'app iPad sur Mac, "ipados" sur iPad, "ios" sur iPhone
  static let plateforme: String = {
    if ProcessInfo.processInfo.isiOSAppOnMac { return "macos" }
    let lire = { UIDevice.current.userInterfaceIdiom == .pad }
    let pad = Thread.isMainThread ? lire() : DispatchQueue.main.sync(execute: lire)
    return pad ? "ipados" : "ios"
  }()
}
