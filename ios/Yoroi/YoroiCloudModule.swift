// YoroiCloudModule.swift
// ─────────────────────────────────────────────────────────
// Module natif pour connecter un dossier cloud (iCloud Drive,
// Google Drive via Fichiers, etc.) à l'app Yoroi.
//
// L'utilisateur sélectionne UN DOSSIER via le picker natif iOS.
// L'app reçoit un security-scoped bookmark persistant qui
// survit aux redémarrages de l'app — pas besoin de re-sélectionner.
//
// API exposée à React Native :
//   pickFolder()              → ouvre le picker dossier, retourne l'info du dossier
//   getSavedFolder()          → retourne le dossier actuellement connecté (ou null)
//   listBackups()             → liste les yoroi_backup_*.json dans le dossier
//   readBackupFile(name)      → lit un fichier du dossier cloud
//   copyToCloudFolder(path)   → copie un backup local vers le dossier cloud
//   disconnectFolder()        → déconnecte le dossier
// ─────────────────────────────────────────────────────────

import Foundation
import UIKit
internal import React

@objc(YoroiCloudModule)
class YoroiCloudModule: NSObject, UIDocumentPickerDelegate {

  @objc static func requiresMainQueueSetup() -> Bool { return true }

  private var pendingResolve: RCTPromiseResolveBlock?
  private var pendingReject:  RCTPromiseRejectBlock?
  private let BOOKMARK_KEY = "yoroi_cloud_folder_bookmark_v1"

  // ──────────────────────────────────────────
  // 1. Ouvrir le sélecteur de dossier
  // ──────────────────────────────────────────

  @objc func pickFolder(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async { [weak self] in
      guard let self = self else { return }

      self.pendingResolve = resolve
      self.pendingReject  = reject

      let picker = UIDocumentPickerViewController(
        forOpeningContentTypes: [.folder],
        asCopy: false
      )
      picker.delegate = self
      picker.allowsMultipleSelection = false
      picker.modalPresentationStyle = .fullScreen

      guard let rootVC = UIApplication.shared.connectedScenes
        .compactMap({ $0 as? UIWindowScene })
        .flatMap({ $0.windows })
        .first(where: { $0.isKeyWindow })?
        .rootViewController else {
          reject("NO_ROOT_VC", "Impossible d'ouvrir le sélecteur", nil)
          return
      }

      // Trouver le VC le plus haut dans la hiérarchie
      var topVC = rootVC
      while let presented = topVC.presentedViewController {
        topVC = presented
      }
      topVC.present(picker, animated: true)
    }
  }

  // ──────────────────────────────────────────
  // UIDocumentPickerDelegate
  // ──────────────────────────────────────────

  func documentPicker(
    _ controller: UIDocumentPickerViewController,
    didPickDocumentsAt urls: [URL]
  ) {
    guard let url = urls.first else {
      pendingResolve?(NSNull())
      cleanup()
      return
    }

    guard url.startAccessingSecurityScopedResource() else {
      pendingReject?("ACCESS_DENIED", "Accès au dossier refusé par iOS", nil)
      cleanup()
      return
    }
    defer { url.stopAccessingSecurityScopedResource() }

    do {
      let bookmarkData = try url.bookmarkData(
        options: .minimalBookmark,
        includingResourceValuesForKeys: nil,
        relativeTo: nil
      )
      let bookmarkBase64 = bookmarkData.base64EncodedString()

      // Persistance dans UserDefaults
      UserDefaults.standard.set(bookmarkBase64, forKey: BOOKMARK_KEY)

      pendingResolve?([
        "displayName": url.lastPathComponent,
        "bookmark":    bookmarkBase64,
      ])
    } catch {
      pendingReject?("BOOKMARK_ERROR", "Impossible de sauvegarder l'accès : \(error.localizedDescription)", nil)
    }
    cleanup()
  }

  func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
    pendingResolve?(NSNull()) // null = annulé
    cleanup()
  }

  private func cleanup() {
    pendingResolve = nil
    pendingReject  = nil
  }

  // ──────────────────────────────────────────
  // 2. Récupérer le dossier sauvegardé
  // ──────────────────────────────────────────

  @objc func getSavedFolder(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let base64 = UserDefaults.standard.string(forKey: BOOKMARK_KEY),
          let data   = Data(base64Encoded: base64) else {
      resolve(NSNull())
      return
    }

    var isStale = false
    do {
      let url = try URL(
        resolvingBookmarkData: data,
        options: .withoutUI,
        relativeTo: nil,
        bookmarkDataIsStale: &isStale
      )
      if isStale {
        // Bookmark périmé → nettoyer
        UserDefaults.standard.removeObject(forKey: BOOKMARK_KEY)
        resolve(NSNull())
        return
      }
      resolve([
        "displayName": url.lastPathComponent,
        "bookmark":    base64,
        "isStale":     isStale,
      ])
    } catch {
      UserDefaults.standard.removeObject(forKey: BOOKMARK_KEY)
      resolve(NSNull())
    }
  }

  // ──────────────────────────────────────────
  // 3. Lister les backups dans le dossier cloud
  // ──────────────────────────────────────────

  @objc func listBackups(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.global(qos: .userInitiated).async { [weak self] in
      guard let self = self else { resolve([]); return }

      guard let base64 = UserDefaults.standard.string(forKey: self.BOOKMARK_KEY),
            let data   = Data(base64Encoded: base64) else {
        resolve([])
        return
      }

      var isStale = false
      do {
        let url = try URL(resolvingBookmarkData: data, options: .withoutUI, relativeTo: nil, bookmarkDataIsStale: &isStale)

        guard url.startAccessingSecurityScopedResource() else {
          resolve([])
          return
        }
        defer { url.stopAccessingSecurityScopedResource() }

        let keys: [URLResourceKey] = [.fileSizeKey, .contentModificationDateKey]
        let contents = try FileManager.default.contentsOfDirectory(
          at: url,
          includingPropertiesForKeys: keys,
          options: .skipsHiddenFiles
        )

        let backups = contents.filter {
          $0.lastPathComponent.hasPrefix("yoroi_backup_") && $0.pathExtension == "json"
        }

        var result: [[String: Any]] = []
        for fileURL in backups {
          let attrs = try? fileURL.resourceValues(forKeys: Set(keys))
          let sizeBytes = attrs?.fileSize ?? 0
          let modDate   = attrs?.contentModificationDate?.timeIntervalSince1970 ?? 0
          result.append([
            "name":       fileURL.lastPathComponent,
            "size":       sizeBytes,
            "modifiedAt": modDate * 1000, // ms pour JS
            "source":     "cloud",
          ])
        }

        // Trier par date décroissante
        result.sort {
          ($0["modifiedAt"] as? Double ?? 0) > ($1["modifiedAt"] as? Double ?? 0)
        }

        resolve(result)
      } catch {
        resolve([])
      }
    }
  }

  // ──────────────────────────────────────────
  // 4. Lire un fichier backup depuis le dossier cloud
  // ──────────────────────────────────────────

  @objc func readBackupFile(
    _ fileName: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.global(qos: .userInitiated).async { [weak self] in
      guard let self = self else { reject("ERR", "Module indisponible", nil); return }

      guard let base64 = UserDefaults.standard.string(forKey: self.BOOKMARK_KEY),
            let data   = Data(base64Encoded: base64) else {
        reject("NO_FOLDER", "Aucun dossier cloud connecté", nil)
        return
      }

      var isStale = false
      do {
        let folderURL = try URL(resolvingBookmarkData: data, options: .withoutUI, relativeTo: nil, bookmarkDataIsStale: &isStale)

        guard folderURL.startAccessingSecurityScopedResource() else {
          reject("ACCESS_DENIED", "Accès au dossier refusé", nil)
          return
        }
        defer { folderURL.stopAccessingSecurityScopedResource() }

        let fileURL = folderURL.appendingPathComponent(fileName)
        let content = try String(contentsOf: fileURL, encoding: .utf8)
        resolve(content)
      } catch {
        reject("READ_ERROR", error.localizedDescription, nil)
      }
    }
  }

  // ──────────────────────────────────────────
  // 5. Copier un backup local vers le dossier cloud
  // ──────────────────────────────────────────

  @objc func copyToCloudFolder(
    _ filePath: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.global(qos: .userInitiated).async { [weak self] in
      guard let self = self else { reject("ERR", "Module indisponible", nil); return }

      guard let base64 = UserDefaults.standard.string(forKey: self.BOOKMARK_KEY),
            let data   = Data(base64Encoded: base64) else {
        reject("NO_FOLDER", "Aucun dossier cloud connecté", nil)
        return
      }

      var isStale = false
      do {
        let folderURL = try URL(resolvingBookmarkData: data, options: .withoutUI, relativeTo: nil, bookmarkDataIsStale: &isStale)

        guard folderURL.startAccessingSecurityScopedResource() else {
          reject("ACCESS_DENIED", "Accès au dossier refusé", nil)
          return
        }
        defer { folderURL.stopAccessingSecurityScopedResource() }

        let sourceURL = URL(fileURLWithPath: filePath)
        let destURL   = folderURL.appendingPathComponent(sourceURL.lastPathComponent)

        // Remplacer si le fichier existe déjà
        try? FileManager.default.removeItem(at: destURL)
        try FileManager.default.copyItem(at: sourceURL, to: destURL)

        resolve(true)
      } catch {
        reject("COPY_ERROR", error.localizedDescription, nil)
      }
    }
  }

  // ──────────────────────────────────────────
  // 6. Déconnecter le dossier cloud
  // ──────────────────────────────────────────

  @objc func disconnectFolder(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    UserDefaults.standard.removeObject(forKey: BOOKMARK_KEY)
    resolve(true)
  }
}
