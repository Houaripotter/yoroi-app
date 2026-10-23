package com.houari.yoroi.widget

import android.text.SpannableString
import android.text.Spanned
import android.text.style.RelativeSizeSpan
import java.time.LocalDate
import java.time.temporal.ChronoUnit
import java.util.Locale
import kotlin.math.abs
import kotlin.math.roundToInt

/** Textes des widgets, en francais, virgule decimale, sans tiret long */
object Format {
    private val MOIS = arrayOf(
        "janvier", "février", "mars", "avril", "mai", "juin",
        "juillet", "août", "septembre", "octobre", "novembre", "décembre",
    )
    private val MOIS_COURT = arrayOf(
        "janv.", "févr.", "mars", "avr.", "mai", "juin",
        "juil.", "août", "sept.", "oct.", "nov.", "déc.",
    )
    private val JOURS = arrayOf("lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche")
    private const val KG_EN_LB = 2.20462262185

    fun versUnite(kg: Double, unite: String): Double = if (unite == "lb") kg * KG_EN_LB else kg

    fun suffixe(unite: String): String = if (unite == "lb") "lb" else "kg"

    fun uneDecimale(v: Double): String = String.format(Locale.FRANCE, "%.1f", v)

    /** « 78,4 kg » avec l'unite plus petite */
    fun poidsGrand(kg: Double, unite: String): CharSequence {
        val nombre = uneDecimale(versUnite(kg, unite))
        val s = SpannableString(nombre + " " + suffixe(unite))
        s.setSpan(RelativeSizeSpan(0.5f), nombre.length, s.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
        return s
    }

    fun poids(kg: Double, unite: String): String = uneDecimale(versUnite(kg, unite)) + " " + suffixe(unite)

    /** Ecart au rythme prevu avec sa fleche : au dessus de la ligne vers le haut, en dessous vers le bas */
    fun ecart(ecartKg: Double, unite: String): String {
        val v = versUnite(abs(ecartKg), unite)
        if (v < 0.05) return "Pile sur ton rythme"
        val fleche = if (ecartKg > 0) "↑" else "↓"
        return fleche + " " + uneDecimale(v) + " " + suffixe(unite)
    }

    fun jourCourt(d: LocalDate): String = "${premier(d.dayOfMonth)} ${MOIS_COURT[d.monthValue - 1]}"

    fun jourLong(d: LocalDate): String =
        "${JOURS[d.dayOfWeek.value - 1]} ${premier(d.dayOfMonth)} ${MOIS[d.monthValue - 1]}"

    fun jourLongMaj(d: LocalDate): String = jourLong(d).replaceFirstChar { it.uppercaseChar() }

    private fun premier(j: Int): String = if (j == 1) "1er" else j.toString()

    fun datePesee(d: LocalDate?, auj: LocalDate): String? {
        if (d == null) return null
        return when (ChronoUnit.DAYS.between(d, auj)) {
            0L -> "Pesée d'aujourd'hui"
            1L -> "Pesée d'hier"
            else -> "Pesée du ${jourCourt(d)}"
        }
    }

    /** « du 3 au 17 mars », « du 28 févr. au 12 mars », avec l'annee si elle change */
    fun plage(du: LocalDate, au: LocalDate, auj: LocalDate): String {
        if (du == au) return "le ${jourCourt(du)}" + annee(du, auj)
        return if (du.year == au.year && du.monthValue == au.monthValue) {
            "du ${premier(du.dayOfMonth)} au ${premier(au.dayOfMonth)} ${MOIS[au.monthValue - 1]}" + annee(au, auj)
        } else if (du.year == au.year) {
            "du ${jourCourt(du)} au ${jourCourt(au)}" + annee(au, auj)
        } else {
            "du ${jourCourt(du)} ${du.year} au ${jourCourt(au)} ${au.year}"
        }
    }

    private fun annee(d: LocalDate, auj: LocalDate): String = if (d.year != auj.year) " ${d.year}" else ""

    fun arrivee(p: PoidsW, auj: LocalDate): String? {
        val du = p.arriveeDu ?: return null
        val au = p.arriveeAu ?: du
        return "Arrivée prévue " + plage(du, au, auj)
    }

    /** « 750 ml », « 1,25 L » */
    fun eau(ml: Int): String {
        if (ml < 1000) return "$ml ml"
        var s = String.format(Locale.FRANCE, "%.2f", ml / 1000.0)
        s = s.trimEnd('0').trimEnd(',')
        return "$s L"
    }

    fun eauObjectif(objectif: Int?): String? = objectif?.let { "sur " + eau(it) }

    fun seances(n: Int): String = if (n > 1) "$n séances" else "$n séance"

    /** « 3 sur 4 » quand tu as un objectif, sinon le nombre de seances */
    fun semaineValeur(s: SemaineW): String = if (s.objectif != null) "${s.faites} sur ${s.objectif}" else s.faites.toString()

    /** « 3 sur 4 », ou « 3 séances » sans objectif */
    fun semaineCourt(s: SemaineW): String = if (s.objectif != null) "${s.faites} sur ${s.objectif}" else seances(s.faites)

    fun semaineTexte(s: SemaineW): String {
        val obj = s.objectif ?: return (if (s.faites > 1) "séances" else "séance") + " cette semaine"
        return when {
            s.faites >= obj -> "Objectif atteint cette semaine"
            else -> "Encore " + seances(obj - s.faites) + " pour ton objectif"
        }
    }

    fun duree(s: Int): String = when {
        s < 60 -> "$s s"
        s % 60 == 0 -> "${s / 60} min"
        else -> "${s / 60} min ${s % 60} s"
    }

    /** « 5 x 5 min », ou « 6 min » pour un seul round */
    fun chronoCourt(c: ChronoW): String = if (c.rounds > 1) "${c.rounds} x ${duree(c.roundS)}" else duree(c.roundS)

    fun chrono(c: ChronoW): String {
        val base = "${c.rounds} x ${duree(c.roundS)}"
        val repos = if (c.reposS > 0) ", repos ${duree(c.reposS)}" else ""
        val nom = c.nom.trim()
        return if (nom.isNotEmpty()) "$nom : $base$repos" else base + repos
    }

    fun joursAvant(date: LocalDate, auj: LocalDate): Long = ChronoUnit.DAYS.between(auj, date)

    fun compteARebours(j: Long): String = if (j <= 0L) "Jour J" else "J-$j"

    fun categorie(kg: Double, unite: String): String {
        val v = versUnite(kg, unite)
        val t = if (abs(v - v.roundToInt()) < 0.05) v.roundToInt().toString() else uneDecimale(v)
        return "Catégorie $t ${suffixe(unite)}"
    }

    /** ecartKg = ton poids moins ta categorie */
    fun reste(ecartKg: Double, unite: String): String {
        val v = versUnite(abs(ecartKg), unite)
        if (ecartKg <= 0.05) return "Dans ta catégorie"
        return uneDecimale(v) + " ${suffixe(unite)} à perdre"
    }
}
