package com.houari.yoroi.widget

import android.content.Context
import android.content.res.Configuration
import android.widget.RemoteViews
import com.houari.yoroi.R

/** Les trois styles des widgets (13 octobre) : A Nuit de lanternes (par defaut), B Rouleau et encre, C Armure laquee */
enum class StyleW { A, B, C }

/** Les gabarits d'affichage, chacun decline dans les trois styles (res/layout/yw_*_a, _b, _c) */
enum class Gabarit { POIDS_PETIT, POIDS_MOYEN, POIDS_GRAND, SEMAINE, EAU, COMBAT, CHRONO, TABLEAU, VIDE }

/**
 * Style choisi dans l'app (Reglages, Style des widgets, module natif setStyle), lu dans les SharedPreferences.
 * Les couleurs et les images des layouts suivent seules le mode clair ou sombre de l'ecran d'accueil
 * (values-night, drawable-night) ; seuls les dessins en Bitmap (halo) demandent le mode du moment.
 */
object Styles {
    fun lire(ctx: Context): StyleW = when (Magasin.style(ctx)) {
        "B" -> StyleW.B
        "C" -> StyleW.C
        else -> StyleW.A
    }

    fun sombre(ctx: Context): Boolean =
        (ctx.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES

    fun layout(g: Gabarit, s: StyleW): Int = when (g) {
        Gabarit.POIDS_PETIT -> when (s) { StyleW.A -> R.layout.yw_poids_petit_a; StyleW.B -> R.layout.yw_poids_petit_b; StyleW.C -> R.layout.yw_poids_petit_c }
        Gabarit.POIDS_MOYEN -> when (s) { StyleW.A -> R.layout.yw_poids_moyen_a; StyleW.B -> R.layout.yw_poids_moyen_b; StyleW.C -> R.layout.yw_poids_moyen_c }
        Gabarit.POIDS_GRAND -> when (s) { StyleW.A -> R.layout.yw_poids_grand_a; StyleW.B -> R.layout.yw_poids_grand_b; StyleW.C -> R.layout.yw_poids_grand_c }
        Gabarit.SEMAINE -> when (s) { StyleW.A -> R.layout.yw_semaine_a; StyleW.B -> R.layout.yw_semaine_b; StyleW.C -> R.layout.yw_semaine_c }
        Gabarit.EAU -> when (s) { StyleW.A -> R.layout.yw_eau_a; StyleW.B -> R.layout.yw_eau_b; StyleW.C -> R.layout.yw_eau_c }
        Gabarit.COMBAT -> when (s) { StyleW.A -> R.layout.yw_combat_a; StyleW.B -> R.layout.yw_combat_b; StyleW.C -> R.layout.yw_combat_c }
        Gabarit.CHRONO -> when (s) { StyleW.A -> R.layout.yw_chrono_a; StyleW.B -> R.layout.yw_chrono_b; StyleW.C -> R.layout.yw_chrono_c }
        Gabarit.TABLEAU -> when (s) { StyleW.A -> R.layout.yw_tableau_a; StyleW.B -> R.layout.yw_tableau_b; StyleW.C -> R.layout.yw_tableau_c }
        Gabarit.VIDE -> when (s) { StyleW.A -> R.layout.yw_vide_a; StyleW.B -> R.layout.yw_vide_b; StyleW.C -> R.layout.yw_vide_c }
    }

    /** Jours de la semaine : (seance faite, aujourd'hui, a venir) */
    fun points(s: StyleW): Triple<Int, Int, Int> = when (s) {
        StyleW.A -> Triple(R.drawable.yw_a_point_plein, R.drawable.yw_a_point_auj, R.drawable.yw_a_point_vide)
        StyleW.B -> Triple(R.drawable.yw_b_point_plein, R.drawable.yw_b_point_auj, R.drawable.yw_b_point_vide)
        StyleW.C -> Triple(R.drawable.yw_c_point_plein, R.drawable.yw_c_point_auj, R.drawable.yw_c_point_vide)
    }

    /**
     * Style A : ta scene d'Accueil en plein fond, recadree a la taille du widget (sinon l'image du layout,
     * la ruelle au couchant en clair et les nuits de lanternes en sombre).
     */
    fun fondScene(v: RemoteViews, ctx: Context, s: StyleW, wDp: Int, hDp: Int) {
        if (s != StyleW.A) return
        val scene = Scene.charger(ctx) ?: return
        try {
            val e = minOf(Rendu.echelle(ctx), 2f)
            val densite = ctx.resources.displayMetrics.density
            val rayon = ctx.resources.getDimension(R.dimen.yw_rayon) / densite * e
            val b = Dessin.recadre(scene, Rendu.px(wDp.toFloat(), e), Rendu.px(hDp.toFloat(), e), rayon)
            v.setImageViewBitmap(R.id.yw_fond_img, b)
        } finally {
            scene.recycle()
        }
    }
}
