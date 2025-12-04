#pragma once

#include <string>
#include <functional>
#include <memory>
#include <vector>
#include <nlohmann/json.hpp>

namespace ui {

// Base component class
class Component {
public:
    virtual ~Component() = default;
    virtual std::string render() const = 0;
    virtual void update(const nlohmann::json& props) = 0;
    virtual void add_event_listener(const std::string& event, std::function<void()> handler) = 0;
};

// Button component
class Button : public Component {
public:
    Button(const std::string& id, const std::string& text, const std::string& variant = "primary");
    std::string render() const override;
    void update(const nlohmann::json& props) override;
    void add_event_listener(const std::string& event, std::function<void()> handler) override;

private:
    std::string id_;
    std::string text_;
    std::string variant_;
    std::vector<std::function<void()>> click_handlers_;
};

// Input field component
class InputField : public Component {
public:
    InputField(const std::string& id, const std::string& placeholder = "", const std::string& type = "text");
    std::string render() const override;
    void update(const nlohmann::json& props) override;
    void add_event_listener(const std::string& event, std::function<void()> handler) override;
    std::string get_value() const;

private:
    std::string id_;
    std::string placeholder_;
    std::string type_;
    std::string value_;
    std::vector<std::function<void()>> change_handlers_;
};

// Message component
class Message : public Component {
public:
    Message(const std::string& id, const std::string& sender, const std::string& content, 
            const std::string& timestamp, bool is_own = false);
    std::string render() const override;
    void update(const nlohmann::json& props) override;
    void add_event_listener(const std::string& event, std::function<void()> handler) override {
        // Not used for messages
    }

private:
    std::string id_;
    std::string sender_;
    std::string content_;
    std::string timestamp_;
    bool is_own_;
};

// Chat window component
class ChatWindow : public Component {
public:
    ChatWindow(const std::string& id);
    std::string render() const override;
    void update(const nlohmann::json& props) override;
    void add_event_listener(const std::string& event, std::function<void()> handler) override;
    void add_message(const std::string& sender, const std::string& content, bool is_own = false);
    void clear_messages();

private:
    std::string id_;
    std::vector<std::unique_ptr<Message>> messages_;
    std::function<void(const std::string&)> message_handler_;
};

// User list component
class UserList : public Component {
public:
    UserList(const std::string& id);
    std::string render() const override;
    void update(const nlohmann::json& props) override;
    void add_event_listener(const std::string& event, std::function<void()> handler) override;
    void set_users(const std::vector<std::pair<std::string, bool>>& users); // username, is_online

private:
    std::string id_;
    std::vector<std::pair<std::string, bool>> users_;
};

// Notification system
class NotificationManager {
public:
    static NotificationManager& instance();
    void show_success(const std::string& message);
    void show_error(const std::string& message);
    void show_info(const std::string& message);
    std::string render() const;

private:
    struct Notification {
        std::string id;
        std::string message;
        std::string type; // success, error, info
        std::chrono::system_clock::time_point timestamp;
    };

    std::vector<Notification> notifications_;
    mutable std::mutex mutex_;
};

} // namespace ui
