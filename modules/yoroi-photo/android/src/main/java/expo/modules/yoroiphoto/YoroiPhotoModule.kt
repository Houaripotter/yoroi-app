// YoroiPhotoModule.kt : le pont Expo entre JavaScript et AnalyseMLKit.kt (Android).
// Aucune permission demandee, aucun appel reseau fait par ce code.
package expo.modules.yoroiphoto

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

class YoroiPhotoModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("YoroiPhoto")

    Function("capacites") {
      mapOf(
        "visages" to true,
        "detourage" to true,
        "plateforme" to "android",
        "moteur" to AnalyseMLKit.MOTEUR,
        "versionModele" to AnalyseMLKit.VERSION_MODELE
      )
    }

    // File d'attente des modules Expo (un fil a part, pas le fil de l'ecran)
    AsyncFunction("analyserPhoto") { uri: String ->
      val contexte = appContext.reactContext ?: return@AsyncFunction AnalyseMLKit.vide("lecture: pas de contexte")
      val dossier = File(File(appContext.cacheDirectory, "cartes_tmp"), "masques")
      AnalyseMLKit.analyser(contexte, uri, dossier)
    }

    OnDestroy {
      AnalyseMLKit.fermer()
    }
  }
}
