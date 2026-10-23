package com.houari.yoroi.widget

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.time.temporal.TemporalAdjusters
import java.util.UUID

/**
 * Stockage partage des widgets (SharedPreferences) : l'instantane ecrit par l'app,
 * et la file des actions faites depuis un widget (+ 1 verre, retrait) que l'app applique
 * au prochain lancement ou retour au premier plan (lib/v2/montre/actions.ts, source « widget »).
 */
object Magasin {
    private const val PREFS = "yoroi_widgets_v2"
    private const val CLE_INSTANTANE = "instantane"
    private const val CLE_FILE = "file_actions"
    private const val CLE_JETON = "jeton"
    private const val CLE_STYLE = "style"
    private const val FILE_MAX = 200
    private val verrou = Any()

    private val FORMAT_AT: DateTimeFormatter =
        DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'").withZone(ZoneOffset.UTC)

    private fun prefs(ctx: Context): SharedPreferences =
        ctx.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun ecrireInstantane(ctx: Context, json: String) {
        synchronized(verrou) { prefs(ctx).edit().putString(CLE_INSTANTANE, json).commit() }
    }

    fun instantane(ctx: Context): Instantane? =
        LectureInstantane.lire(synchronized(verrou) { prefs(ctx).getString(CLE_INSTANTANE, null) })

    /** La file des actions en attente, en tableau JSON (toujours un tableau, vide au pire) */
    fun actions(ctx: Context): JSONArray = synchronized(verrou) {
        try {
            JSONArray(prefs(ctx).getString(CLE_FILE, "[]") ?: "[]")
        } catch (e: Exception) {
            JSONArray()
        }
    }

    fun ajouterAction(ctx: Context, action: JSONObject) {
        synchronized(verrou) {
            val file = actions(ctx)
            file.put(action)
            val debut = (file.length() - FILE_MAX).coerceAtLeast(0)
            val garde = JSONArray()
            for (i in debut until file.length()) garde.put(file.get(i))
            prefs(ctx).edit().putString(CLE_FILE, garde.toString()).commit()
        }
    }

    fun retirerActions(ctx: Context, ids: Set<String>) {
        if (ids.isEmpty()) return
        synchronized(verrou) {
            val file = actions(ctx)
            val garde = JSONArray()
            for (i in 0 until file.length()) {
                val a = file.optJSONObject(i) ?: continue
                if (a.optString("id", "") !in ids) garde.put(a)
            }
            prefs(ctx).edit().putString(CLE_FILE, garde.toString()).commit()
        }
    }

    /** Jeton propre a l'installation, glisse dans les boutons du widget : aucune autre app ne peut ajouter d'eau */
    fun jeton(ctx: Context): String = synchronized(verrou) {
        val p = prefs(ctx)
        p.getString(CLE_JETON, null) ?: UUID.randomUUID().toString().also {
            p.edit().putString(CLE_JETON, it).commit()
        }
    }

    /** Style des widgets : "A" Nuit de lanternes (par defaut), "B" Rouleau et encre, "C" Armure laquee */
    fun style(ctx: Context): String = synchronized(verrou) { prefs(ctx).getString(CLE_STYLE, "A") ?: "A" }

    fun ecrireStyle(ctx: Context, style: String) {
        val s = style.trim().uppercase()
        synchronized(verrou) { prefs(ctx).edit().putString(CLE_STYLE, if (s == "B" || s == "C") s else "A").commit() }
    }

    fun maintenantIso(): String = FORMAT_AT.format(Instant.now())

    fun fichierScene(ctx: Context): File {
        val dossier = File(ctx.applicationContext.filesDir, "widgets")
        if (!dossier.exists()) dossier.mkdirs()
        return File(dossier, "scene.jpg")
    }

    fun fichierPersonnage(ctx: Context): File {
        val dossier = File(ctx.applicationContext.filesDir, "widgets")
        if (!dossier.exists()) dossier.mkdirs()
        return File(dossier, "personnage.png")
    }
}

/** Ce que les widgets affichent, calcule une fois par rafraichissement */
class Donnees(
    val inst: Instantane?,
    /** eau du jour avec les verres ajoutes depuis le widget (optimiste), null sans donnees d'eau */
    val eauMl: Int?,
    /** semaine en cours seulement (une semaine passee s'affiche vide) */
    val semaine: SemaineW?,
    /** competition a venir seulement */
    val combat: CombatW?,
    val aujourdhui: LocalDate,
) {
    companion object {
        fun charger(ctx: Context): Donnees {
            val zone = ZoneId.systemDefault()
            val auj = LocalDate.now(zone)
            val inst = Magasin.instantane(ctx)
            val eauMl = inst?.eau?.let { eau ->
                val genere = inst.genere
                val jourGenere = genere?.atZone(zone)?.toLocalDate()
                var ml = if (jourGenere == auj) eau.ml else 0
                val file = Magasin.actions(ctx)
                for (i in 0 until file.length()) {
                    val a = file.optJSONObject(i) ?: continue
                    if (a.optString("type") != "eau") continue
                    val at = LectureInstantane.instant(LectureInstantane.texte(a, "at")) ?: continue
                    if (at.atZone(zone).toLocalDate() != auj) continue
                    // deja compte dans l'instantane si l'app l'a genere apres l'action
                    if (genere != null && !at.isAfter(genere)) continue
                    ml += a.optInt("deltaMl", 0)
                }
                ml.coerceAtLeast(0)
            }
            val lundi = auj.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
            val sem = inst?.semaine?.let { s ->
                if (s.lundi == lundi) s else SemaineW(s.objectif, 0, List(7) { false }, lundi)
            }
            val combat = inst?.combat?.takeIf { !it.date.isBefore(auj) }
            return Donnees(inst, eauMl, sem, combat, auj)
        }
    }
}
