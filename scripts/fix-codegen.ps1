$ProjectRoot = "D:\New folder\tenant site\RentalHubMobile"
$AppCodegenJni = "$ProjectRoot\android\app\build\generated\source\codegen\jni"
$ComponentsDir = "$AppCodegenJni\react\renderer\components"

$Libraries = @(
    @{ Name = "rnasyncstorage";          Pkg = "@react-native-async-storage/async-storage"; HasComponents = $true  },
    @{ Name = "rngesturehandler_codegen"; Pkg = "react-native-gesture-handler";               HasComponents = $true  },
    @{ Name = "RNImagePickerSpec";        Pkg = "react-native-image-picker";                  HasComponents = $false },
    @{ Name = "RNKeychainSpec";           Pkg = "react-native-keychain";                      HasComponents = $false },
    @{ Name = "RNVectorIconsSpec";        Pkg = "react-native-vector-icons";                  HasComponents = $false }
)

function Create-CodegenDir {
    param($LibName, $PkgName, $HasComponents)

    $LibDir = "$ProjectRoot\node_modules\$PkgName\android\build\generated\source\codegen\jni"
    $LibComponentsDir = "$LibDir\react\renderer\components\$LibName"

    New-Item -ItemType Directory -Path $LibDir -Force | Out-Null
    if ($HasComponents) {
        New-Item -ItemType Directory -Path $LibComponentsDir -Force | Out-Null
    }

    $sourceFiles = Get-ChildItem -Path $AppCodegenJni -Filter "$LibName*" -File
    foreach ($f in $sourceFiles) {
        Copy-Item -Path $f.FullName -Destination "$LibDir\" -Force
    }

    $sourceCompDir = "$ComponentsDir\$LibName"
    if ($HasComponents -and (Test-Path $sourceCompDir)) {
        Copy-Item -Path "$sourceCompDir\*" -Destination $LibComponentsDir -Recurse -Force
    }

    $cmakeContent = @'
cmake_minimum_required(VERSION 3.13)
set(CMAKE_VERBOSE_MAKEFILE ON)

set(LIB_NAME {0})
set(LIB_TARGET_NAME react_codegen_{1})

file(GLOB LIB_CODEGEN_SRCS CONFIGURE_DEPENDS *.cpp react/renderer/components/{0}/*.cpp)

add_library(
  ${{LIB_TARGET_NAME}}
  OBJECT
  ${{LIB_CODEGEN_SRCS}}
)

target_include_directories(
  ${{LIB_TARGET_NAME}}
  PUBLIC
  .
  react/renderer/components/{0}
)

target_link_libraries(
  ${{LIB_TARGET_NAME}}
  fbjni
  jsi
  reactnative
)

target_compile_reactnative_options(${{LIB_TARGET_NAME}} PUBLIC)
'@ -f $LibName, $LibName

    Set-Content -Path "$LibDir\CMakeLists.txt" -Value $cmakeContent -NoNewline
    Write-Output "Created codegen dir for $PkgName ($LibName)"
}

foreach ($lib in $Libraries) {
    Create-CodegenDir -LibName $lib.Name -PkgName $lib.Pkg -HasComponents $lib.HasComponents
}

Write-Output "Done."
