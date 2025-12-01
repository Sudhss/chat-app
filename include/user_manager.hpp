#pragma once

#include <string>
#include <unordered_map>
#include <memory>
#include <mutex>
#include <ctime>

class User {
public:
    User(const std::string& username, const std::string& id)
        : username_(username), id_(id) {}

    const std::string& get_username() const { return username_; }
    const std::string& get_id() const { return id_; }
    void set_username(const std::string& username) { username_ = username; }

private:
    std::string username_;
    std::string id_;
};

class UserManager {
public:
    static UserManager& instance() {
        static UserManager instance;
        return instance;
    }

    std::shared_ptr<User> create_user(const std::string& username) {
        std::lock_guard<std::mutex> lock(mutex_);
        auto id = generate_user_id();
        auto user = std::make_shared<User>(username, id);
        users_[id] = user;
        return user;
    }

    std::shared_ptr<User> get_user(const std::string& id) {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = users_.find(id);
        return it != users_.end() ? it->second : nullptr;
    }

    bool remove_user(const std::string& id) {
        std::lock_guard<std::mutex> lock(mutex_);
        return users_.erase(id) > 0;
    }

private:
    UserManager() = default;
    std::unordered_map<std::string, std::shared_ptr<User>> users_;
    mutable std::mutex mutex_;

    std::string generate_user_id() {
        static int counter = 0;
        return "user_" + std::to_string(++counter) + "_" + std::to_string(time(nullptr));
    }
};
