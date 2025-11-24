cmake_minimum_required(VERSION 3.10)
project(imgui)

# ImGui core sources
set(IMGUI_SOURCES
    imgui.cpp
    imgui_demo.cpp
    imgui_draw.cpp
    imgui_tables.cpp
    imgui_widgets.cpp
)

# ImGui core headers
set(IMGUI_HEADERS
    imgui.h
    imgui_internal.h
    imconfig.h
    imstb_rectpack.h
    imstb_textedit.h
    imstb_truetype.h
)

# Backend sources - GLFW + OpenGL3 (for this project)
set(IMGUI_BACKEND_SOURCES
    backends/imgui_impl_glfw.cpp
    backends/imgui_impl_glfw.h
    backends/imgui_impl_opengl3.cpp
    backends/imgui_impl_opengl3.h
    backends/imgui_impl_opengl3_loader.h
)

# Additional utility sources
set(IMGUI_MISC_SOURCES
    misc/cpp/imgui_stdlib.cpp
    misc/cpp/imgui_stdlib.h
)

# Combine all sources
set(ALL_IMGUI_SOURCES
    ${IMGUI_SOURCES}
    ${IMGUI_BACKEND_SOURCES}
    ${IMGUI_MISC_SOURCES}
)

# Create static library
add_library(imgui STATIC ${ALL_IMGUI_SOURCES} ${IMGUI_HEADERS})

# Set include directories
target_include_directories(imgui PUBLIC
    $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}>
    $<INSTALL_INTERFACE:include>
)

# Link with required libraries
find_package(OpenGL REQUIRED)
find_package(glfw3 REQUIRED)

target_link_libraries(imgui PUBLIC
    OpenGL::GL
    glfw
)

# Add definitions for backends
target_compile_definitions(imgui PUBLIC
    IMGUI_IMPL_OPENGL_LOADER_GLAD
)

# Platform-specific configuration
if(WIN32)
    target_compile_definitions(imgui PUBLIC _WIN32)
elseif(APPLE)
    target_compile_definitions(imgui PUBLIC __APPLE__)
elseif(UNIX)
    target_compile_definitions(imgui PUBLIC __linux__)
endif()

# Export target for installation
install(TARGETS imgui
    EXPORT imgui_targets
    LIBRARY DESTINATION lib
    ARCHIVE DESTINATION lib
    RUNTIME DESTINATION bin
)

# Install headers
install(FILES ${IMGUI_HEADERS} DESTINATION include)
install(DIRECTORY backends/ DESTINATION include/backends)
install(DIRECTORY misc/ DESTINATION include/misc)

# Create and install export set
install(EXPORT imgui_targets
    FILE imgui_targets.cmake
    NAMESPACE imgui::
    DESTINATION lib/cmake/imgui
)

# Create config file
include(CMakePackageConfigHelpers)

configure_package_config_file(
    "${CMAKE_CURRENT_SOURCE_DIR}/imguiConfig.cmake.in"
    "${CMAKE_CURRENT_BINARY_DIR}/imguiConfig.cmake"
    INSTALL_DESTINATION lib/cmake/imgui
)

# Read version from VERSION file
file(READ "${CMAKE_CURRENT_SOURCE_DIR}/VERSION" IMGUI_VERSION_STRING)
string(STRIP "${IMGUI_VERSION_STRING}" IMGUI_VERSION)

write_basic_package_version_file(
    "${CMAKE_CURRENT_BINARY_DIR}/imguiConfigVersion.cmake"
    VERSION ${IMGUI_VERSION}
    COMPATIBILITY SameMajorVersion
)

install(FILES
    "${CMAKE_CURRENT_BINARY_DIR}/imguiConfig.cmake"
    "${CMAKE_CURRENT_BINARY_DIR}/imguiConfigVersion.cmake"
    DESTINATION lib/cmake/imgui
)