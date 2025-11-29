cmake_minimum_required(VERSION 3.10)
project(Flux VERSION 0.1.0 LANGUAGES CXX)

# Set C++17 standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Find required packages
find_package(Boost 1.70.0 REQUIRED COMPONENTS system thread)

# Add include directories
include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    ${Boost_INCLUDE_DIRS}
)

# Add executable
add_executable(flux_server
    src/main.cpp
    src/websocket_session.cpp
    src/websocket_server.cpp
)

# Link libraries
target_link_libraries(flux_server
    PRIVATE
        Boost::system
        Boost::thread
)

# Installation
install(TARGETS flux_server
    RUNTIME DESTINATION bin
)

# Enable testing
enable_testing()
add_subdirectory(tests)
