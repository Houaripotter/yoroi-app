package com.houari.yoroi

// ============================================================
// YoroiCloudModule.kt — Android
// ============================================================
// Module natif Android pour connecter un dossier cloud
// (Google Drive, OneDrive, Dropbox, stockage local…) à l'app.
//
// Utilise le Storage Access Framework (SAF) d'Android :
//   ACTION_OPEN_DOCUMENT_TREE  → sélecteur de dossier natif
//   takePersistableUriPermission → accès persistant cross-reboot
//   SharedPreferences          → stockage du content URI
//
// API exposée à React Native :
//   pickFolder()              → ouvre le sélecteur, retourne {displayName, bookmark}
//   getSavedFolder()          → retourne le dossier connecté ou null
//   listBackups()             → liste les yoroi_backup_*.json du dossier
//   readBackupFile(name)      → lit un fichier du dossier cloud
//   copyToCloudFolder(path)   → copie un fichier local vers le dossier cloud
//   disconnectFolder()        → déconnecte le dossier
// ============================================================

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.DocumentsContract
import androidx.documentfile.provider.DocumentFile

import com.facebook.react.bridge.*

private const val PICK_FOLDER_REQUEST = 4237
private const val PREFS_NAME         = "YoroiCloudPrefs"
private const val KEY_FOLDER_URI     = "cloud_folder_uri_v1"

class YoroiCloudModule(private val reactContext: ReactApplicationContext)
    : ReactContextBaseJavaModule(reactContext), ActivityEventListener {

    private var pendingPromise: Promise? = null

    init {
        reactContext.addActivityEventListener(this)
    }

    override fun getName() = "YoroiCloudModule"

    // ──────────────────────────────────────────
    // 1. Ouvrir le sélecteur de dossier
    // ──────────────────────────────────────────

    @ReactMethod
    fun pickFolder(promise: Promise) {
        val activity = currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "Aucune activité disponible")
            return
        }
        pendingPromise = promise

        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT_TREE).apply {
            addFlags(
                Intent.FLAG_GRANT_READ_URI_PERMISSION  or
                Intent.FLAG_GRANT_WRITE_URI_PERMISSION or
                Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION or
                Intent.FLAG_GRANT_PREFIX_URI_PERMISSION
            )
        }
        activity.startActivityForResult(intent, PICK_FOLDER_REQUEST)
    }

    override fun onActivityResult(activity: Activity?, requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode != PICK_FOLDER_REQUEST) return
        val promise = pendingPromise ?: return
        pendingPromise = null

        if (resultCode != Activity.RESULT_OK || data == null) {
            promise.resolve(null) // annulé
            return
        }

        val uri = data.data ?: run {
            promise.resolve(null)
            return
        }

        // Persister la permission cross-reboot
        try {
            reactContext.contentResolver.takePersistableUriPermission(
                uri,
                Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
            )
        } catch (e: Exception) {
            // Sur certains providers (ex: stockage interne restreint) c'est non-persistable — on continue quand même
        }

        // Sauvegarder l'URI
        val prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString(KEY_FOLDER_URI, uri.toString()).apply()

        // Récupérer le nom du dossier
        val displayName = getDisplayName(uri) ?: uri.lastPathSegment ?: "Dossier cloud"

        val result = Arguments.createMap().apply {
            putString("displayName", displayName)
            putString("bookmark", uri.toString())
        }
        promise.resolve(result)
    }

    override fun onNewIntent(intent: Intent?) {}

    // ──────────────────────────────────────────
    // 2. Récupérer le dossier sauvegardé
    // ──────────────────────────────────────────

    @ReactMethod
    fun getSavedFolder(promise: Promise) {
        val prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val uriStr = prefs.getString(KEY_FOLDER_URI, null)
        if (uriStr == null) {
            promise.resolve(null)
            return
        }
        val uri = Uri.parse(uriStr)

        // Vérifier que la permission est toujours valide
        val hasPerm = reactContext.contentResolver.persistedUriPermissions.any {
            it.uri == uri && it.isReadPermission
        }
        // Sur certains appareils (fichiers locaux) la permission n'est pas dans la liste
        // mais le dossier reste accessible — on tente quand même de le retourner
        val displayName = getDisplayName(uri) ?: uri.lastPathSegment ?: "Dossier cloud"

        val result = Arguments.createMap().apply {
            putString("displayName", displayName)
            putString("bookmark", uriStr)
        }
        promise.resolve(result)
    }

    // ──────────────────────────────────────────
    // 3. Lister les backups dans le dossier
    // ──────────────────────────────────────────

    @ReactMethod
    fun listBackups(promise: Promise) {
        val prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val uriStr = prefs.getString(KEY_FOLDER_URI, null)
        if (uriStr == null) {
            promise.resolve(Arguments.createArray())
            return
        }

        Thread {
            try {
                val uri = Uri.parse(uriStr)
                val docFolder = DocumentFile.fromTreeUri(reactContext, uri)
                if (docFolder == null || !docFolder.exists()) {
                    promise.resolve(Arguments.createArray())
                    return@Thread
                }

                val result = Arguments.createArray()
                val files = docFolder.listFiles()

                // Collecter puis trier par date décroissante
                val backupList = files
                    .filter { file ->
                        val name = file.name ?: ""
                        name.startsWith("yoroi_backup_") && name.endsWith(".json")
                    }
                    .sortedByDescending { it.lastModified() }

                for (file in backupList) {
                    val map = Arguments.createMap().apply {
                        putString("name", file.name ?: "")
                        putDouble("size", file.length().toDouble())
                        putDouble("modifiedAt", file.lastModified().toDouble())
                        putString("source", "cloud")
                    }
                    result.pushMap(map)
                }
                promise.resolve(result)
            } catch (e: Exception) {
                promise.resolve(Arguments.createArray())
            }
        }.start()
    }

    // ──────────────────────────────────────────
    // 4. Lire un fichier backup depuis le dossier
    // ──────────────────────────────────────────

    @ReactMethod
    fun readBackupFile(fileName: String, promise: Promise) {
        val prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val uriStr = prefs.getString(KEY_FOLDER_URI, null)
        if (uriStr == null) {
            promise.reject("NO_FOLDER", "Aucun dossier cloud connecté")
            return
        }

        Thread {
            try {
                val uri = Uri.parse(uriStr)
                val docFolder = DocumentFile.fromTreeUri(reactContext, uri)
                val file = docFolder?.findFile(fileName)

                if (file == null || !file.exists()) {
                    promise.reject("NOT_FOUND", "Fichier introuvable : $fileName")
                    return@Thread
                }

                val content = reactContext.contentResolver.openInputStream(file.uri)?.use {
                    it.bufferedReader(Charsets.UTF_8).readText()
                }

                if (content == null) {
                    promise.reject("READ_ERROR", "Impossible de lire le fichier")
                } else {
                    promise.resolve(content)
                }
            } catch (e: Exception) {
                promise.reject("READ_ERROR", e.localizedMessage ?: "Erreur lecture")
            }
        }.start()
    }

    // ──────────────────────────────────────────
    // 5. Copier un fichier local vers le dossier cloud
    // ──────────────────────────────────────────

    @ReactMethod
    fun copyToCloudFolder(filePath: String, promise: Promise) {
        val prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val uriStr = prefs.getString(KEY_FOLDER_URI, null)
        if (uriStr == null) {
            promise.reject("NO_FOLDER", "Aucun dossier cloud connecté")
            return
        }

        Thread {
            try {
                val uri = Uri.parse(uriStr)
                val docFolder = DocumentFile.fromTreeUri(reactContext, uri)
                if (docFolder == null || !docFolder.canWrite()) {
                    promise.reject("ACCESS_DENIED", "Écriture refusée dans le dossier cloud")
                    return@Thread
                }

                val sourceFile = java.io.File(filePath)
                if (!sourceFile.exists()) {
                    promise.reject("NOT_FOUND", "Fichier source introuvable : $filePath")
                    return@Thread
                }

                val fileName = sourceFile.name

                // Supprimer si existe déjà
                docFolder.findFile(fileName)?.delete()

                // Créer et écrire le nouveau fichier
                val destFile = docFolder.createFile("application/json", fileName)
                if (destFile == null) {
                    promise.reject("CREATE_ERROR", "Impossible de créer le fichier dans le dossier cloud")
                    return@Thread
                }

                reactContext.contentResolver.openOutputStream(destFile.uri)?.use { out ->
                    sourceFile.inputStream().use { input ->
                        input.copyTo(out)
                    }
                }

                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("COPY_ERROR", e.localizedMessage ?: "Erreur copie")
            }
        }.start()
    }

    // ──────────────────────────────────────────
    // 6. Déconnecter le dossier cloud
    // ──────────────────────────────────────────

    @ReactMethod
    fun disconnectFolder(promise: Promise) {
        val prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val uriStr = prefs.getString(KEY_FOLDER_URI, null)

        if (uriStr != null) {
            try {
                val uri = Uri.parse(uriStr)
                reactContext.contentResolver.releasePersistableUriPermission(
                    uri,
                    Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                )
            } catch (_: Exception) {}
        }

        prefs.edit().remove(KEY_FOLDER_URI).apply()
        promise.resolve(true)
    }

    // ──────────────────────────────────────────
    // Utilitaire : nom d'affichage du dossier
    // ──────────────────────────────────────────

    private fun getDisplayName(uri: Uri): String? {
        return try {
            val docFile = DocumentFile.fromTreeUri(reactContext, uri)
            docFile?.name
        } catch (_: Exception) {
            null
        }
    }
}
