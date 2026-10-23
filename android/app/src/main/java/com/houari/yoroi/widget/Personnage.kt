package com.houari.yoroi.widget

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Rect
import java.io.File
import java.io.FileOutputStream

/**
 * Ton personnage pour le style C (Armure laquee) : la meme image que l'Accueil, sans rang ni XP,
 * copiee reduite (600 px de haut au plus, PNG transparent) dans le stockage interne de l'app.
 */
object Personnage {
    private const val HAUTEUR_MAX = 600

    /** Copie l'image ; uri vide : la retire (« Sans personnage »). A appeler hors du fil principal. */
    fun copier(ctx: Context, uri: String?) {
        val cible = Magasin.fichierPersonnage(ctx)
        if (uri.isNullOrBlank()) {
            if (cible.exists()) cible.delete()
            return
        }
        val octets = Scene.ouvrir(ctx, uri.trim()).use { Scene.lireTout(it) }
        val bornes = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeByteArray(octets, 0, octets.size, bornes)
        if (bornes.outWidth <= 0 || bornes.outHeight <= 0) throw IllegalArgumentException("Image illisible")
        var echantillon = 1
        while (bornes.outHeight / (echantillon * 2) >= HAUTEUR_MAX) echantillon *= 2
        val source = BitmapFactory.decodeByteArray(octets, 0, octets.size, BitmapFactory.Options().apply { inSampleSize = echantillon })
            ?: throw IllegalArgumentException("Image illisible")
        val f = minOf(1f, HAUTEUR_MAX.toFloat() / source.height)
        val w = (source.width * f).toInt().coerceAtLeast(1)
        val h = (source.height * f).toInt().coerceAtLeast(1)
        val sortie = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
        Canvas(sortie).drawBitmap(source, Rect(0, 0, source.width, source.height), Rect(0, 0, w, h), Paint(Paint.FILTER_BITMAP_FLAG))
        source.recycle()

        val tmp = File(cible.parentFile, "personnage.tmp")
        FileOutputStream(tmp).use { sortie.compress(Bitmap.CompressFormat.PNG, 100, it) }
        sortie.recycle()
        if (cible.exists()) cible.delete()
        if (!tmp.renameTo(cible)) throw IllegalStateException("Copie du personnage impossible")
    }

    fun charger(ctx: Context): Bitmap? = try {
        val f = Magasin.fichierPersonnage(ctx)
        if (f.exists()) BitmapFactory.decodeFile(f.absolutePath) else null
    } catch (e: Throwable) {
        null
    }
}
