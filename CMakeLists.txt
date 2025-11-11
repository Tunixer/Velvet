cmake_minimum_required(VERSION 3.18)
project(Velvet LANGUAGES CXX CUDA)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Set CUDA standard
set(CMAKE_CUDA_STANDARD 17)
set(CMAKE_CUDA_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
# Build configuration
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)
set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)

# Compilation options
if(CMAKE_BUILD_TYPE STREQUAL "Debug")
    set(CMAKE_CUDA_FLAGS "${CMAKE_CUDA_FLAGS} -g -G")
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -g -O0")
else()
    set(CMAKE_CUDA_FLAGS "${CMAKE_CUDA_FLAGS} -O3")
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -O3")
endif()

# Find required packages
find_package(OpenGL REQUIRED)
find_package(glfw3 REQUIRED)
find_package(PkgConfig REQUIRED)
# CUDA is enabled via LANGUAGES in project() command above
# Modern CMake (3.18+) handles CUDA natively, no need for find_package(CUDA)

# Find GLM
find_path(GLM_INCLUDE_DIR glm/glm.hpp
    PATHS /usr/include /usr/local/include
    NO_DEFAULT_PATH
)
if(NOT GLM_INCLUDE_DIR)
    message(FATAL_ERROR "GLM not found. Install with: sudo apt install libglm-dev")
endif()

# Find Assimp
find_package(assimp REQUIRED)
if(NOT assimp_FOUND)
    message(FATAL_ERROR "Assimp not found. Install with: sudo apt install libassimp-dev")
endif()

# Find fmt
pkg_check_modules(FMT REQUIRED fmt)
if(NOT FMT_FOUND)
    message(FATAL_ERROR "fmt not found. Install with: sudo apt install libfmt-dev")
endif()

# External libraries
set(EXTERNAL_DIR ${CMAKE_CURRENT_SOURCE_DIR}/External)

# GLAD
add_subdirectory(${EXTERNAL_DIR}/glad)

# ImGui
add_subdirectory(${EXTERNAL_DIR}/imgui)

# Include directories
include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_CURRENT_SOURCE_DIR}/External
    Velvet/External/cuda
    Velvet
    ${GLM_INCLUDE_DIR}
    ${OPENGL_INCLUDE_DIRS}
    ${glfw3_INCLUDE_DIRS}
    ${FMT_INCLUDE_DIRS}
)

# Source files
set(CPP_SOURCES
    Velvet/Actor.cpp
    Velvet/Component.cpp
    Velvet/GameInstance.cpp
    Velvet/VtEngine.cpp
    Velvet/Timer.cpp
    Velvet/Helper.cpp
    Velvet/main.cpp
    Velvet/MeshRenderer.cpp
    Velvet/GUI.cpp
    Velvet/Input.cpp
    Velvet/stb_image.cpp
)

set(CUDA_SOURCES
    Velvet/SpatialHashGPU.cu
    Velvet/VtClothSolverGPU.cu
)

set(HEADERS
    Velvet/Actor.hpp
    Velvet/Component.hpp
    Velvet/GameInstance.hpp
    Velvet/VtEngine.hpp
    Velvet/Timer.hpp
    Velvet/Helper.hpp
    Velvet/Common.hpp
    Velvet/Camera.hpp
    Velvet/Collider.hpp
    Velvet/Global.hpp
    Velvet/GUI.hpp
    Velvet/Input.hpp
    Velvet/Light.hpp
    Velvet/Material.hpp
    Velvet/MaterialProperty.hpp
    Velvet/Mesh.hpp
    Velvet/MeshRenderer.hpp
    Velvet/MouseGrabber.hpp
    Velvet/ParticleGeometryRenderer.hpp
    Velvet/ParticleInstancedRenderer.hpp
    Velvet/PlayerController.hpp
    Velvet/RenderPipeline.hpp
    Velvet/Resource.hpp
    Velvet/Scene.hpp
    Velvet/Transform.hpp
    Velvet/VtBuffer.hpp
    Velvet/VtClothObjectCPU.hpp
    Velvet/VtClothObjectGPU.hpp
    Velvet/VtClothSolverCPU.hpp
    Velvet/VtClothSolverGPU.hpp
    Velvet/VtClothSolverGPU.cuh
    Velvet/SpatialHashGPU.hpp
    Velvet/SpatialHashGPU.cuh
    Velvet/Common.cuh
)

# CUDA headers
set(CUDA_HEADERS
    Velvet/SpatialHashGPU.cuh
    Velvet/VtClothSolverGPU.cuh
    Velvet/Common.cuh
)

# Create executable
add_executable(${PROJECT_NAME}
    ${CPP_SOURCES}
    ${CUDA_SOURCES}
    ${HEADERS}
)

# Set CUDA properties
set_property(TARGET ${PROJECT_NAME} PROPERTY CUDA_SEPARABLE_COMPILATION ON)

# Link libraries
target_link_libraries(${PROJECT_NAME}
    glad
    imgui
    ${OPENGL_LIBRARIES}
    glfw
    assimp::assimp
    ${FMT_LIBRARIES}
)

# Link CUDA libraries
# Modern CMake automatically links CUDA runtime when CUDA language is enabled
# But we can explicitly link if needed
if(CMAKE_CUDA_TOOLKIT_INCLUDE_DIRECTORIES)
    find_library(CUDA_CUDART_LIBRARY
        NAMES cudart
        PATHS
            ${CMAKE_CUDA_IMPLICIT_LINK_DIRECTORIES}
            /usr/local/cuda/lib64
            /usr/local/cuda/lib
        NO_DEFAULT_PATH
    )
    if(CUDA_CUDART_LIBRARY)
        target_link_libraries(${PROJECT_NAME} ${CUDA_CUDART_LIBRARY})
    endif()
endif()

# CUDA runtime library
set_target_properties(${PROJECT_NAME} PROPERTIES
    CUDA_RUNTIME_LIBRARY Shared
)

# Include directories for target
target_include_directories(${PROJECT_NAME} PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_CURRENT_SOURCE_DIR}/External
    Velvet/External/cuda
    Velvet
    ${GLM_INCLUDE_DIR}
    ${OPENGL_INCLUDE_DIRS}
    ${glfw3_INCLUDE_DIRS}
    ${FMT_INCLUDE_DIRS}
    ${assimp_INCLUDE_DIRS}
)

# Add CUDA include directories so C++ files can include CUDA headers
# Modern CMake provides CUDA include directories automatically
if(CMAKE_CUDA_TOOLKIT_INCLUDE_DIRECTORIES)
    target_include_directories(${PROJECT_NAME} PRIVATE ${CMAKE_CUDA_TOOLKIT_INCLUDE_DIRECTORIES})
else()
    # Fallback: try to find CUDA include directory manually
    find_path(CUDA_INCLUDE_DIR
        NAMES cuda_runtime.h
        PATHS
            /usr/local/cuda/include
            /usr/include
        NO_DEFAULT_PATH
    )
    if(CUDA_INCLUDE_DIR)
        target_include_directories(${PROJECT_NAME} PRIVATE ${CUDA_INCLUDE_DIR})
    endif()
endif()

# Compiler-specific definitions
target_compile_definitions(${PROJECT_NAME} PRIVATE
    $<$<CONFIG:Debug>:_DEBUG>
    $<$<CONFIG:Release>:NDEBUG>
    $<$<PLATFORM_ID:Linux>:_LINUX>
    $<$<PLATFORM_ID:Windows>:_WIN32>
)

# Copy assets to build directory
# Assets are located in Velvet/Assets/
if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/Velvet/Assets)
    file(COPY ${CMAKE_CURRENT_SOURCE_DIR}/Velvet/Assets DESTINATION ${CMAKE_BINARY_DIR}/bin)
endif()

# Installation rules
install(TARGETS ${PROJECT_NAME}
    RUNTIME DESTINATION bin
)

# Print configuration summary
message(STATUS "")
message(STATUS "Velvet Configuration Summary:")
message(STATUS "  Build Type: ${CMAKE_BUILD_TYPE}")
message(STATUS "  C++ Standard: ${CMAKE_CXX_STANDARD}")
message(STATUS "  CUDA Standard: ${CMAKE_CUDA_STANDARD}")
message(STATUS "  GLM Include: ${GLM_INCLUDE_DIR}")
message(STATUS "  OpenGL Libraries: ${OPENGL_LIBRARIES}")
message(STATUS "  Assimp Libraries: ${assimp_LIBRARIES}")
message(STATUS "  fmt Libraries: ${FMT_LIBRARIES}")
message(STATUS "")