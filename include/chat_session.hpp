#pragma once

#include <boost/beast/core.hpp>
#include <boost/beast/websocket.hpp>
#include <boost/asio/ip/tcp.hpp>
#include <memory>
#include <string>

namespace beast = boost::beast;
namespace websocket = beast::websocket;
namespace net = boost::asio;
using tcp = boost::asio::ip::tcp;

// Forward declaration
class ChatRoom;

// Represents a single connected client
class ChatSession : public std::enable_shared_from_this<ChatSession> {
public:
    ChatSession(tcp::socket socket, std::shared_ptr<ChatRoom> room);
    void start();
    void deliver(const std::string& message);

private:
    void on_accept(beast::error_code ec);
    void read();
    void write(const std::string& message);
    void on_write(beast::error_code ec, std::size_t bytes_transferred);

    websocket::stream<tcp::socket> ws_;
    beast::flat_buffer buffer_;
    std::shared_ptr<ChatRoom> room_;
};
