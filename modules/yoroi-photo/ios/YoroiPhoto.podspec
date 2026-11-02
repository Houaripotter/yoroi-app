# Module local YOROI (modules/yoroi-photo) : relie tout seul par l'autolinking d'Expo (use_expo_modules! dans ton Podfile).
# Rien a ajouter au Podfile ni au projet Xcode : un pod install suffit.
Pod::Spec.new do |s|
  s.name           = 'YoroiPhoto'
  s.version        = '1.0.0'
  s.summary        = 'YOROI : visages et detourage sur l appareil avec Apple Vision, sans reseau.'
  s.description    = s.summary
  s.author         = 'YOROI'
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.license        = { :type => 'Proprietary' }
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  # cadres d'Apple deja dans le systeme : 0 Mo ajoute a l'app
  s.frameworks = 'Vision', 'CoreImage', 'CoreVideo', 'ImageIO'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = '**/*.{h,m,mm,swift}'
end
