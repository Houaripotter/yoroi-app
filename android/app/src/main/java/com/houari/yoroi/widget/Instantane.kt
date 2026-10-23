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
)

data class SemaineW(val objectif: Int?, val faites: Int, val jours: List<Boolean>, val lundi: LocalDate?)

data class EauW(val ml: Int, val objectif: Int?, val verre: Int)

data class ChronoW(val id: String, val nom: String, val rounds: Int, val roundS: Int, val reposS: Int)

data class CombatW(val date: LocalDate, val categorieKg: Double?, val ecartKg: Double?)

data class Instantane(
    val genere: Instant?,
    val unite: String,
    val poids: PoidsW?,
    val semaine: SemaineW?,
    val eau: EauW?,
    val chronos: List<ChronoW>,
    val combat: CombatW?,
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
