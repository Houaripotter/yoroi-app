import Foundation
import UIKit
import WidgetKit
import ActivityKit
internal import React

// Module natif YoroiWidgets (meme nom et memes fonctions que le module Android) :
//  setSnapshot(json)          ecrit l'instantane v1 (le meme que la montre) dans l'App Group
//  setSceneImage(uri)         copie une version reduite (900 px de large, jpg) de la scene d'Accueil
//  setPersonnageImage(uri)    copie ton personnage (meme image que l'Accueil, 600 px de haut, png transparent)
//  setStyle(style)            style des widgets : "A" Nuit de lanternes (par defaut), "B" Rouleau et encre, "C" Armure laquee
//  setSeason(saison)          decoration de saison des widgets : "halloween", "noel" ou "" (aucune, ou decorations coupees)
//  getPendingActions()        renvoie la file des actions faites depuis un widget (JSON tableau)
//  clearPendingActions(ids)   retire de la file les actions appliquees par l'app
//  reload()                   demande a iOS de redessiner les widgets
//  getPendingLink()           lien laisse par iOS (demarrage a froid, Centre de controle), lu puis efface
//  startChrono / updateChrono / stopChrono   Live Activity du chrono rounds

@objc(YoroiWidgets)
class YoroiWidgetsModule: NSObject {

  @objc static func requiresMainQueueSetup() -> Bool { false }

  private let file = DispatchQueue(label: "com.houari.yoroi.widgets")

  // MARK: Instantane et file d'actions

  @objc
  func setSnapshot(_ json: NSString, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard GroupeYoroi.defauts != nil else {
      resolve(false)
      return
    }
    let texte = json as String
    file.async {
      GroupeYoroi.ecrireInstantaneJSON(texte)
      resolve(true)
    }
  }

  @objc
  func getPendingActions(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    file.async {
      let liste = GroupeYoroi.lireActions()
      if let data = try? JSONSerialization.data(withJSONObject: liste, options: []), let texte = String(data: data, encoding: .utf8) {
        resolve(texte)
      } else {
        resolve("[]")
      }
    }
  }

  @objc
  func clearPendingActions(_ ids: NSArray, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    let set = Set(ids.compactMap { $0 as? String })
    file.async {
      GroupeYoroi.retirerActions(set)
      resolve(true)
    }
  }

  /// Lien de widget laisse dans l'App Group (demarrage a froid, Centre de controle), lu une seule fois
  @objc
  func getPendingLink(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    file.async {
      if let lien = GroupeYoroi.prendreLien() {
        resolve(lien)
      } else {
        resolve(nil)
      }
    }
  }

  @objc
  func reload(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      WidgetCenter.shared.reloadAllTimelines()
      if #available(iOS 18.0, *) {
        ControlCenter.shared.reloadAllControls()
      }
      resolve(true)
    }
  }

  // MARK: Scene d'Accueil

  @objc
  func setSceneImage(_ uri: NSString, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    let texte = (uri as String).trimmingCharacters(in: .whitespacesAndNewlines)
    guard let cible = GroupeYoroi.urlScene else {
      resolve(false)
      return
    }
    if texte.isEmpty {
      file.async {
        try? FileManager.default.removeItem(at: cible)
        WidgetCenter.shared.reloadAllTimelines()
        resolve(true)
      }
      return
    }
    guard let source = YoroiWidgetsModule.urlSource(texte) else {
      resolve(false)
      return
    }
    // la scene sert de fond a tous les widgets du style A : tous sont redessines
    lireDonnees(source) { data in
      guard let data, let image = UIImage(data: data), let jpg = YoroiWidgetsModule.reduire(image, largeur: 900) else {
        resolve(false)
        return
      }
      do {
        try jpg.write(to: cible, options: .atomic)
        WidgetCenter.shared.reloadAllTimelines()
        resolve(true)
      } catch {
        resolve(false)
      }
    }
  }

  // MARK: Personnage (style C)

  /// Ton personnage, la meme image que l'Accueil (sans rang ni XP) ; uri vide : le retire (« Sans personnage »)
  @objc
  func setPersonnageImage(_ uri: NSString, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    let texte = (uri as String).trimmingCharacters(in: .whitespacesAndNewlines)
    guard let cible = GroupeYoroi.urlPersonnage else {
      resolve(false)
      return
    }
    if texte.isEmpty {
      file.async {
        try? FileManager.default.removeItem(at: cible)
        WidgetCenter.shared.reloadAllTimelines()
        resolve(true)
      }
      return
    }
    guard let source = YoroiWidgetsModule.urlSource(texte) else {
      resolve(false)
      return
    }
    lireDonnees(source) { data in
      guard let data, let image = UIImage(data: data), let png = YoroiWidgetsModule.reduirePNG(image, hauteur: 600) else {
        resolve(false)
        return
      }
      do {
        try png.write(to: cible, options: .atomic)
        WidgetCenter.shared.reloadAllTimelines()
        resolve(true)
      } catch {
        resolve(false)
      }
    }
  }

  // MARK: Style des widgets

  @objc
  func setStyle(_ style: NSString, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard GroupeYoroi.defauts != nil else {
      resolve(false)
      return
    }
    let s = style as String
    file.async {
      GroupeYoroi.ecrireStyle(s)
      DispatchQueue.main.async {
        WidgetCenter.shared.reloadAllTimelines()
        resolve(true)
      }
    }
  }

  // MARK: Decoration de saison

  /// "halloween", "noel" ou "" : calculee par l'app (lib/v2/widgets/saison.ts), vide si les decorations sont coupees
  @objc
  func setSeason(_ saison: NSString, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard GroupeYoroi.defauts != nil else {
      resolve(false)
      return
    }
    let s = saison as String
    file.async {
      GroupeYoroi.ecrireSaison(s)
      DispatchQueue.main.async {
        WidgetCenter.shared.reloadAllTimelines()
        resolve(true)
      }
    }
  }

  // MARK: Lecture des images

  /// Fichier, http (Metro en developpement) ou chemin relatif au bundle de l'app
  private static func urlSource(_ texte: String) -> URL? {
    if texte.hasPrefix("/") { return URL(fileURLWithPath: texte) }
    if let u = URL(string: texte), u.scheme != nil { return u }
    // chemin relatif a l'app (image embarquee dans le bundle)
    return Bundle.main.bundleURL.appendingPathComponent(texte)
  }

  private func lireDonnees(_ source: URL, _ fin: @escaping (Data?) -> Void) {
    if source.isFileURL {
      file.async { fin(try? Data(contentsOf: source)) }
    } else {
      // en developpement, Metro sert les images en http
      URLSession.shared.dataTask(with: source) { data, _, _ in
        self.file.async { fin(data) }
      }.resume()
    }
  }

  /// Version reduite a la hauteur donnee (jamais agrandie), png transparent
  private static func reduirePNG(_ image: UIImage, hauteur: CGFloat) -> Data? {
    let w = image.size.width * image.scale
    let h = image.size.height * image.scale
    guard w > 0, h > 0 else { return nil }
    let f = min(1, hauteur / h)
    let taille = CGSize(width: (w * f).rounded(), height: (h * f).rounded())
    let format = UIGraphicsImageRendererFormat()
    format.scale = 1
    format.opaque = false
    let rendu = UIGraphicsImageRenderer(size: taille, format: format)
    let petite = rendu.image { _ in
      image.draw(in: CGRect(origin: .zero, size: taille))
    }
    return petite.pngData()
  }

  /// Version reduite a la largeur donnee (jamais agrandie), jpg qualite 0,8
  private static func reduire(_ image: UIImage, largeur: CGFloat) -> Data? {
    let w = image.size.width * image.scale
    let h = image.size.height * image.scale
    guard w > 0, h > 0 else { return nil }
    let f = min(1, largeur / w)
    let taille = CGSize(width: (w * f).rounded(), height: (h * f).rounded())
    let format = UIGraphicsImageRendererFormat()
    format.scale = 1
    format.opaque = true
    let rendu = UIGraphicsImageRenderer(size: taille, format: format)
    let petite = rendu.image { _ in
      image.draw(in: CGRect(origin: .zero, size: taille))
    }
    return petite.jpegData(compressionQuality: 0.8)
  }

  // MARK: Live Activity du chrono

  /// {titre, phase, libelle, round, rounds, debutMs, finMs, figeS, enPause, monte}
  private struct ChronoJS {
    var titre: String
    var phase: String
    var libelle: String
    var round: Int
    var rounds: Int
    var debut: Date
    var fin: Date
    var figeS: Int
    var enPause: Bool
    var monte: Bool

    init?(_ texte: String) {
      guard let data = texte.data(using: .utf8),
            let o = (try? JSONSerialization.jsonObject(with: data, options: [])) as? [String: Any] else { return nil }
      func nombre(_ k: String) -> Double? { (o[k] as? NSNumber)?.doubleValue }
      titre = (o["titre"] as? String) ?? NSLocalizedString("Chrono", comment: "")
      phase = (o["phase"] as? String) ?? "effort"
      libelle = (o["libelle"] as? String) ?? ""
      round = Int(nombre("round") ?? 0)
      rounds = Int(nombre("rounds") ?? 0)
      let maintenant = Date()
      let d = nombre("debutMs").map { Date(timeIntervalSince1970: $0 / 1000) } ?? maintenant
      let f = nombre("finMs").map { Date(timeIntervalSince1970: $0 / 1000) } ?? maintenant
      debut = d
      fin = f < d ? d : f
      figeS = max(0, Int(nombre("figeS") ?? 0))
      enPause = (o["enPause"] as? Bool) ?? false
      monte = (o["monte"] as? Bool) ?? false
    }

    @available(iOS 16.1, *)
    var etat: ChronoAttributs.ContentState {
      ChronoAttributs.ContentState(phase: phase, libelle: libelle, round: round, rounds: rounds, debut: debut, fin: fin, enPause: enPause, figeS: figeS, monte: monte)
    }
  }

  @objc
  func startChrono(_ json: NSString, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard #available(iOS 16.2, *) else {
      resolve(false)
      return
    }
    guard ActivityAuthorizationInfo().areActivitiesEnabled, let c = ChronoJS(json as String) else {
      resolve(false)
      return
    }
    Task {
      for a in Activity<ChronoAttributs>.activities {
        await a.end(nil, dismissalPolicy: .immediate)
      }
      do {
        _ = try Activity<ChronoAttributs>.request(
          attributes: ChronoAttributs(titre: c.titre),
          content: ActivityContent(state: c.etat, staleDate: nil),
          pushType: nil
        )
        resolve(true)
      } catch {
        resolve(false)
      }
    }
  }

  @objc
  func updateChrono(_ json: NSString, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard #available(iOS 16.2, *) else {
      resolve(false)
      return
    }
    guard let c = ChronoJS(json as String) else {
      resolve(false)
      return
    }
    Task {
      let liste = Activity<ChronoAttributs>.activities
      guard !liste.isEmpty else {
        resolve(false)
        return
      }
      for a in liste {
        await a.update(ActivityContent(state: c.etat, staleDate: nil))
      }
      resolve(true)
    }
  }

  @objc
  func stopChrono(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard #available(iOS 16.2, *) else {
      resolve(false)
      return
    }
    Task {
      for a in Activity<ChronoAttributs>.activities {
        await a.end(nil, dismissalPolicy: .immediate)
      }
      resolve(true)
    }
  }
}
