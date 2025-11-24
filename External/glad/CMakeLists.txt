cmake_minimum_required(VERSION 3.10)
project(glad)

# GLAD is a single-file library
set(GLAD_SOURCES
    src/glad.c
)

set(GLAD_HEADERS
    include/glad/glad.h
    include/KHR/khrplatform.h
)

# Create static library
add_library(glad STATIC ${GLAD_SOURCES})

# Set include directories
target_include_directories(glad PUBLIC
    $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
    $<INSTALL_INTERFACE:include>
)

# Link with OpenGL
find_package(OpenGL REQUIRED)
target_link_libraries(glad PUBLIC OpenGL::GL)

# Export target
install(TARGETS glad
    EXPORT glad_targets
    LIBRARY DESTINATION lib
    ARCHIVE DESTINATION lib
    RUNTIME DESTINATION bin
)

install(DIRECTORY include/ DESTINATION include)

# Create and install export set
install(EXPORT glad_targets
    FILE glad_targets.cmake
    NAMESPACE glad::
    DESTINATION lib/cmake/glad
)

# Create config file
include(CMakePackageConfigHelpers)

configure_package_config_file(
    "${CMAKE_CURRENT_SOURCE_DIR}/gladConfig.cmake.in"
    "${CMAKE_CURRENT_BINARY_DIR}/gladConfig.cmake"
    INSTALL_DESTINATION lib/cmake/glad
)

write_basic_package_version_file(
    "${CMAKE_CURRENT_BINARY_DIR}/gladConfigVersion.cmake"
    VERSION 1.0.0
    COMPATIBILITY SameMajorVersion
)

install(FILES
    "${CMAKE_CURRENT_BINARY_DIR}/gladConfig.cmake"
    "${CMAKE_CURRENT_BINARY_DIR}/gladConfigVersion.cmake"
    DESTINATION lib/cmake/glad
)