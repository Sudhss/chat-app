#pragma once

#include <boost/beast/core.hpp>
#include <boost/beast/websocket.hpp>
#include <boost/asio/ip/tcp.hpp>
#include <memory>
#include <string>
#include <functional>
#include "user_manager.hpp"

namespace beast = boost::beast;
namespace http = beast::http;
namespace websocket = beast::websocket;
namespace net = boost::asio;
using tcp = boost::asio::ip::tcp;

// Forward declarations
class ChatRoom;
class User;

// Represents a single connected client
class ChatSession : public std::enable_shared_from_this<ChatSession> {
public:
    using message_handler = std::function<void(const std::string&, const std::string&)>;
    using close_handler = std::function<void()>;

    explicit ChatSession(tcp::socket socket, std::shared_ptr<ChatRoom> room);
    ~ChatSession();

    // Session control
    void start();
    void close();
    
    // Message handling
    void deliver(const std::string& message);
    void set_message_handler(message_handler handler) { message_handler_ = std::move(handler); }
    void set_close_handler(close_handler handler) { close_handler_ = std::move(handler); }
    
    // User management
    bool is_authenticated() const { return user_ != nullptr; }
    std::shared_ptr<User> get_user() const { return user_; }
    bool authenticate(const std::string& username);
    
    // Session info
    const std::string& get_id() const { return session_id_; }
    const std::string& get_remote_endpoint() const { return remote_endpoint_; }

private:
    void on_accept(beast::error_code ec);
    void read();
    void write(const std::string& message);
    void on_write(beast::error_code ec, std::size_t bytes_transferred);

    // WebSocket and connection
    websocket::stream<tcp::socket> ws_;
    beast::flat_buffer buffer_;
    std::shared_ptr<ChatRoom> room_;
    
    // User and session info
    std::shared_ptr<User> user_;
    std::string session_id_;
    std::string remote_endpoint_;
    
    // Handlers
    message_handler message_handler_;
    close_handler close_handler_;
    
    // Generate unique session ID
    static std::string generate_session_id();
};
