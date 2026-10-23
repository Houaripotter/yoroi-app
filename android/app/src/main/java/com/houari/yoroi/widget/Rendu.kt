package com.houari.yoroi.widget

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.view.View
import android.widget.RemoteViews
import com.houari.yoroi.R

/**
 * Liens profonds vers les ecrans de l'app et boutons du widget.
 * Un seul format yoroi://w/<cible>, le meme que sur iPhone, traduit par l'app (lib/v2/widgets/liens.ts).
 */
object Liens {
    const val ACCUEIL = "yoroi://w/accueil"
    const val POIDS = "yoroi://w/poids"
    const val PESEE = "yoroi://w/pesee"
    const val SEANCES = "yoroi://w/semaine"
    const val SEANCE_FAITE = "yoroi://w/seance-faite"
    const val EAU = "yoroi://w/eau"
    const val COMBAT = "yoroi://w/combat"
    const val AJOUT_COMPET = "yoroi://w/ajout-combat"
    const val CHRONO = "yoroi://w/timer?mode=combat"

    const val ACTION_EAU_PLUS = "com.houari.yoroi.widget.EAU_PLUS"
    const val ACTION_EAU_MOINS = "com.houari.yoroi.widget.EAU_MOINS"
    const val EXTRA_JETON = "jeton"

    fun ouvrir(ctx: Context, url: String): PendingIntent {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
            setPackage(ctx.packageName)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        // requestCode distinct par cible (et l'URL differe dans l'Intent) : chaque zone garde son propre lien
        return PendingIntent.getActivity(
            ctx, url.hashCode(), intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }

    fun eau(ctx: Context, cls: Class<*>, plus: Boolean): PendingIntent {
        val intent = Intent(ctx, cls).apply {
            action = if (plus) ACTION_EAU_PLUS else ACTION_EAU_MOINS
            putExtra(EXTRA_JETON, Magasin.jeton(ctx))
        }
        return PendingIntent.getBroadcast(
            ctx, if (plus) 7101 else 7102, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }
}

/** Morceaux communs a plusieurs widgets */
object Rendu {
    /** Echelle des dessins : la densite de l'ecran, plafonnee pour garder des Bitmap legers */
    fun echelle(ctx: Context): Float = minOf(ctx.resources.displayMetrics.density, 2.75f)

    fun px(dp: Float, e: Float): Int = (dp * e).toInt().coerceAtLeast(1)

    fun vide(ctx: Context, titre: Int, message: String, url: String): RemoteViews =
        RemoteViews(ctx.packageName, Styles.layout(Gabarit.VIDE, Styles.lire(ctx))).apply {
            setTextViewText(R.id.yw_titre, ctx.getString(titre))
            setTextViewText(R.id.yw_message, message)
            setOnClickPendingIntent(android.R.id.background, Liens.ouvrir(ctx, url))
        }

    fun montrer(v: RemoteViews, id: Int, oui: Boolean) = v.setViewVisibility(id, if (oui) View.VISIBLE else View.GONE)

    fun texteOuRien(v: RemoteViews, id: Int, texte: CharSequence?) {
        if (texte.isNullOrEmpty()) {
            v.setViewVisibility(id, View.GONE)
        } else {
            v.setTextViewText(id, texte)
            v.setViewVisibility(id, View.VISIBLE)
        }
    }

    /** Ecart au rythme dans la couleur de ton allure (une ligne par couleur, une seule visible) */
    fun statut(v: RemoteViews, statut: String, texte: String?) {
        val ids = mapOf(
            "allure" to R.id.yw_ecart_allure,
            "dessus" to R.id.yw_ecart_dessus,
            "vite" to R.id.yw_ecart_vite,
            "aucun" to R.id.yw_ecart_aucun,
        )
        for (id in ids.values) v.setViewVisibility(id, View.GONE)
        if (texte.isNullOrEmpty()) return
        val id = ids[statut] ?: R.id.yw_ecart_aucun
        v.setTextViewText(id, texte)
        v.setViewVisibility(id, View.VISIBLE)
    }

    /** Courbe 30 jours dans yw_graphe, a la taille prevue en dp ; cache le graphe sans points */
    fun graphe(v: RemoteViews, ctx: Context, d: Donnees, p: PoidsW, wDp: Float, hDp: Float, style: StyleW = Styles.lire(ctx)) {
        val e = echelle(ctx)
        val sombre = style != StyleW.B && Styles.sombre(ctx)
        val c = Dessin.courbe(p.serie, p.ligne, d.aujourdhui, px(wDp, e), px(hDp, e), e, style, sombre)
        if (c.courbe == null && c.ligne == null) {
            v.setViewVisibility(R.id.yw_graphe, View.GONE)
            return
        }
        v.setViewVisibility(R.id.yw_graphe, View.VISIBLE)
        if (c.ligne != null) v.setImageViewBitmap(R.id.yw_g_ligne, c.ligne) else v.setViewVisibility(R.id.yw_g_ligne, View.GONE)
        if (c.courbe != null) v.setImageViewBitmap(R.id.yw_g_courbe, c.courbe) else v.setViewVisibility(R.id.yw_g_courbe, View.GONE)
        val points = mapOf(
            "allure" to R.id.yw_g_pt_allure,
            "dessus" to R.id.yw_g_pt_dessus,
            "vite" to R.id.yw_g_pt_vite,
            "aucun" to R.id.yw_g_pt_aucun,
        )
        for (id in points.values) v.setViewVisibility(id, View.GONE)
        if (c.point != null) {
            val id = points[p.statut] ?: R.id.yw_g_pt_aucun
            v.setImageViewBitmap(id, c.point)
            v.setViewVisibility(id, View.VISIBLE)
        }
    }

    /** « Arrivee prevue du X au Y » avec le torii, ou rien */
    fun arrivee(v: RemoteViews, ctx: Context, p: PoidsW, d: Donnees): Boolean {
        val texte = Format.arrivee(p, d.aujourdhui)
        if (texte == null) {
            v.setViewVisibility(R.id.yw_arrivee, View.GONE)
            return false
        }
        val e = echelle(ctx)
        val (rouge, haut) = Dessin.torii(px(17f, e), px(14f, e))
        v.setImageViewBitmap(R.id.yw_torii_rouge, rouge)
        v.setImageViewBitmap(R.id.yw_torii_haut, haut)
        v.setTextViewText(R.id.yw_arrivee_texte, texte)
        v.setViewVisibility(R.id.yw_arrivee, View.VISIBLE)
        return true
    }

    private val POINTS = intArrayOf(R.id.yw_j0, R.id.yw_j1, R.id.yw_j2, R.id.yw_j3, R.id.yw_j4, R.id.yw_j5, R.id.yw_j6)

    /** Les 7 points de la semaine dans le style : points dores (A), cachets (B), losanges (C) ; aujourd'hui cerne */
    fun points(v: RemoteViews, s: SemaineW, d: Donnees, style: StyleW) {
        val auj = d.aujourdhui.dayOfWeek.value - 1
        val (plein, aujourdhui, avenir) = Styles.points(style)
        for (i in 0 until 7) {
            val res = when {
                s.jours.getOrElse(i) { false } -> plein
                i == auj -> aujourdhui
                else -> avenir
            }
            v.setImageViewResource(POINTS[i], res)
        }
    }

    /** Poids en grand, ecart colore et date de la pesee */
    fun entetePoids(v: RemoteViews, inst: Instantane, p: PoidsW, kg: Double, d: Donnees, avecDate: Boolean) {
        v.setTextViewText(R.id.yw_valeur, Format.poidsGrand(kg, inst.unite))
        statut(v, p.statut, p.ecart?.let { Format.ecart(it, inst.unite) })
        if (avecDate) texteOuRien(v, R.id.yw_date, Format.datePesee(p.date, d.aujourdhui))
    }
}
