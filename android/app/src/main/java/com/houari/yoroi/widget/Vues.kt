package com.houari.yoroi.widget

import android.content.Context
import android.view.View
import android.widget.RemoteViews
import com.houari.yoroi.R

/**
 * Construit l'affichage d'un widget pour sa taille du moment (en dp), dans le style choisi dans l'app
 * (A Nuit de lanternes par defaut, B Rouleau et encre, C Armure laquee : res/layout/yw_*_a, _b, _c).
 */
interface Vue {
    fun construire(ctx: Context, wDp: Int, hDp: Int, d: Donnees, cls: Class<*>): RemoteViews
}

private const val MARGE = 14f * 2

/** 1. Poids : petit (poids, ecart, date), moyen (plus la courbe et l'arrivee), grand (plus phrase, semaine et eau) */
object VuePoids : Vue {
    override fun construire(ctx: Context, wDp: Int, hDp: Int, d: Donnees, cls: Class<*>): RemoteViews {
        val inst = d.inst ?: return Rendu.vide(ctx, R.string.yw_nom_poids, ctx.getString(R.string.yw_vide), Liens.ACCUEIL)
        val p = inst.poids
        val kg = p?.kg
        if (p == null || kg == null) return Rendu.vide(ctx, R.string.yw_nom_poids, "Ajoute ta première pesée", Liens.PESEE)

        val st = Styles.lire(ctx)
        val grand = wDp >= 250 && hDp >= 230
        val moyen = !grand && wDp >= 220
        val gabarit = when {
            grand -> Gabarit.POIDS_GRAND
            moyen -> Gabarit.POIDS_MOYEN
            else -> Gabarit.POIDS_PETIT
        }
        val v = RemoteViews(ctx.packageName, Styles.layout(gabarit, st))
        Styles.fondScene(v, ctx, st, wDp, hDp)
        Rendu.entetePoids(v, inst, p, kg, d, avecDate = true)
        v.setOnClickPendingIntent(android.R.id.background, Liens.ouvrir(ctx, Liens.POIDS))

        if (moyen) {
            val aArrivee = Rendu.arrivee(v, ctx, p, d)
            val gw = (wDp - MARGE - 10f) * 0.6f
            val gh = hDp - MARGE - (if (aArrivee) 20f else 0f)
            Rendu.graphe(v, ctx, d, p, gw, gh.coerceAtLeast(30f), st)
        } else if (grand) {
            val phrase = p.phrase?.takeIf { hDp >= 280 }
            Rendu.texteOuRien(v, R.id.yw_phrase, phrase)
            val aArrivee = Rendu.arrivee(v, ctx, p, d)
            val sem = d.semaine
            val eauMl = d.eauMl
            val eau = inst.eau
            Rendu.montrer(v, R.id.yw_bloc_semaine, sem != null)
            Rendu.montrer(v, R.id.yw_bloc_eau, eau != null && eauMl != null)
            Rendu.montrer(v, R.id.yw_bas, sem != null || (eau != null && eauMl != null))
            if (sem != null) {
                v.setTextViewText(R.id.yw_sem_texte, "Ta semaine : " + Format.semaineCourt(sem))
                Rendu.points(v, sem, d, st)
                v.setOnClickPendingIntent(R.id.yw_bloc_semaine, Liens.ouvrir(ctx, Liens.SEANCES))
            }
            if (eau != null && eauMl != null) {
                v.setTextViewText(R.id.yw_eau_valeur, Format.eau(eauMl))
                Rendu.texteOuRien(v, R.id.yw_eau_objectif, Format.eauObjectif(eau.objectif))
                v.setOnClickPendingIntent(R.id.yw_bloc_eau, Liens.ouvrir(ctx, Liens.EAU))
            }
            val bas = if (sem != null || eau != null) 58f else 0f
            val gh = hDp - MARGE - 52f - (if (phrase != null) 34f else 0f) - (if (aArrivee) 20f else 0f) - bas
            Rendu.graphe(v, ctx, d, p, wDp - MARGE, gh.coerceAtLeast(40f), st)
        }
        return v
    }
}

/** 2. Ta semaine : 7 points, X sur Y, bouton Seance faite */
object VueSemaine : Vue {
    override fun construire(ctx: Context, wDp: Int, hDp: Int, d: Donnees, cls: Class<*>): RemoteViews {
        val sem = d.semaine
        if (d.inst == null || sem == null) return Rendu.vide(ctx, R.string.yw_nom_semaine, ctx.getString(R.string.yw_vide), Liens.ACCUEIL)
        val st = Styles.lire(ctx)
        val v = RemoteViews(ctx.packageName, Styles.layout(Gabarit.SEMAINE, st))
        Styles.fondScene(v, ctx, st, wDp, hDp)
        v.setTextViewText(R.id.yw_valeur, Format.semaineValeur(sem))
        Rendu.texteOuRien(v, R.id.yw_sem_texte, Format.semaineTexte(sem).takeIf { hDp >= 135 })
        Rendu.points(v, sem, d, st)
        Rendu.montrer(v, R.id.yw_bouton_seance, hDp >= 110)
        v.setOnClickPendingIntent(R.id.yw_bouton_seance, Liens.ouvrir(ctx, Liens.SEANCE_FAITE))
        v.setOnClickPendingIntent(android.R.id.background, Liens.ouvrir(ctx, Liens.SEANCES))
        return v
    }
}

/** 3. Eau : anneau vers l'objectif, + 1 verre et retrait sans ouvrir l'app */
object VueEau : Vue {
    override fun construire(ctx: Context, wDp: Int, hDp: Int, d: Donnees, cls: Class<*>): RemoteViews {
        val eau = d.inst?.eau
        val ml = d.eauMl
        if (eau == null || ml == null) return Rendu.vide(ctx, R.string.yw_nom_eau, ctx.getString(R.string.yw_vide), Liens.ACCUEIL)
        val st = Styles.lire(ctx)
        val v = RemoteViews(ctx.packageName, Styles.layout(Gabarit.EAU, st))
        Styles.fondScene(v, ctx, st, wDp, hDp)
        val compact = hDp < 125
        if (compact) {
            v.setViewVisibility(R.id.yw_anneau, View.GONE)
            v.setTextViewText(R.id.yw_eau_valeur_ligne, Format.eau(ml))
            v.setViewVisibility(R.id.yw_eau_valeur_ligne, View.VISIBLE)
        } else {
            val e = Rendu.echelle(ctx)
            val tailleDp = minOf(wDp - MARGE, hDp - MARGE - 18f - 34f - 10f).coerceAtLeast(44f)
            val fraction = eau.objectif?.let { ml.toFloat() / it } ?: 0f
            val (piste, arc) = Dessin.anneau(Rendu.px(tailleDp, e), 6f * e, fraction, st, Styles.sombre(ctx))
            v.setImageViewBitmap(R.id.yw_anneau_piste, piste)
            if (arc != null) v.setImageViewBitmap(R.id.yw_anneau_arc, arc) else v.setViewVisibility(R.id.yw_anneau_arc, View.GONE)
            v.setTextViewText(R.id.yw_eau_valeur, Format.eau(ml))
            Rendu.texteOuRien(v, R.id.yw_eau_objectif, Format.eauObjectif(eau.objectif))
        }
        v.setOnClickPendingIntent(R.id.yw_eau_plus, Liens.eau(ctx, cls, plus = true))
        v.setOnClickPendingIntent(R.id.yw_eau_moins, Liens.eau(ctx, cls, plus = false))
        Rendu.montrer(v, R.id.yw_eau_moins, ml > 0)
        v.setOnClickPendingIntent(android.R.id.background, Liens.ouvrir(ctx, Liens.EAU))
        return v
    }
}

/** 4. Combat : J moins X, categorie, kg restant ; sinon une invitation a ajouter une competition */
object VueCombat : Vue {
    override fun construire(ctx: Context, wDp: Int, hDp: Int, d: Donnees, cls: Class<*>): RemoteViews {
        val inst = d.inst ?: return Rendu.vide(ctx, R.string.yw_nom_combat, ctx.getString(R.string.yw_vide), Liens.ACCUEIL)
        val st = Styles.lire(ctx)
        val v = RemoteViews(ctx.packageName, Styles.layout(Gabarit.COMBAT, st))
        Styles.fondScene(v, ctx, st, wDp, hDp)
        val c = d.combat
        if (c == null) {
            v.setViewVisibility(R.id.yw_c_avec, View.GONE)
            v.setViewVisibility(R.id.yw_c_sans, View.VISIBLE)
            v.setOnClickPendingIntent(R.id.yw_c_ajouter, Liens.ouvrir(ctx, Liens.AJOUT_COMPET))
            v.setOnClickPendingIntent(android.R.id.background, Liens.ouvrir(ctx, Liens.AJOUT_COMPET))
            return v
        }
        v.setTextViewText(R.id.yw_c_j, Format.compteARebours(Format.joursAvant(c.date, d.aujourdhui)))
        v.setTextViewText(R.id.yw_c_date, Format.jourLongMaj(c.date))
        Rendu.texteOuRien(v, R.id.yw_c_cat, c.categorieKg?.let { Format.categorie(it, inst.unite) })
        Rendu.texteOuRien(v, R.id.yw_c_reste, c.ecartKg?.let { Format.reste(it, inst.unite) })
        v.setOnClickPendingIntent(android.R.id.background, Liens.ouvrir(ctx, Liens.COMBAT))
        return v
    }
}

/**
 * 5. Chrono rounds : un grand visuel (chronometre dore, gants dans un cercle a l'encre, ou gong et ton personnage),
 * le nom de ton dernier reglage (« MMA ») et ses rounds (« 5 x 5 min ») en gros. Un appui ouvre le chrono.
 */
object VueChrono : Vue {
    override fun construire(ctx: Context, wDp: Int, hDp: Int, d: Donnees, cls: Class<*>): RemoteViews {
        val st = Styles.lire(ctx)
        val v = RemoteViews(ctx.packageName, Styles.layout(Gabarit.CHRONO, st))
        Styles.fondScene(v, ctx, st, wDp, hDp)
        val chronos = d.inst?.chronos.orEmpty()
        val c = chronos.firstOrNull { it.id == "tes_rounds" } ?: chronos.firstOrNull()
        val nom = c?.nom?.trim().orEmpty()
        v.setTextViewText(R.id.yw_chrono_nom, if (nom.isNotEmpty()) nom else ctx.getString(R.string.yw_nom_chrono))
        val detail = c?.takeIf { it.rounds > 0 && it.roundS > 0 }?.let { Format.chronoCourt(it) } ?: "Ouvre ton chrono"
        v.setTextViewText(R.id.yw_chrono_detail, detail)
        // widget bas (une ligne) : le grand visuel laisse la place au texte
        Rendu.montrer(v, R.id.yw_chrono_haut, hDp >= 100)
        if (st == StyleW.C) {
            if (hDp >= 100) Personnage.charger(ctx)?.let { v.setImageViewBitmap(R.id.yw_perso, it) } else v.setViewVisibility(R.id.yw_perso, View.GONE)
        }
        v.setOnClickPendingIntent(android.R.id.background, Liens.ouvrir(ctx, Liens.CHRONO))
        return v
    }
}

/** 6. Tableau du jour : bandeau de ta scene, poids et courbe, semaine, eau, prochain combat */
object VueTableau : Vue {
    override fun construire(ctx: Context, wDp: Int, hDp: Int, d: Donnees, cls: Class<*>): RemoteViews {
        val inst = d.inst ?: return Rendu.vide(ctx, R.string.yw_nom_tableau, ctx.getString(R.string.yw_vide), Liens.ACCUEIL)
        val st = Styles.lire(ctx)
        val v = RemoteViews(ctx.packageName, Styles.layout(Gabarit.TABLEAU, st))
        Styles.fondScene(v, ctx, st, wDp, hDp)
        val e = Rendu.echelle(ctx)
        // A : 78 dp sur ta scene ; B et C : une fenetre ou un bandeau de 84 dp, a 10 dp des bords
        val banniereDp = if (st == StyleW.A) 78f else 94f
        v.setOnClickPendingIntent(android.R.id.background, Liens.ouvrir(ctx, Liens.ACCUEIL))

        // bandeau de la scene
        val avecBanniere = hDp >= 240
        Rendu.montrer(v, R.id.yw_banniere, avecBanniere)
        if (avecBanniere) {
            v.setTextViewText(R.id.yw_t_date, Format.jourLongMaj(d.aujourdhui))
            when (st) {
                // A : ta scene est deja le fond du widget
                StyleW.A -> v.setViewVisibility(R.id.yw_scene, View.GONE)
                // B : ta scene nette dans une fenetre arrondie (sinon le chateau, ou la nuit en sombre)
                StyleW.B -> {
                    val scene = if (hDp >= 280) Scene.charger(ctx) else null
                    if (scene != null) {
                        val b = Dessin.banniere(scene, Rendu.px(wDp - 20f, e), Rendu.px(84f, e), 14f * e, tousLesCoins = true)
                        scene.recycle()
                        v.setImageViewBitmap(R.id.yw_scene, b)
                    }
                    v.setViewVisibility(R.id.yw_scene, View.VISIBLE)
                }
                // C : bandeau de laque et ton personnage
                StyleW.C -> Personnage.charger(ctx)?.let { v.setImageViewBitmap(R.id.yw_perso, it) }
            }
        }

        // poids et courbe
        val p = inst.poids
        val kg = p?.kg
        var arriveeVue = false
        if (p != null && kg != null) {
            Rendu.entetePoids(v, inst, p, kg, d, avecDate = false)
            arriveeVue = Rendu.arrivee(v, ctx, p, d)
        } else {
            v.setTextViewText(R.id.yw_valeur, "À venir")
            Rendu.statut(v, "aucun", "Ajoute ta pesée")
            v.setViewVisibility(R.id.yw_arrivee, View.GONE)
        }
        v.setOnClickPendingIntent(R.id.yw_bloc_poids, Liens.ouvrir(ctx, if (kg != null) Liens.POIDS else Liens.PESEE))

        // semaine
        val sem = d.semaine
        val avecSemaine = sem != null && hDp >= 200
        Rendu.montrer(v, R.id.yw_bloc_semaine, avecSemaine)
        if (sem != null && avecSemaine) {
            v.setTextViewText(R.id.yw_sem_texte, Format.semaineCourt(sem))
            Rendu.points(v, sem, d, st)
            v.setOnClickPendingIntent(R.id.yw_bloc_semaine, Liens.ouvrir(ctx, Liens.SEANCES))
        }

        // eau
        val eau = inst.eau
        val ml = d.eauMl
        val avecEau = eau != null && ml != null
        Rendu.montrer(v, R.id.yw_bloc_eau, avecEau)
        if (eau != null && ml != null) {
            v.setTextViewText(R.id.yw_eau_valeur, Format.eau(ml))
            Rendu.texteOuRien(v, R.id.yw_eau_objectif, Format.eauObjectif(eau.objectif))
            v.setOnClickPendingIntent(R.id.yw_eau_plus, Liens.eau(ctx, cls, plus = true))
            v.setOnClickPendingIntent(R.id.yw_bloc_eau, Liens.ouvrir(ctx, Liens.EAU))
        }

        // prochain combat
        val c = d.combat
        if (c != null) {
            v.setTextViewText(R.id.yw_c_j, Format.compteARebours(Format.joursAvant(c.date, d.aujourdhui)))
            val detail = c.ecartKg?.let { Format.reste(it, inst.unite) } ?: c.categorieKg?.let { Format.categorie(it, inst.unite) }
            Rendu.texteOuRien(v, R.id.yw_c_cat, detail ?: Format.jourCourt(c.date))
            v.setOnClickPendingIntent(R.id.yw_bloc_combat, Liens.ouvrir(ctx, Liens.COMBAT))
        } else {
            v.setTextViewText(R.id.yw_c_j, "Aucune")
            v.setTextViewText(R.id.yw_c_cat, "compétition prévue")
            v.setOnClickPendingIntent(R.id.yw_bloc_combat, Liens.ouvrir(ctx, Liens.AJOUT_COMPET))
        }

        // la courbe prend la place qui reste
        if (p != null && kg != null) {
            val reste = hDp - (if (avecBanniere) banniereDp else 0f) - 8f - 14f -
                (if (avecSemaine) 59f else 0f) - 58f - (if (arriveeVue) 20f else 0f)
            Rendu.graphe(v, ctx, d, p, (wDp - MARGE - 10f) * 0.6f, reste.coerceAtLeast(34f), st)
        } else {
            v.setViewVisibility(R.id.yw_graphe, View.GONE)
        }
        return v
    }
}
