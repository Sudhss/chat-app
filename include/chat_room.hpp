#pragma once

#include "chat_session.hpp"
#include <set>
#include <memory>
#include <mutex>
#include <string>
#include <unordered_map>
#include <boost/uuid/uuid.hpp>
#include <boost/uuid/uuid_generators.hpp>

class ChatRoom : public std::enable_shared_from_this<ChatRoom> {
public:
    using room_id = std::string;
    
    // Create a new room with a random ID
    static std::shared_ptr<ChatRoom> create() {
        return std::make_shared<ChatRoom>(boost::uuids::to_string(boost::uuids::random_generator()()));
    }
    
    explicit ChatRoom(const std::string& id) : id_(id) {}
    
    const std::string& id() const { return id_; }
    
    void join(std::shared_ptr<ChatSession> session);
    void leave(std::shared_ptr<ChatSession> session);
    void broadcast(const std::string& message, std::shared_ptr<ChatSession> sender);
    
    size_t size() const { 
        std::lock_guard<std::mutex> lock(mutex_);
        return sessions_.size(); 
    }

private:
    const std::string id_;
    std::set<std::shared_ptr<ChatSession>> sessions_;
    mutable std::mutex mutex_;
};

class RoomManager {
public:
    static RoomManager& instance() {
        static RoomManager instance;
        return instance;
    }
    
    std::shared_ptr<ChatRoom> get_or_create_room(const std::string& room_id) {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = rooms_.find(room_id);
        if (it == rooms_.end()) {
            it = rooms_.emplace(room_id, std::make_shared<ChatRoom>(room_id)).first;
        }
        return it->second;
    }
    
    void remove_room_if_empty(const std::string& room_id) {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = rooms_.find(room_id);
        if (it != rooms_.end() && it->second->size() == 0) {
            rooms_.erase(it);
        }
    }
    
    std::vector<std::string> get_room_list() const {
        std::lock_guard<std::mutex> lock(mutex_);
        std::vector<std::string> result;
        for (const auto& pair : rooms_) {
            result.push_back(pair.first + " (" + std::to_string(pair.second->size()) + " users)");
        }
        return result;
    }

private:
    RoomManager() = default;
    std::unordered_map<std::string, std::shared_ptr<ChatRoom>> rooms_;
    mutable std::mutex mutex_;
};
