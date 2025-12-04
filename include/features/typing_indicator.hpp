#pragma once

#include <string>
#include <vector>
#include <chrono>
#include <mutex>
#include <nlohmann/json.hpp>

namespace features {

class TypingIndicator {
public:
    static TypingIndicator& instance() {
        static TypingIndicator instance;
        return instance;
    }

    void start_typing(const std::string& user_id, const std::string& username) {
        std::lock_guard<std::mutex> lock(mutex_);
        
        // Remove if already typing
        stop_typing(user_id);
        
        typing_users_.emplace_back(user_id, username, std::chrono::system_clock::now());
        notify_typing_change();
    }

    void stop_typing(const std::string& user_id) {
        std::lock_guard<std::mutex> lock(mutex_);
        typing_users_.erase(
            std::remove_if(typing_users_.begin(), typing_users_.end(),
                [&](const auto& entry) { 
                    return entry.user_id == user_id || 
                           is_expired(entry.timestamp); 
                }),
            typing_users_.end()
        );
        notify_typing_change();
    }

    nlohmann::json get_typing_users() const {
        std::lock_guard<std::mutex> lock(mutex_);
        nlohmann::json result = nlohmann::json::array();
        
        auto now = std::chrono::system_clock::now();
        for (const auto& entry : typing_users_) {
            if (!is_expired(entry.timestamp, now)) {
                result.push_back({
                    {"user_id", entry.user_id},
                    {"username", entry.username}
                });
            }
        }
        
        return result;
    }

    void set_typing_callback(std::function<void(const nlohmann::json&)> callback) {
        typing_callback_ = std::move(callback);
    }

private:
    struct TypingEntry {
        std::string user_id;
        std::string username;
        std::chrono::system_clock::time_point timestamp;
    };

    std::vector<TypingEntry> typing_users_;
    mutable std::mutex mutex_;
    std::function<void(const nlohmann::json&)> typing_callback_;
    
    static constexpr auto TYPING_TIMEOUT = std::chrono::seconds(5);
    
    bool is_expired(const std::chrono::system_clock::time_point& timestamp,
                   const std::chrono::system_clock::time_point& now = 
                       std::chrono::system_clock::now()) const {
        return (now - timestamp) > TYPING_TIMEOUT;
    }
    
    void notify_typing_change() {
        if (typing_callback_) {
            typing_callback_(get_typing_users());
        }
    }
};

} // namespace features
