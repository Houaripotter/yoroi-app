import SwiftUI

// Reglages minimum : haptique fort ou normal. Les sons sont ceux des haptiques de watchOS
// (mode silence de la montre respecte). Tout le reste vient de l'iPhone.

struct ReglagesVue: View {
  @AppStorage(Partage.Cle.hapticFort, store: UserDefaults(suiteName: Partage.groupe)) private var hapticFort = false
  @State private var synchro = Synchro.shared

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 8) {
        Toggle("Haptique fort", isOn: $hapticFort)
          .frame(minHeight: 44)
          .onChange(of: hapticFort) { _, _ in Haptique.validation() }
        Text("Les sons suivent le mode silence de ta montre. Ta musique et tes AirPods restent sur ton iPhone.")
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

  private var etatSynchro: String {
    let attente = synchro.file.filter { $0.livreeLe == nil }.count
    var t: String
    if let d = synchro.derniereSynchro {
      let f = DateFormatter()
      f.locale = Locale(identifier: "fr_FR")
      f.dateStyle = .short
      f.timeStyle = .short
      t = "Dernière synchro le \(f.string(from: d))."
    } else {
      t = "Pas encore de synchro avec ton iPhone."
    }
    if attente > 0 { t += attente > 1 ? " \(attente) envois en attente." : " 1 envoi en attente." }
    return t
  }
}
