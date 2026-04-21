// YoroiPlacesModule.swift
// MKLocalSearchCompleter (moteur autocomplete Apple Maps) + MKLocalSearch pour les coords.
// Fix: debounce sur les mises à jour du completer (il est appelé plusieurs fois).

import Foundation
import MapKit
internal import React

@objc(YoroiPlacesModule)
class YoroiPlacesModule: NSObject, MKLocalSearchCompleterDelegate {

  @objc static func requiresMainQueueSetup() -> Bool { return true }

  private var completer: MKLocalSearchCompleter?
  private var pendingResolve: RCTPromiseResolveBlock?
  private var pendingQuery: String = ""
  private var regionLat: Double = 0
  private var regionLon: Double = 0
  private var debounceTimer: Timer?
  private var timeoutTimer: Timer?

  @objc func searchPlaces(
    _ query: String,
    regionLat: Double,
    regionLon: Double,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let trimmed = query.trimmingCharacters(in: .whitespaces)
    guard !trimmed.isEmpty else { resolve("[]"); return }

    DispatchQueue.main.async { [weak self] in
      guard let self = self else { resolve("[]"); return }

      // Annuler la recherche précédente
      self.debounceTimer?.invalidate()
      self.timeoutTimer?.invalidate()
      self.completer?.cancel()
      if self.pendingResolve != nil {
        self.pendingResolve?("[]")
        self.pendingResolve = nil
      }

      self.pendingResolve = resolve
      self.pendingQuery = trimmed
      self.regionLat = regionLat
      self.regionLon = regionLon

      let c = MKLocalSearchCompleter()
      c.delegate = self
      c.resultTypes = [.pointOfInterest, .address, .query]
      // Si GPS fourni, biaiser légèrement — sinon recherche mondiale sans région
      if regionLat != 0 || regionLon != 0 {
        let span = MKCoordinateSpan(latitudeDelta: 0.5, longitudeDelta: 0.5)
        let center = CLLocationCoordinate2D(latitude: regionLat, longitude: regionLon)
        c.region = MKCoordinateRegion(center: center, span: span)
      }
      // Pas de région = Apple Maps cherche dans le monde entier
      c.queryFragment = trimmed
      self.completer = c

      // Timeout global 5s
      self.timeoutTimer = Timer.scheduledTimer(withTimeInterval: 5.0, repeats: false) { [weak self] _ in
        self?.flush()
      }
    }
  }

  // Appelé plusieurs fois — on debounce 300ms pour laisser les résultats se stabiliser
  func completerDidUpdateResults(_ completer: MKLocalSearchCompleter) {
    debounceTimer?.invalidate()
    debounceTimer = Timer.scheduledTimer(withTimeInterval: 0.3, repeats: false) { [weak self] _ in
      self?.flush()
    }
  }

  func completer(_ completer: MKLocalSearchCompleter, didFailWithError error: Error) {
    flush()
  }

  private func flush() {
    debounceTimer?.invalidate()
    timeoutTimer?.invalidate()
    debounceTimer = nil
    timeoutTimer = nil

    guard let resolve = pendingResolve else { return }
    pendingResolve = nil

    let completions = completer?.results ?? []
    completer?.cancel()
    completer = nil

    guard !completions.isEmpty else {
      // Fallback MKLocalSearch direct
      fallbackSearch(query: pendingQuery, resolve: resolve)
      return
    }

    // Résoudre les coords pour chaque suggestion
    let group = DispatchGroup()
    var results: [(Int, [String: Any])] = []
    let lock = NSLock()

    for (idx, completion) in completions.prefix(10).enumerated() {
      group.enter()
      let req = MKLocalSearch.Request(completion: completion)
      if regionLat != 0 || regionLon != 0 {
        let reqSpan = MKCoordinateSpan(latitudeDelta: 0.5, longitudeDelta: 0.5)
        req.region = MKCoordinateRegion(center: CLLocationCoordinate2D(latitude: regionLat, longitude: regionLon), span: reqSpan)
      }
      MKLocalSearch(request: req).start { response, _ in
        defer { group.leave() }
        guard let item = response?.mapItems.first else {
          // Pas de coords — inclure quand même avec sous-titre comme adresse
          lock.lock()
          results.append((idx, [
            "name": completion.title,
            "address": completion.subtitle,
            "lat": 0.0, "lon": 0.0,
          ]))
          lock.unlock()
          return
        }
        let p = item.placemark
        var addr: [String] = []
        if let n = p.subThoroughfare, let s = p.thoroughfare { addr.append("\(n) \(s)") }
        else if let s = p.thoroughfare { addr.append(s) }
        if let c = p.locality { addr.append(c) }
        if let z = p.postalCode { addr.append(z) }

        lock.lock()
        results.append((idx, [
          "name": item.name ?? completion.title,
          "address": addr.isEmpty ? completion.subtitle : addr.joined(separator: ", "),
          "lat": p.coordinate.latitude,
          "lon": p.coordinate.longitude,
        ]))
        lock.unlock()
      }
    }

    group.notify(queue: .global()) {
      let sorted = results.sorted { $0.0 < $1.0 }.map { $0.1 }
      if let data = try? JSONSerialization.data(withJSONObject: sorted),
         let str = String(data: data, encoding: .utf8) {
        resolve(str)
      } else {
        resolve("[]")
      }
    }
  }

  private func fallbackSearch(query: String, resolve: @escaping RCTPromiseResolveBlock) {
    let req = MKLocalSearch.Request()
    req.naturalLanguageQuery = query
    req.resultTypes = [.pointOfInterest, .address]
    if regionLat != 0 || regionLon != 0 {
      let fbSpan = MKCoordinateSpan(latitudeDelta: 0.5, longitudeDelta: 0.5)
      req.region = MKCoordinateRegion(center: CLLocationCoordinate2D(latitude: regionLat, longitude: regionLon), span: fbSpan)
    }
    MKLocalSearch(request: req).start { response, _ in
      var out: [[String: Any]] = []
      for item in (response?.mapItems ?? []).prefix(5) {
        let p = item.placemark
        var addr: [String] = []
        if let n = p.subThoroughfare, let s = p.thoroughfare { addr.append("\(n) \(s)") }
        else if let s = p.thoroughfare { addr.append(s) }
        if let c = p.locality { addr.append(c) }
        if let z = p.postalCode { addr.append(z) }
        out.append(["name": item.name ?? query,
                    "address": addr.joined(separator: ", "),
                    "lat": p.coordinate.latitude,
                    "lon": p.coordinate.longitude])
      }
      if let data = try? JSONSerialization.data(withJSONObject: out),
         let str = String(data: data, encoding: .utf8) {
        resolve(str)
      } else {
        resolve("[]")
      }
    }
  }
}
