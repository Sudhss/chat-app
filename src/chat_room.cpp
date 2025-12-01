#include "chat_room.hpp"
#include <sstream>
#include <iomanip>
#include <chrono>

using namespace std;

void ChatRoom::join(shared_ptr<ChatSession> session) {
    std::lock_guard<mutex> lock(mutex_);
    sessions_.insert(session);
    
    // Notify all users in the room about the new user
    ostringstream ss;
    ss << "SYSTEM: User joined the room (" << sessions_.size() << " users in room)";
    auto message = ss.str();
    
    for (auto& s : sessions_) {
        if (s != session) {
            s->deliver(message);
        } else {
            // Welcome message for the new user
            s->deliver("SYSTEM: Welcome to room " + id_);
        }
    }
}

void ChatRoom::leave(shared_ptr<ChatSession> session) {
    std::lock_guard<mutex> lock(mutex_);
    sessions_.erase(session);
    
    // Notify remaining users about the departure
    ostringstream ss;
    ss << "SYSTEM: User left the room (" << sessions_.size() << " users remaining)";
    auto message = ss.str();
    
    for (auto& s : sessions_) {
        s->deliver(message);
    }
}

void ChatRoom::broadcast(const string& message, shared_ptr<ChatSession> sender) {
    std::lock_guard<mutex> lock(mutex_);
    
    // Add timestamp to the message
    auto now = chrono::system_clock::now();
    auto now_time = chrono::system_clock::to_time_t(now);
    ostringstream ss;
    ss << put_time(localtime(&now_time), "%H:%M") << " ";
    
    // Add sender info and message
    ss << "[" << (sender ? sender->username() : "SYSTEM") << "] " << message;
    string formatted_message = ss.str();
    
    // Broadcast to all users in the room
    for (auto& session : sessions_) {
        session->deliver(formatted_message);
    }
}
