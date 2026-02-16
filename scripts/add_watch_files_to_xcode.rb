#!/usr/bin/env ruby

# ============================================
# SCRIPT: Ajouter fichiers Watch au projet Xcode
# Ajoute automatiquement les nouveaux fichiers au target YoroiWatch Watch App
# ============================================

require 'xcodeproj'

# Chemin du projet
project_path = File.expand_path('../../ios/Yoroi.xcodeproj', __FILE__)
project = Xcodeproj::Project.open(project_path)

# Target YoroiWatch Watch App
watch_target = project.targets.find { |t| t.name == 'YoroiWatch Watch App' }

if watch_target.nil?
  puts "❌ Target 'YoroiWatch Watch App' non trouvé"
  exit 1
end

puts "✅ Target trouvé: #{watch_target.name}"

# Trouver le groupe YoroiWatch Watch App
watch_group = project.main_group['YoroiWatch Watch App']

if watch_group.nil?
  # Essayer de créer le groupe s'il n'existe pas
  watch_group = project.main_group.new_group('YoroiWatch Watch App', 'ios/YoroiWatch Watch App')
  puts "✅ Groupe créé: YoroiWatch Watch App"
else
  puts "✅ Groupe trouvé: YoroiWatch Watch App"
end

# Fichiers à ajouter avec leurs chemins relatifs et groupes
files_to_add = [
  {
    path: 'ios/YoroiWatch Watch App/Services/WatchNotificationManager.swift',
    group: 'Services'
  },
  {
    path: 'ios/YoroiWatch Watch App/Complications/TimerComplication.swift',
    group: 'Complications'
  },
  {
    path: 'ios/YoroiWatch Watch App/Complications/RecordsComplication.swift',
    group: 'Complications'
  },
  {
    path: 'ios/YoroiWatch Watch App/Complications/YoroiComplicationsBundle.swift',
    group: 'Complications'
  },
  {
    path: 'ios/YoroiWatch Watch App/Services/ComplicationUpdateManager.swift',
    group: 'Services'
  }
]

# Fonction pour créer un groupe s'il n'existe pas
def find_or_create_group(parent_group, group_name)
  existing = parent_group.children.find { |child| child.display_name == group_name }
  return existing if existing

  puts "  📁 Création du groupe: #{group_name}"
  parent_group.new_group(group_name)
end

# Ajouter chaque fichier
files_to_add.each do |file_info|
  file_path = File.expand_path("../../#{file_info[:path]}", __FILE__)

  # Vérifier que le fichier existe
  unless File.exist?(file_path)
    puts "⚠️  Fichier non trouvé: #{file_path}"
    next
  end

  # Trouver ou créer le groupe
  target_group = find_or_create_group(watch_group, file_info[:group])

  # Vérifier si le fichier est déjà dans le groupe
  existing_file = target_group.children.find { |child| child.display_name == File.basename(file_path) }

  if existing_file
    puts "⏭️  Fichier déjà présent: #{File.basename(file_path)}"
    next
  end

  # Ajouter le fichier au groupe
  file_ref = target_group.new_file(file_path)
  puts "  ✅ Ajouté au groupe '#{file_info[:group]}': #{File.basename(file_path)}"

  # Ajouter le fichier au build phase (compile sources)
  if file_path.end_with?('.swift')
    watch_target.source_build_phase.add_file_reference(file_ref)
    puts "  ✅ Ajouté aux sources de compilation"
  end
end

# Sauvegarder le projet
project.save

puts ""
puts "🎉 TERMINÉ!"
puts "📝 Les fichiers suivants ont été ajoutés au projet Xcode:"
files_to_add.each do |file_info|
  puts "   - #{File.basename(file_info[:path])} (groupe: #{file_info[:group]})"
end
puts ""
puts "⚠️  IMPORTANT:"
puts "   1. Ouvre Xcode"
puts "   2. Clean Build Folder (Cmd+Shift+K)"
puts "   3. Build le projet"
puts ""
