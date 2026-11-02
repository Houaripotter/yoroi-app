// AnalyseVision.swift : le coeur du module photo YOROI, pour iPhone, iPad et Mac (Designed for iPad).
// Sans UIKit ni Expo : ce meme fichier est compile par l'app ET par le banc macOS (banc/macos/), pour que
// les deux mesurent exactement la meme chose : memes requetes, memes revisions, meme reduction, meme masque.
//
// 1. La photo est lue depuis un fichier local (file://), jamais depuis internet.
// 2. Elle est redressee (orientation EXIF) et reduite a tailleMax px sur le grand cote (1024 par defaut), en une passe (ImageIO).
// 3. Visages : VNDetectFaceRectanglesRequest, revision 3 (iOS 15, macOS 12).
// 4. Detourage : VNGeneratePersonInstanceMaskRequest, revision 1 (iOS 17, macOS 14), toutes les personnes en un masque.
//    Avant iOS 17 ou macOS 14 : visages seuls. En cas d'echec : visages seuls. Jamais d'exception vers l'app.
// 5. Le masque est ecrit en PNG gris dans le dossier donne (cartes_tmp/masques/), et rendu en octets pour le critere A+.

import Foundation
import CoreGraphics
import CoreImage
import CoreVideo
import ImageIO
import Vision

public enum AnalyseVision {
  /// Grand cote de la copie analysee, par defaut (le meme que TAILLE_ANALYSE_DEFAUT dans index.ts)
  public static let tailleDefaut = 1024
  /// Bornes de la taille demandee (TAILLE_ANALYSE_MIN et TAILLE_ANALYSE_MAX dans index.ts)
  public static let tailleMin = 512
  public static let tailleMaxPermise = 2048

  /// Une taille demandee, bornee ; la taille par defaut sans demande
  public static func taille(_ demandee: Int?) -> Int {
    guard let t = demandee else { return tailleDefaut }
    return min(tailleMaxPermise, max(tailleMin, t))
  }

  /// Memoire residente de l'app, en Mo : maintenant, et le pic depuis le lancement (mach_task_basic_info)
  public static func memoireMo() -> (actuelle: Double, pic: Double)? {
    var info = mach_task_basic_info()
    var n = mach_msg_type_number_t(MemoryLayout<mach_task_basic_info>.size / MemoryLayout<natural_t>.size)
    let kr = withUnsafeMutablePointer(to: &info) {
      $0.withMemoryRebound(to: integer_t.self, capacity: Int(n)) {
        task_info(mach_task_self_, task_flavor_t(MACH_TASK_BASIC_INFO), $0, &n)
      }
    }
    guard kr == KERN_SUCCESS else { return nil }
    return (Double(info.resident_size) / 1_048_576, Double(info.resident_size_max) / 1_048_576)
  }
  public static let moteur = "apple-vision"

  public static var detourageDisponible: Bool {
    if #available(iOS 17.0, macOS 14.0, *) { return true }
    return false
  }

  public static var versionModele: String {
    detourageDisponible ? "VNDetectFaceRectanglesRequestRevision3+VNGeneratePersonInstanceMaskRequestRevision1" : "VNDetectFaceRectanglesRequestRevision3"
  }

  public struct Visage {
    public let x: Double, y: Double, w: Double, h: Double
    public let confiance: Double
    public let lacet: Double?
    public let roulis: Double?
  }

  public struct Masque {
    public let url: URL?
    public let largeur: Int
    public let hauteur: Int
    public let personnes: Int
    public let octets: Data
  }

  public struct Resultat {
    public var largeur = 0, hauteur = 0, largeurPhoto = 0, hauteurPhoto = 0
    public var visages: [Visage] = []
    public var masque: Masque?
    public var lumiere: Double?
    public var erreurs: [String] = []
    public var dureeMs = 0.0
    public var tailleMax = AnalyseVision.tailleDefaut
    public var memoireAvantMo: Double?
    public var memoireApresMo: Double?
    public var memoirePicMo: Double?

    /// La reponse pour JavaScript (YoroiPhoto.types.ts) : aucune valeur nil, une cle absente vaut null cote JS
    public func dictionnaire() -> [String: Any] {
      var d: [String: Any] = [
        "visages": visages.map { v -> [String: Any] in
          var f: [String: Any] = ["x": v.x, "y": v.y, "w": v.w, "h": v.h, "confiance": v.confiance]
          if let l = v.lacet { f["lacet"] = l }
          if let r = v.roulis { f["roulis"] = r }
          return f
        },
        "moteur": AnalyseVision.moteur,
        "versionModele": AnalyseVision.versionModele,
        "largeur": largeur, "hauteur": hauteur,
        "largeurPhoto": largeurPhoto, "hauteurPhoto": hauteurPhoto,
        "detourageDisponible": AnalyseVision.detourageDisponible,
        "erreurs": erreurs,
        "dureeMs": dureeMs,
        "tailleMax": tailleMax,
      ]
      if let l = lumiere { d["lumiere"] = l }
      if let m = memoireAvantMo { d["memoireAvantMo"] = m }
      if let m = memoireApresMo { d["memoireApresMo"] = m }
      if let m = memoirePicMo { d["memoirePicMo"] = m }
      if let m = masque {
        d["masque"] = [
          "uri": m.url?.absoluteString ?? "",
          "largeur": m.largeur, "hauteur": m.hauteur,
          "personnes": m.personnes,
          "pixels": m.octets.base64EncodedString(),
        ] as [String: Any]
      }
      return d
    }
  }

  /// Seulement un fichier local. ph://, http:// et le reste sont refuses : aucun acces reseau possible.
  static func url(depuis uri: String) -> URL? {
    if uri.hasPrefix("file://") { return URL(string: uri) ?? URL(string: uri.addingPercentEncoding(withAllowedCharacters: .urlFragmentAllowed) ?? "") }
    if uri.hasPrefix("/") { return URL(fileURLWithPath: uri) }
    return nil
  }

  /// tailleMax : grand cote de la copie analysee, borne ; 1024 sans demande. La memoire est lue hors du temps mesure.
  public static func analyser(uri: String, dossierMasques: URL?, tailleMax demandee: Int? = nil) -> Resultat {
    let avant = memoireMo()?.actuelle
    var r = analyserCopie(uri: uri, dossierMasques: dossierMasques, tailleMax: taille(demandee))
    r.memoireAvantMo = avant
    if let m = memoireMo() {
      r.memoireApresMo = m.actuelle
      r.memoirePicMo = m.pic
    }
    return r
  }

  static func analyserCopie(uri: String, dossierMasques: URL?, tailleMax: Int) -> Resultat {
    let debut = Date()
    var r = Resultat()
    r.tailleMax = tailleMax
    guard let u = url(depuis: uri) else {
      r.erreurs.append("lecture: adresse non locale")
      return r
    }
    guard let photo = chargerRedressee(u, tailleMax: r.tailleMax) else {
      r.erreurs.append("lecture: photo illisible")
      return r
    }
    r.largeur = photo.image.width
    r.hauteur = photo.image.height
    r.largeurPhoto = photo.largeurPhoto
    r.hauteurPhoto = photo.hauteurPhoto
    r.lumiere = photo.lumiere

    // l'image est deja a l'endroit : orientation .up
    let handler = VNImageRequestHandler(cgImage: photo.image, orientation: .up, options: [:])

    // 1. visages, requete a part : un echec du detourage ne doit pas faire perdre les visages
    let requeteVisages = VNDetectFaceRectanglesRequest()
    requeteVisages.revision = VNDetectFaceRectanglesRequestRevision3
    do {
      try handler.perform([requeteVisages])
      r.visages = (requeteVisages.results ?? []).map { (f: VNFaceObservation) -> Visage in
        let b = f.boundingBox // origine en bas a gauche dans Vision
        return Visage(
          x: Double(b.minX), y: Double(1 - b.maxY), w: Double(b.width), h: Double(b.height),
          confiance: Double(f.confidence),
          lacet: f.yaw.map { $0.doubleValue * 180 / .pi },
          roulis: f.roll.map { $0.doubleValue * 180 / .pi })
      }
    } catch {
      r.erreurs.append("visages: \(error.localizedDescription)")
    }

    // 2. detourage, iOS 17 et macOS 14 seulement
    if #available(iOS 17.0, macOS 14.0, *) {
      do {
        r.masque = try detourer(handler: handler, largeur: r.largeur, hauteur: r.hauteur, dossier: dossierMasques)
      } catch {
        r.erreurs.append("detourage: \(error.localizedDescription)")
      }
    }
    r.dureeMs = Date().timeIntervalSince(debut) * 1000
    return r
  }

  struct PhotoChargee {
    let image: CGImage
    let largeurPhoto: Int
    let hauteurPhoto: Int
    let lumiere: Double?
  }

  /// Lecture, redressement et reduction en une passe (miniature ImageIO avec la transformation EXIF),
  /// puis copie en RGBA 8 bits sRGB : toutes les photos (HEIC 10 bits, PNG, JPEG) arrivent pareil dans Vision.
  static func chargerRedressee(_ url: URL, tailleMax: Int) -> PhotoChargee? {
    guard let source = CGImageSourceCreateWithURL(url as CFURL, [kCGImageSourceShouldCache: false] as CFDictionary) else { return nil }
    var largeurPhoto = 0, hauteurPhoto = 0
    if let p = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any] {
      let w = (p[kCGImagePropertyPixelWidth] as? NSNumber)?.intValue ?? 0
      let h = (p[kCGImagePropertyPixelHeight] as? NSNumber)?.intValue ?? 0
      let o = (p[kCGImagePropertyOrientation] as? NSNumber)?.intValue ?? 1
      (largeurPhoto, hauteurPhoto) = o >= 5 && o <= 8 ? (h, w) : (w, h)
    }
    let options: [CFString: Any] = [
      kCGImageSourceCreateThumbnailFromImageAlways: true,
      kCGImageSourceCreateThumbnailWithTransform: true,
      kCGImageSourceThumbnailMaxPixelSize: tailleMax,
      kCGImageSourceShouldCacheImmediately: true,
    ]
    guard let mini = CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary) else { return nil }
    let w = mini.width, h = mini.height
    guard w > 0, h > 0,
          let espace = CGColorSpace(name: CGColorSpace.sRGB),
          let ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4, space: espace,
                              bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return nil }
    ctx.draw(mini, in: CGRect(x: 0, y: 0, width: w, height: h))
    guard let image = ctx.makeImage() else { return nil }
    if largeurPhoto == 0 || hauteurPhoto == 0 { (largeurPhoto, hauteurPhoto) = (w, h) }
    return PhotoChargee(image: image, largeurPhoto: largeurPhoto, hauteurPhoto: hauteurPhoto, lumiere: lumiereDuBas(ctx, w, h))
  }

  /// Luminance moyenne (Rec. 709) des 40 % du bas de la photo, de 0 a 1, un pixel sur deux
  static func lumiereDuBas(_ ctx: CGContext, _ w: Int, _ h: Int) -> Double? {
    guard let base = ctx.data else { return nil }
    let p = base.bindMemory(to: UInt8.self, capacity: w * h * 4)
    var somme = 0.0, n = 0
    // CGContext : la premiere ligne en memoire est le haut de l'image
    for y in stride(from: Int(Double(h) * 0.6), to: h, by: 2) {
      for x in stride(from: 0, to: w, by: 2) {
        let i = (y * w + x) * 4
        somme += 0.2126 * Double(p[i]) + 0.7152 * Double(p[i + 1]) + 0.0722 * Double(p[i + 2])
        n += 1
      }
    }
    return n > 0 ? somme / Double(n) / 255 : nil
  }

  @available(iOS 17.0, macOS 14.0, *)
  static func detourer(handler: VNImageRequestHandler, largeur: Int, hauteur: Int, dossier: URL?) throws -> Masque? {
    let requete = VNGeneratePersonInstanceMaskRequest()
    requete.revision = VNGeneratePersonInstanceMaskRequestRevision1
    try handler.perform([requete])
    guard let obs = requete.results?.first, !obs.allInstances.isEmpty else { return nil } // personne
    // toutes les personnes ensemble, a la taille de l'image analysee
    let tampon = try obs.generateScaledMaskForImage(forInstances: obs.allInstances, from: handler)
    guard let gris = octetsGris(tampon) else { return nil }
    let (octets, w, h) = gris
    let url = dossier.flatMap { ecrirePNG(octets, w, h, dans: $0) }
    return Masque(url: url, largeur: w, hauteur: h, personnes: obs.allInstances.count, octets: octets)
  }

  /// Le masque en octets 0 a 255, sans gestion des couleurs (aucune courbe gamma ne deplace le seuil de 0,5)
  static func octetsGris(_ tampon: CVPixelBuffer) -> (Data, Int, Int)? {
    let w = CVPixelBufferGetWidth(tampon), h = CVPixelBufferGetHeight(tampon)
    guard w > 0, h > 0 else { return nil }
    let format = CVPixelBufferGetPixelFormatType(tampon)
    CVPixelBufferLockBaseAddress(tampon, .readOnly)
    defer { CVPixelBufferUnlockBaseAddress(tampon, .readOnly) }
    guard let base = CVPixelBufferGetBaseAddress(tampon) else { return nil }
    let ligne = CVPixelBufferGetBytesPerRow(tampon)
    var out = Data(count: w * h)
    var ok = true
    out.withUnsafeMutableBytes { (dst: UnsafeMutableRawBufferPointer) in
      let d = dst.bindMemory(to: UInt8.self)
      switch format {
      case kCVPixelFormatType_OneComponent32Float:
        for y in 0..<h {
          let src = (base + y * ligne).assumingMemoryBound(to: Float32.self)
          for x in 0..<w {
            let v = src[x]
            d[y * w + x] = v.isFinite ? UInt8(max(0, min(255, (v * 255).rounded()))) : 0
          }
        }
      case kCVPixelFormatType_OneComponent8:
        for y in 0..<h {
          let src = (base + y * ligne).assumingMemoryBound(to: UInt8.self)
          for x in 0..<w { d[y * w + x] = src[x] }
        }
      default:
        ok = false
      }
    }
    if ok { return (out, w, h) }
    // autre format (demi flottant...) : Core Image, sans espace de couleur
    let ctx = CIContext(options: [.workingColorSpace: NSNull(), .outputColorSpace: NSNull()])
    let image = CIImage(cvPixelBuffer: tampon)
    var gris = Data(count: w * h)
    gris.withUnsafeMutableBytes { (dst: UnsafeMutableRawBufferPointer) in
      if let p = dst.baseAddress {
        ctx.render(image, toBitmap: p, rowBytes: w, bounds: CGRect(x: 0, y: 0, width: w, height: h), format: .L8, colorSpace: nil)
      }
    }
    return (gris, w, h)
  }

  /// PNG gris 8 bits, nom unique comme lib/v2/cartes/tmp.ts (masque_<ms>_<hasard>.png)
  static func ecrirePNG(_ octets: Data, _ w: Int, _ h: Int, dans dossier: URL) -> URL? {
    do {
      try FileManager.default.createDirectory(at: dossier, withIntermediateDirectories: true)
    } catch {
      return nil
    }
    let hasard = String(UInt32.random(in: 0...UInt32.max), radix: 36)
    let url = dossier.appendingPathComponent("masque_\(Int(Date().timeIntervalSince1970 * 1000))_\(hasard).png")
    guard let fournisseur = CGDataProvider(data: octets as CFData),
          let image = CGImage(width: w, height: h, bitsPerComponent: 8, bitsPerPixel: 8, bytesPerRow: w,
                              space: CGColorSpaceCreateDeviceGray(), bitmapInfo: CGBitmapInfo(rawValue: CGImageAlphaInfo.none.rawValue),
                              provider: fournisseur, decode: nil, shouldInterpolate: false, intent: .defaultIntent),
          let dest = CGImageDestinationCreateWithURL(url as CFURL, "public.png" as CFString, 1, nil) else { return nil }
    CGImageDestinationAddImage(dest, image, nil)
    return CGImageDestinationFinalize(dest) ? url : nil
  }
}
