#pragma once

#include "chat_session.hpp"
#include <set>
#include <memory>
#include <mutex>

class ChatRoom {
public:
    void join(std::shared_ptr<ChatSession> session);
    void leave(std::shared_ptr<ChatSession> session);
    void broadcast(const std::string& message, std::shared_ptr<ChatSession> sender);

private:
    std::set<std::shared_ptr<ChatSession>> sessions_;
    std::mutex mutex_;
};
