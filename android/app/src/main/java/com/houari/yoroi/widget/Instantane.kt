package com.houari.yoroi.widget

import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import java.time.LocalDate

/**
 * Instantane v1 : le meme JSON que celui envoye a la montre (lib/v2/montre/contexte.ts).
 * Les widgets n'inventent aucun chiffre : tout ce qui manque reste vide.
 */
data class PointKg(val jour: LocalDate, val kg: Double)

data class PoidsW(
    val kg: Double?,
    val date: LocalDate?,
    val ecart: Double?,
    val statut: String,
    val phrase: String?,
    val arriveeDu: LocalDate?,
    val arriveeAu: LocalDate?,
    val serie: List<PointKg>,
    val ligne: List<PointKg>,
    /** 28 octobre 2026 : le prochain palier du chemin vers ton cap (25, 50, 75 et 100 %), null sans cap */
    val palier: PalierW? = null,
)

data class PalierW(val kg: Double, val reste: Double, val dernier: Boolean)

data class SemaineW(val objectif: Int?, val faites: Int, val jours: List<Boolean>, val lundi: LocalDate?)

data class EauW(val ml: Int, val objectif: Int?, val verre: Int)

data class ChronoW(val id: String, val nom: String, val rounds: Int, val roundS: Int, val reposS: Int)

data class CombatW(val date: LocalDate, val categorieKg: Double?, val ecartKg: Double?)

/**
 * 30 octobre 2026 : la seance du jour de ton Coach (champ coach de l'instantane, textes deja traduits par l'app),
 * absente sans programme suivi. Meme lecture que CoachI sur iPhone (ios/YoroiWidgets/Modele.swift).
 */
data class CoachW(
    val titre: String,
    val programme: String,
    val exos: Int,
    val minutes: Int,
    val muscles: List<String>,
    val aujourdhui: Boolean,
    val etat: String,
    val ensuite: String,
    val genre: String,
)

/** 30 octobre 2026 : ton rang du Dojo et ton XP (champ dojo de l'instantane), comme DojoI sur iPhone */
data class DojoW(
    val rang: String,
    val rangIndex: Int,
    val rangs: Int,
    val xp: Int,
    val suivant: String?,
    val xpSuivant: Int?,
    /** 0 a 1 vers le palier suivant */
    val part: Double,
    val personnage: String?,
)

data class Instantane(
    val genere: Instant?,
    val unite: String,
    val poids: PoidsW?,
    val semaine: SemaineW?,
    val eau: EauW?,
    val chronos: List<ChronoW>,
    val combat: CombatW?,
    val coach: CoachW? = null,
    val dojo: DojoW? = null,
)

object LectureInstantane {

    /** null si le JSON est absent, illisible ou hors contrat v1 */
    fun lire(json: String?): Instantane? {
        if (json.isNullOrBlank()) return null
        return try {
            val o = JSONObject(json)
            if (o.optInt("v", 0) != 1) return null
            val profil = o.optJSONObject("profil")
            val unite = if (profil?.optString("unite", "kg") == "lb") "lb" else "kg"
            Instantane(
                genere = instant(texte(o, "genere")),
                unite = unite,
                poids = o.optJSONObject("poids")?.let { poids(it) },
                semaine = o.optJSONObject("semaine")?.let { semaine(it) },
                eau = o.optJSONObject("eau")?.let { eau(it) },
                chronos = chronos(o.optJSONArray("chronos")),
                combat = o.optJSONObject("combat")?.let { combat(it) },
                coach = o.optJSONObject("coach")?.let { coach(it) },
                dojo = o.optJSONObject("dojo")?.let { dojo(it) },
            )
        } catch (e: Exception) {
            null
        }
    }

    private fun poids(o: JSONObject): PoidsW {
        val dernier = o.optJSONObject("dernier")
        val arrivee = o.optJSONObject("arrivee")
        return PoidsW(
            kg = dernier?.let { nombre(it, "kg") }?.takeIf { it > 0 },
            date = dernier?.let { jour(texte(it, "date")) },
            ecart = nombre(o, "ecart"),
            statut = when (texte(o, "statut")) {
                "allure" -> "allure"
                "dessus" -> "dessus"
                "vite" -> "vite"
                else -> "aucun"
            },
            phrase = texte(o, "phrase"),
            arriveeDu = arrivee?.let { jour(texte(it, "du")) },
            arriveeAu = arrivee?.let { jour(texte(it, "au")) },
            serie = points(o.optJSONArray("serie30")),
            ligne = points(o.optJSONArray("ligne30")),
            palier = o.optJSONObject("palier")?.let { pa ->
                val kg = nombre(pa, "kg")
                if (kg == null || kg <= 0) null else PalierW(kg, (nombre(pa, "reste") ?: 0.0).coerceAtLeast(0.0), pa.optBoolean("dernier", false))
            },
        )
    }

    private fun semaine(o: JSONObject): SemaineW {
        val arr = o.optJSONArray("jours")
        val jours = List(7) { i -> arr?.optBoolean(i, false) ?: false }
        return SemaineW(
            objectif = nombre(o, "objectif")?.toInt()?.takeIf { it > 0 },
            faites = (nombre(o, "faites") ?: 0.0).toInt().coerceAtLeast(0),
            jours = jours,
            lundi = jour(texte(o, "lundi")),
        )
    }

    private fun eau(o: JSONObject): EauW? {
        val verre = nombre(o, "verre")?.toInt() ?: return null
        if (verre <= 0) return null
        return EauW(
            ml = (nombre(o, "ml") ?: 0.0).toInt().coerceAtLeast(0),
            objectif = nombre(o, "objectif")?.toInt()?.takeIf { it > 0 },
            verre = verre,
        )
    }

    private fun chronos(arr: JSONArray?): List<ChronoW> {
        if (arr == null) return emptyList()
        val out = ArrayList<ChronoW>()
        for (i in 0 until arr.length()) {
            val c = arr.optJSONObject(i) ?: continue
            val rounds = nombre(c, "rounds")?.toInt() ?: continue
            val roundS = nombre(c, "roundS")?.toInt() ?: continue
            if (rounds <= 0 || roundS <= 0) continue
            out.add(
                ChronoW(
                    id = texte(c, "id") ?: "",
                    nom = texte(c, "nom") ?: "",
                    rounds = rounds,
                    roundS = roundS,
                    reposS = (nombre(c, "reposS") ?: 0.0).toInt().coerceAtLeast(0),
                )
            )
        }
        return out
    }

    private fun combat(o: JSONObject): CombatW? {
        val date = jour(texte(o, "date")) ?: return null
        return CombatW(date, nombre(o, "categorieKg")?.takeIf { it > 0 }, nombre(o, "ecartKg"))
    }

    private fun coach(o: JSONObject): CoachW {
        val arr = o.optJSONArray("muscles")
        val muscles = ArrayList<String>()
        if (arr != null) {
            for (i in 0 until arr.length()) {
                val m = arr.optString(i, "").trim()
                if (m.isNotEmpty()) muscles.add(m)
            }
        }
        return CoachW(
            titre = texte(o, "titre") ?: "",
            programme = texte(o, "programme") ?: "",
            exos = Math.round(nombre(o, "exos") ?: 0.0).toInt().coerceAtLeast(0),
            minutes = Math.round(nombre(o, "minutes") ?: 0.0).toInt().coerceAtLeast(0),
            muscles = muscles,
            aujourdhui = o.optBoolean("aujourdhui", false),
            etat = texte(o, "etat") ?: "",
            ensuite = texte(o, "ensuite") ?: "",
            genre = texte(o, "genre") ?: "muscu",
        )
    }

    private fun dojo(o: JSONObject): DojoW = DojoW(
        rang = texte(o, "rang") ?: "",
        rangIndex = Math.round(nombre(o, "rangIndex") ?: 0.0).toInt().coerceAtLeast(0),
        rangs = Math.round(nombre(o, "rangs") ?: 5.0).toInt().coerceAtLeast(1),
        xp = Math.round(nombre(o, "xp") ?: 0.0).toInt().coerceAtLeast(0),
        suivant = texte(o, "suivant"),
        xpSuivant = nombre(o, "xpSuivant")?.let { Math.round(it).toInt() },
        part = (nombre(o, "part") ?: 0.0).coerceIn(0.0, 1.0),
        personnage = texte(o, "personnage"),
    )

    private fun points(arr: JSONArray?): List<PointKg> {
        if (arr == null) return emptyList()
        val out = ArrayList<PointKg>()
        for (i in 0 until arr.length()) {
            val p = arr.optJSONObject(i) ?: continue
            val j = jour(texte(p, "d")) ?: continue
            val kg = nombre(p, "kg") ?: continue
            if (kg > 0) out.add(PointKg(j, kg))
        }
        out.sortBy { it.jour }
        return out
    }

    fun nombre(o: JSONObject, cle: String): Double? {
        if (!o.has(cle) || o.isNull(cle)) return null
        val v = o.optDouble(cle)
        return if (v.isNaN() || v.isInfinite()) null else v
    }

    fun texte(o: JSONObject, cle: String): String? {
        if (!o.has(cle) || o.isNull(cle)) return null
        return o.optString(cle).trim().takeIf { it.isNotEmpty() }
    }

    fun jour(s: String?): LocalDate? = try {
        if (s == null || s.length < 10) null else LocalDate.parse(s.substring(0, 10))
    } catch (e: Exception) {
        null
    }

    fun instant(s: String?): Instant? = try {
        if (s == null) null else Instant.parse(s)
    } catch (e: Exception) {
        null
    }
}
