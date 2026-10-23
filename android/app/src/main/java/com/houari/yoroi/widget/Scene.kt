package com.houari.yoroi.widget

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Rect
import android.graphics.Canvas
import android.graphics.Paint
import android.net.Uri
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL

/**
 * Scene d'Accueil pour le Tableau du jour et le fond du style A : une copie reduite (1080 x 540 au plus, JPEG)
 * gardee dans le stockage interne de l'app.
 */
object Scene {
    private const val LARGEUR_MAX = 1080
    private const val RATIO = 2f // largeur / hauteur gardee

    /** Copie l'image ; uri vide : retire la scene. A appeler hors du fil principal. */
    fun copier(ctx: Context, uri: String?) {
        val cible = Magasin.fichierScene(ctx)
        if (uri.isNullOrBlank()) {
            if (cible.exists()) cible.delete()
            return
        }
        val octets = ouvrir(ctx, uri.trim()).use { lireTout(it) }
        val bornes = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeByteArray(octets, 0, octets.size, bornes)
        if (bornes.outWidth <= 0 || bornes.outHeight <= 0) throw IllegalArgumentException("Image illisible")
        var echantillon = 1
        while (bornes.outWidth / (echantillon * 2) >= LARGEUR_MAX) echantillon *= 2
        val source = BitmapFactory.decodeByteArray(octets, 0, octets.size, BitmapFactory.Options().apply { inSampleSize = echantillon })
            ?: throw IllegalArgumentException("Image illisible")

        // recadrage au centre en 2:1, puis reduction
        val rs = source.width.toFloat() / source.height
        val zone = if (rs > RATIO) {
            val lw = (source.height * RATIO).toInt()
            val x0 = (source.width - lw) / 2
            Rect(x0, 0, x0 + lw, source.height)
        } else {
            val lh = (source.width / RATIO).toInt()
            val y0 = (source.height - lh) / 2
            Rect(0, y0, source.width, y0 + lh)
        }
        val w = minOf(LARGEUR_MAX, zone.width()).coerceAtLeast(1)
        val h = (w / RATIO).toInt().coerceAtLeast(1)
        val sortie = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
        Canvas(sortie).drawBitmap(source, zone, Rect(0, 0, w, h), Paint(Paint.FILTER_BITMAP_FLAG))
        source.recycle()

        val tmp = File(cible.parentFile, "scene.tmp")
        FileOutputStream(tmp).use { sortie.compress(Bitmap.CompressFormat.JPEG, 85, it) }
        sortie.recycle()
        if (cible.exists()) cible.delete()
        if (!tmp.renameTo(cible)) throw IllegalStateException("Copie de la scene impossible")
    }

    fun charger(ctx: Context): Bitmap? = try {
        val f = Magasin.fichierScene(ctx)
        if (f.exists()) BitmapFactory.decodeFile(f.absolutePath) else null
    } catch (e: Throwable) {
        null
    }

    /** Ouvre une image : http (Metro en developpement), asset, fichier, content, ou ressource embarquee */
    internal fun ouvrir(ctx: Context, uri: String): InputStream {
        val bas = uri.lowercase()
        return when {
            bas.startsWith("http://") || bas.startsWith("https://") -> {
                // en developpement, Metro sert les images en http
                val c = URL(uri).openConnection() as HttpURLConnection
                c.connectTimeout = 8000
                c.readTimeout = 8000
                c.inputStream
            }
            bas.startsWith("file:///android_asset/") -> ctx.assets.open(uri.substring("file:///android_asset/".length))
            bas.startsWith("asset:/") -> ctx.assets.open(uri.substring("asset:/".length).trimStart('/'))
            bas.startsWith("file://") || bas.startsWith("content://") || bas.startsWith("android.resource://") ->
                ctx.contentResolver.openInputStream(Uri.parse(uri)) ?: throw IllegalArgumentException("Image introuvable")
            uri.startsWith("/") -> FileInputStream(uri)
            else -> {
                // image embarquee dans l'app (version de production) : nom de ressource
                val res = ctx.resources
                var id = res.getIdentifier(uri, "drawable", ctx.packageName)
                if (id == 0) id = res.getIdentifier(uri, "raw", ctx.packageName)
                if (id == 0) throw IllegalArgumentException("Image introuvable")
                res.openRawResource(id)
            }
        }
    }

    internal fun lireTout(e: InputStream): ByteArray {
        val out = ByteArrayOutputStream()
        val tampon = ByteArray(16 * 1024)
        var total = 0
        while (true) {
            val n = e.read(tampon)
            if (n < 0) break
            total += n
            if (total > 40 * 1024 * 1024) throw IllegalArgumentException("Image trop lourde")
            out.write(tampon, 0, n)
        }
        return out.toByteArray()
    }
}
