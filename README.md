# Flux - Real-time Chat Application
Notice : Under Progress, does not work rn

## Overview
Flux is a high-performance, real-time chat application built with modern C++ and WebSockets. It provides a responsive web interface for real-time messaging with a focus on performance and scalability.

## Features
- Real-time message broadcasting
- Web-based chat interface
- Cross-platform compatibility
- Lightweight and fast WebSocket server
- Clean and responsive UI

## Prerequisites
- C++17 compatible compiler (GCC 8+ or MSVC 2019+)
- Boost 1.70 or higher
- CMake 3.10 or higher (for building)
- Python 3.6+ (for running the test server)

## Quick Start

### Building the Server
```bash
# Create build directory
mkdir build && cd build

# Configure and build
cmake ..
cmake --build .