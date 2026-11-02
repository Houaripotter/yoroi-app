// AnalyseMLKit.kt : le coeur du module photo YOROI sur Android, avec Google ML Kit (modeles dans l'app).
//
// 1. La photo est lue depuis un fichier local (file:// ou content://), jamais depuis internet.
// 2. Elle est redressee (EXIF) et reduite a 1024 px sur le grand cote.
// 3. Visages : ML Kit Face Detection, mode precis, reperes du visage, visages d'au moins 4 % de la largeur.
// 4. Detourage : ML Kit Selfie Segmentation, mode image seule, masque a la taille de la copie.
// 5. Le masque est ecrit en PNG gris dans cartes_tmp/masques/ et rendu en octets (base64) pour le critere A+.
// Un echec rend une reponse partielle (visages seuls) ou vide, jamais une exception vers l'app.
package expo.modules.yoroiphoto

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.Matrix
import android.net.Uri
import android.os.SystemClock
import android.util.Base64
import androidx.exifinterface.media.ExifInterface
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.face.FaceDetection
import com.google.mlkit.vision.face.FaceDetector
import com.google.mlkit.vision.face.FaceDetectorOptions
import com.google.mlkit.vision.face.FaceLandmark
import com.google.mlkit.vision.segmentation.Segmentation
import com.google.mlkit.vision.segmentation.Segmenter
import com.google.mlkit.vision.segmentation.selfie.SelfieSegmenterOptions
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.TimeUnit
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

object AnalyseMLKit {
  const val TAILLE_MAX = 1024
  const val MOTEUR = "google-mlkit"
  const val VERSION_MODELE = "face-detection:16.1.7+segmentation-selfie:16.0.0-beta6"
  private const val DELAI_S = 15L

  private var detecteur: FaceDetector? = null
  private var segmenteur: Segmenter? = null

  @Synchronized
  private fun detecteur(): FaceDetector =
    detecteur ?: FaceDetection.getClient(
      FaceDetectorOptions.Builder()
        .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_ACCURATE)
        .setLandmarkMode(FaceDetectorOptions.LANDMARK_MODE_ALL)
        .setClassificationMode(FaceDetectorOptions.CLASSIFICATION_MODE_NONE)
        .setContourMode(FaceDetectorOptions.CONTOUR_MODE_NONE)
        .setMinFaceSize(0.04f)
        .build()
    ).also { detecteur = it }

  @Synchronized
  private fun segmenteur(): Segmenter =
    segmenteur ?: Segmentation.getClient(
      SelfieSegmenterOptions.Builder()
        .setDetectorMode(SelfieSegmenterOptions.SINGLE_IMAGE_MODE)
        .build()
    ).also { segmenteur = it }

  @Synchronized
  fun fermer() {
    try { detecteur?.close() } catch (_: Throwable) {}
    try { segmenteur?.close() } catch (_: Throwable) {}
    detecteur = null
    segmenteur = null
  }

  fun vide(erreur: String?): Map<String, Any?> = mapOf(
    "visages" to emptyList<Any>(),
    "plateforme" to "android",
    "moteur" to MOTEUR,
    "versionModele" to VERSION_MODELE,
    "largeur" to 0, "hauteur" to 0, "largeurPhoto" to 0, "hauteurPhoto" to 0,
    "detourageDisponible" to true,
    "erreurs" to listOfNotNull(erreur)
  )

  fun analyser(contexte: Context, uri: String, dossierMasques: File): Map<String, Any?> {
    val debut = SystemClock.elapsedRealtime()
    val photo = try { chargerRedressee(contexte, uri) } catch (e: Throwable) { null }
      ?: return vide("lecture: photo illisible")
    val bmp = photo.bitmap
    val w = bmp.width
    val h = bmp.height
    val erreurs = mutableListOf<String>()
    val image = InputImage.fromBitmap(bmp, 0)

    // 1. visages
    val visages = try {
      Tasks.await(detecteur().process(image), DELAI_S, TimeUnit.SECONDS).map { f ->
        val b = f.boundingBox
        val v = mutableMapOf<String, Any?>(
          "x" to b.left.toDouble() / w, "y" to b.top.toDouble() / h,
          "w" to b.width().toDouble() / w, "h" to b.height().toDouble() / h,
          "confiance" to null, // ML Kit ne donne pas de score de visage
          "lacet" to f.headEulerAngleY.toDouble(),
          "roulis" to f.headEulerAngleZ.toDouble()
        )
        val reperes = mutableMapOf<String, Any?>()
        for ((nom, type) in REPERES) {
          f.getLandmark(type)?.position?.let { p -> reperes[nom] = mapOf("x" to p.x.toDouble() / w, "y" to p.y.toDouble() / h) }
        }
        if (reperes.isNotEmpty()) v["reperes"] = reperes
        v
      }
    } catch (e: Throwable) {
      erreurs += "visages: ${e.javaClass.simpleName}"
      emptyList()
    }

    // 2. detourage
    var masque: Map<String, Any?>? = null
    try {
      val m = Tasks.await(segmenteur().process(image), DELAI_S, TimeUnit.SECONDS)
      val mw = m.width
      val mh = m.height
      val tampon = m.buffer
      tampon.rewind()
      val octets = ByteArray(mw * mh)
      for (i in 0 until mw * mh) {
        val c = tampon.float
        octets[i] = (min(1f, max(0f, c)) * 255f).roundToInt().toByte()
      }
      val fichier = ecrirePNG(octets, mw, mh, dossierMasques)
      masque = mapOf(
        "uri" to (fichier?.let { Uri.fromFile(it).toString() } ?: ""),
        "largeur" to mw, "hauteur" to mh,
        "personnes" to null, // Selfie Segmentation ne compte pas les personnes
        "pixels" to Base64.encodeToString(octets, Base64.NO_WRAP)
      )
    } catch (e: Throwable) {
      erreurs += "detourage: ${e.javaClass.simpleName}"
    }

    val sortie = mutableMapOf<String, Any?>(
      "visages" to visages,
      "plateforme" to "android",
      "moteur" to MOTEUR,
      "versionModele" to VERSION_MODELE,
      "largeur" to w, "hauteur" to h,
      "largeurPhoto" to photo.largeurPhoto, "hauteurPhoto" to photo.hauteurPhoto,
      "detourageDisponible" to true,
      "erreurs" to erreurs,
      "dureeMs" to (SystemClock.elapsedRealtime() - debut).toDouble()
    )
    lumiereDuBas(bmp)?.let { sortie["lumiere"] = it }
    if (masque != null) sortie["masque"] = masque
    bmp.recycle()
    return sortie
  }

  private val REPERES = listOf(
    "oeilGauche" to FaceLandmark.LEFT_EYE,
    "oeilDroit" to FaceLandmark.RIGHT_EYE,
    "nez" to FaceLandmark.NOSE_BASE,
    "boucheGauche" to FaceLandmark.MOUTH_LEFT,
    "boucheDroite" to FaceLandmark.MOUTH_RIGHT,
    "boucheBas" to FaceLandmark.MOUTH_BOTTOM
  )

  private class PhotoChargee(val bitmap: Bitmap, val largeurPhoto: Int, val hauteurPhoto: Int)

  /** Seulement file:// et content:// (copie du selecteur). http, https et le reste sont refuses. */
  private fun chargerRedressee(contexte: Context, texte: String): PhotoChargee? {
    val uri = if (texte.startsWith("/")) Uri.fromFile(File(texte)) else Uri.parse(texte)
    if (uri.scheme != "file" && uri.scheme != "content") return null
    val resolveur = contexte.contentResolver

    // taille sans decoder
    val bornes = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    // avec inJustDecodeBounds, decodeStream rend toujours null : seule la taille compte
    val fluxTaille = resolveur.openInputStream(uri) ?: return null
    fluxTaille.use { BitmapFactory.decodeStream(it, null, bornes) }
    if (bornes.outWidth <= 0 || bornes.outHeight <= 0) return null

    // sous-echantillonnage par puissance de 2, sans descendre sous 1024 px
    var pas = 1
    while (max(bornes.outWidth, bornes.outHeight) / (pas * 2) >= TAILLE_MAX) pas *= 2
    val options = BitmapFactory.Options().apply {
      inSampleSize = pas
      inPreferredConfig = Bitmap.Config.ARGB_8888
    }
    val brut = resolveur.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, options) } ?: return null

    val orientation = try {
      resolveur.openInputStream(uri)?.use { ExifInterface(it).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL) }
        ?: ExifInterface.ORIENTATION_NORMAL
    } catch (_: Throwable) {
      ExifInterface.ORIENTATION_NORMAL
    }
    val matrice = Matrix()
    when (orientation) {
      ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> matrice.setScale(-1f, 1f)
      ExifInterface.ORIENTATION_ROTATE_180 -> matrice.setRotate(180f)
      ExifInterface.ORIENTATION_FLIP_VERTICAL -> matrice.setScale(1f, -1f)
      ExifInterface.ORIENTATION_TRANSPOSE -> { matrice.setRotate(90f); matrice.postScale(-1f, 1f) }
      ExifInterface.ORIENTATION_ROTATE_90 -> matrice.setRotate(90f)
      ExifInterface.ORIENTATION_TRANSVERSE -> { matrice.setRotate(-90f); matrice.postScale(-1f, 1f) }
      ExifInterface.ORIENTATION_ROTATE_270 -> matrice.setRotate(-90f)
    }
    val tourne = orientation in listOf(
      ExifInterface.ORIENTATION_TRANSPOSE, ExifInterface.ORIENTATION_ROTATE_90,
      ExifInterface.ORIENTATION_TRANSVERSE, ExifInterface.ORIENTATION_ROTATE_270
    )
    val echelle = min(1f, TAILLE_MAX.toFloat() / max(brut.width, brut.height))
    matrice.postScale(echelle, echelle)
    val redresse = Bitmap.createBitmap(brut, 0, 0, brut.width, brut.height, matrice, true)
    if (redresse !== brut) brut.recycle()
    val (lp, hp) = if (tourne) bornes.outHeight to bornes.outWidth else bornes.outWidth to bornes.outHeight
    return PhotoChargee(redresse, lp, hp)
  }

  /** Luminance moyenne (Rec. 709) des 40 % du bas, de 0 a 1, un pixel sur deux */
  private fun lumiereDuBas(bmp: Bitmap): Double? {
    val w = bmp.width
    val h = bmp.height
    if (w <= 0 || h <= 0) return null
    val ligne = IntArray(w)
    var somme = 0.0
    var n = 0
    var y = (h * 0.6).toInt()
    while (y < h) {
      bmp.getPixels(ligne, 0, w, 0, y, w, 1)
      var x = 0
      while (x < w) {
        val c = ligne[x]
        somme += 0.2126 * Color.red(c) + 0.7152 * Color.green(c) + 0.0722 * Color.blue(c)
        n++
        x += 2
      }
      y += 2
    }
    return if (n > 0) somme / n / 255.0 else null
  }

  /** PNG gris (255 = personne), nom unique comme lib/v2/cartes/tmp.ts. null si l'ecriture echoue */
  private fun ecrirePNG(octets: ByteArray, w: Int, h: Int, dossier: File): File? = try {
    if (!dossier.exists()) dossier.mkdirs()
    val pixels = IntArray(w * h)
    for (i in pixels.indices) {
      val v = octets[i].toInt() and 0xFF
      pixels[i] = (0xFF shl 24) or (v shl 16) or (v shl 8) or v
    }
    val bmp = Bitmap.createBitmap(pixels, w, h, Bitmap.Config.ARGB_8888)
    val hasard = java.lang.Long.toString((Math.random() * Long.MAX_VALUE).toLong(), 36).take(6)
    val f = File(dossier, "masque_${System.currentTimeMillis()}_$hasard.png")
    FileOutputStream(f).use { bmp.compress(Bitmap.CompressFormat.PNG, 100, it) }
    bmp.recycle()
    f
  } catch (_: Throwable) {
    null
  }
}
