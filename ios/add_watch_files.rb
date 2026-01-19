#!/usr/bin/env ruby
# Script pour ajouter les fichiers WatchConnectivity au projet Xcode

require 'xcodeproj'

project_path = 'Yoroi.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# Trouver le target Yoroi (iPhone app)
target = project.targets.find { |t| t.name == 'Yoroi' }

if target.nil?
  puts "❌ Target 'Yoroi' introuvable"
  exit 1
end

# Trouver le groupe principal
main_group = project.main_group.find_subpath('Yoroi', true)

# Ajouter WatchConnectivityBridge.swift
swift_file = main_group.new_file('WatchConnectivityBridge.swift')
target.add_file_references([swift_file])

# Ajouter WatchConnectivityBridge.m
objc_file = main_group.new_file('WatchConnectivityBridge.m')
target.add_file_references([objc_file])

# Sauvegarder le projet
project.save

puts "✅ Fichiers ajoutés au projet Xcode:"
puts "  - WatchConnectivityBridge.swift"
puts "  - WatchConnectivityBridge.m"
puts ""
puts "🔄 Prochaine étape: Rebuild l'app avec 'npx expo run:ios'"
