cmake_minimum_required(VERSION 3.14)
project(Flux VERSION 0.2.0 LANGUAGES CXX)

# Set C++17 standard and build type
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# Set output directories
set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)

# Options
option(BUILD_TESTS "Build test cases" OFF)
option(ENABLE_ASAN "Enable Address Sanitizer" OFF)
option(ENABLE_UBSAN "Enable Undefined Behavior Sanitizer" OFF)

# Find required packages
find_package(Boost 1.70.0 REQUIRED 
    COMPONENTS 
        system 
        thread 
        filesystem 
        program_options
        random
)

# Add vcpkg for dependency management
if(DEFINED ENV{VCPKG_ROOT})
    set(CMAKE_TOOLCHAIN_FILE "$ENV{VCPKG_ROOT}/scripts/buildsystems/vcpkg.cmake" CACHE STRING "")
endif()

# Fetch dependencies using FetchContent (C++ package manager)
include(FetchContent)

# nlohmann-json
FetchContent_Declare(
    nlohmann_json
    GIT_REPOSITORY https://github.com/nlohmann/json.git
    GIT_TAG v3.11.2
)
FetchContent_MakeAvailable(nlohmann_json)

# JWT-CPP
FetchContent_Declare(
    jwt-cpp
    GIT_REPOSITORY https://github.com/Thalhammer/jwt-cpp.git
    GIT_TAG v0.7.0
)
FetchContent_MakeAvailable(jwt-cpp)

# Include directories
include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    ${Boost_INCLUDE_DIRS}
)

# Add source files
file(GLOB_RECURSE SOURCES 
    "src/*.cpp"
    "include/*.hpp"
)

# Add main executable
add_executable(flux_server
    ${SOURCES}
)

# Set compile definitions
target_compile_definitions(flux_server PRIVATE
    $<$<CONFIG:Debug>:_DEBUG>
    $<$<CONFIG:Release>:NDEBUG>
)

# Set compile options
target_compile_options(flux_server PRIVATE
    $<$<CONFIG:Debug>:-g -O0 -Wall -Wextra -Wpedantic -Werror>
    $<$<CONFIG:Release>:-O3 -DNDEBUG>
)

# Link libraries
target_link_libraries(flux_server PRIVATE
    Boost::system
    Boost::thread
    Boost::filesystem
    Boost::program_options
    Boost::random
    nlohmann_json::nlohmann_json
    jwt-cpp::jwt-cpp
)

# Add sanitizers if enabled
if(ENABLE_ASAN)
    target_compile_options(flux_server PRIVATE -fsanitize=address)
    target_link_libraries(flux_server PRIVATE -fsanitize=address)
endif()

if(ENABLE_UBSAN)
    target_compile_options(flux_server PRIVATE -fsanitize=undefined)
    target_link_libraries(flux_server PRIVATE -fsanitize=undefined)
endif()

# Installation
install(TARGETS flux_server
    RUNTIME DESTINATION bin
    LIBRARY DESTINATION lib
    ARCHIVE DESTINATION lib
)

# Install headers
install(DIRECTORY include/ DESTINATION include)

# Add uninstall target
configure_file(
    "${CMAKE_CURRENT_SOURCE_DIR}/cmake/cmake_uninstall.cmake.in"
    "${CMAKE_CURRENT_BINARY_DIR}/cmake_uninstall.cmake"
    IMMEDIATE @ONLY
)

add_custom_target(uninstall
    COMMAND ${CMAKE_COMMAND} -P ${CMAKE_CURRENT_BINARY_DIR}/cmake_uninstall.cmake
)

# Add tests if enabled
if(BUILD_TESTS)
    enable_testing()
    add_subdirectory(tests)
endif()

# Create a package configuration file
include(CMakePackageConfigHelpers)
write_basic_package_version_file(
    ${CMAKE_CURRENT_BINARY_DIR}/FluxConfigVersion.cmake
    VERSION ${PROJECT_VERSION}
    COMPATIBILITY SameMajorVersion
)

# Export package for find_package
configure_package_config_file(
    ${CMAKE_CURRENT_SOURCE_DIR}/cmake/Config.cmake.in
    ${CMAKE_CURRENT_BINARY_DIR}/FluxConfig.cmake
    INSTALL_DESTINATION lib/cmake/Flux
)

# Install package configuration
install(FILES
    ${CMAKE_CURRENT_BINARY_DIR}/FluxConfig.cmake
    ${CMAKE_CURRENT_BINARY_DIR}/FluxConfigVersion.cmake
    DESTINATION lib/cmake/Flux
)

# Export targets
install(TARGETS flux_server
    EXPORT FluxTargets
    LIBRARY DESTINATION lib
    ARCHIVE DESTINATION lib
    RUNTIME DESTINATION bin
)

install(EXPORT FluxTargets
    FILE FluxTargets.cmake
    NAMESPACE Flux::
    DESTINATION lib/cmake/Flux
)

# Enable testing
enable_testing()
add_subdirectory(tests)
