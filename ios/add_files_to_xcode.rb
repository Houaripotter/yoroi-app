#!/usr/bin/env ruby
require 'xcodeproj'

# Ouvrir le projet
project_path = 'Yoroi.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# Trouver le target principal
target = project.targets.find { |t| t.name == 'Yoroi' }

if target.nil?
  puts "❌ Target 'Yoroi' non trouvé!"
  exit 1
end

# Fichiers à ajouter
files_to_add = [
  'YoroiLiveActivityManager.swift',
  'YoroiLiveActivityManager.m',
  'TimerAttributes.swift'
]

puts "🔧 Ajout des fichiers au projet Xcode..."

files_to_add.each do |filename|
  # Vérifier si le fichier existe physiquement
  unless File.exist?(filename)
    puts "⚠️  Fichier #{filename} n'existe pas, skip"
    next
  end

  # Vérifier si le fichier est déjà dans le projet
  existing_file = project.files.find { |f| f.path == filename }

  if existing_file
    puts "⏭️  #{filename} déjà dans le projet"
    next
  end

  # Ajouter le fichier au projet
  file_ref = project.main_group.new_reference(filename)

  # Ajouter aux sources du target
  target.source_build_phase.add_file_reference(file_ref)

  puts "✅ #{filename} ajouté au projet"
end

# Sauvegarder le projet
project.save

puts "🎉 Projet Xcode mis à jour avec succès!"
