CXX = g++
CXXFLAGS = -std=c++17 -Iinclude -I"C:/local/boost_1_81_0" -Wall
LDFLAGS = -L"C:/local/boost_1_81_0/lib" -lws2_32 -lwsock32 -lboost_system-mt -lboost_thread-mt

SRC = src/main.cpp
TARGET = flux_server

all: $(TARGET)

$(TARGET): $(SRC)
	$(CXX) $(CXXFLAGS) -o $@ $^ $(LDFLAGS)

run: $(TARGET)
	.\$(TARGET)

clean:
	del $(TARGET).exe 2>nul || exit 0

.PHONY: all clean run
