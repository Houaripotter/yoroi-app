import SwiftUI

// Reglages minimum : haptique fort ou normal, son fort de fin de minuteur (actif par defaut).
// Les autres sons sont ceux des haptiques de watchOS (mode silence respecte). Le reste vient de l'iPhone.

struct ReglagesVue: View {
  @AppStorage(Partage.Cle.hapticFort, store: UserDefaults(suiteName: Partage.groupe)) private var hapticFort = false
  @AppStorage(Partage.Cle.sonFort, store: UserDefaults(suiteName: Partage.groupe)) private var sonFort = true
  /// 28 octobre 2026 : le son de fin, wizz (par defaut) ou alarme
  @AppStorage(Partage.Cle.sonFin, store: UserDefaults(suiteName: Partage.groupe)) private var sonFin = "wizz"
  @State private var synchro = Synchro.shared

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 8) {
        Toggle("Haptique fort", isOn: $hapticFort)
          .frame(minHeight: 44)
          .onChange(of: hapticFort) { _, _ in Haptique.validation() }
        Toggle("Son fort", isOn: $sonFort)
          .frame(minHeight: 44)
        if sonFort {
          Text("Son de fin")
            .font(.system(size: 12, weight: .heavy, design: .rounded))
            .foregroundStyle(Teinte.texteDoux)
          HStack(spacing: 6) {
            choixSon("wizz", NSLocalizedString("Wizz", comment: ""))
            choixSon("alarme", NSLocalizedString("Alarme", comment: ""))
          }
          Button {
            Haptique.essayerSon()
          } label: {
            Label(NSLocalizedString("Écouter", comment: ""), systemImage: "speaker.wave.2.fill")
              .font(.system(size: 14, weight: .bold, design: .rounded))
              .frame(maxWidth: .infinity, minHeight: 40)
              .background(Teinte.carte, in: Capsule())
              .foregroundStyle(Teinte.texte)
          }
          .buttonStyle(StyleAppui())
        }
        Text(sonFort
          ? NSLocalizedString("Fin de minuteur : alarme forte jouée par la montre, même en mode silence et écran éteint. Elle peut faire basculer tes AirPods sur la montre : coupe ce réglage si ça te gêne.", comment: "")
          : NSLocalizedString("Les sons suivent le mode silence de ta montre. Ta musique et tes AirPods restent sur ton iPhone.", comment: ""))
          .font(.system(size: 12, design: .rounded))
          .foregroundStyle(Teinte.texteDoux)
        Text("Vibrations plus fortes : sur ta montre, Réglages, Sons et vibrations, active Vibrations prononcées.")
          .font(.system(size: 12, design: .rounded))
          .foregroundStyle(Teinte.texteDoux)
        Text("Le reste se règle dans Yoroi sur ton iPhone.")
          .font(.system(size: 12, design: .rounded))
          .foregroundStyle(Teinte.texteDoux)
        Text(etatSynchro)
          .font(.system(size: 12, design: .rounded))
          .foregroundStyle(Teinte.texteDoux)
      }
    }
    .navigationTitle("Réglages")
  }

  private func choixSon(_ id: String, _ nom: String) -> some View {
    let actif = (sonFin == "alarme" ? "alarme" : "wizz") == id
    return Button {
      sonFin = id
      Haptique.cran()
    } label: {
      Text(nom)
        .font(.system(size: 14, weight: .heavy, design: .rounded))
        .lineLimit(1)
        .minimumScaleFactor(0.7)
        .frame(maxWidth: .infinity, minHeight: 40)
        .background(actif ? Teinte.peche : Teinte.carte, in: Capsule())
        .foregroundStyle(actif ? Teinte.pecheTexte : Teinte.texte)
    }
    .buttonStyle(StyleAppui())
    .accessibilityAddTraits(actif ? .isSelected : [])
  }

  private var etatSynchro: String {
    let attente = synchro.file.filter { $0.livreeLe == nil }.count
    var t: String
    if let d = synchro.derniereSynchro {
      let f = DateFormatter()
      f.locale = Locale(identifier: Bundle.main.preferredLocalizations.first ?? "fr")
      f.dateStyle = .short
      f.timeStyle = .short
      t = String(format: NSLocalizedString("Dernière synchro le %@.", comment: ""), "\(f.string(from: d))")
    } else {
      t = NSLocalizedString("Pas encore de synchro avec ton iPhone.", comment: "")
    }
    if attente > 0 { t += attente > 1 ? " " + String(format: NSLocalizedString("%@ envois en attente.", comment: ""), "\(attente)") : " " + NSLocalizedString("1 envoi en attente.", comment: "") }
    return t
  }
}
