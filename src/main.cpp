#include <boost/asio/io_context.hpp>
#include <boost/asio/ip/tcp.hpp>
#include <boost/beast/core.hpp>
#include <boost/beast/websocket.hpp>
#include <iostream>
#include <memory>
#include <string>

namespace beast = boost::beast;
namespace http = beast::http;
namespace websocket = beast::websocket;
namespace net = boost::asio;
using tcp = boost::asio::ip::tcp;

class WebSocketSession : public std::enable_shared_from_this<WebSocketSession> {
public:
    explicit WebSocketSession(tcp::socket socket)
        : ws_(std::move(socket)) {}

    void run() {
        ws_.async_accept(
            beast::bind_front_handler(
                &WebSocketSession::on_accept,
                shared_from_this()));
    }

    void on_accept(beast::error_code ec) {
        if (ec) {
            std::cerr << "Accept error: " << ec.message() << std::endl;
            return;
        }
        std::cout << "New WebSocket connection" << std::endl;
        do_read();
    }

    void do_read() {
        ws_.async_read(
            buffer_,
            beast::bind_front_handler(
                &WebSocketSession::on_read,
                shared_from_this()));
    }

    void on_read(beast::error_code ec, std::size_t bytes_transferred) {
        if (ec == websocket::error::closed) {
            std::cout << "WebSocket connection closed" << std::endl;
            return;
        }
        if (ec) {
            std::cerr << "Read error: " << ec.message() << std::endl;
            return;
        }

        // Echo the message back
        ws_.text(ws_.got_text());
        ws_.async_write(
            buffer_.data(),
            beast::bind_front_handler(
                &WebSocketSession::on_write,
                shared_from_this()));
    }

    void on_write(beast::error_code ec, std::size_t bytes_transferred) {
        if (ec) {
            std::cerr << "Write error: " << ec.message() << std::endl;
            return;
        }

        // Clear the buffer
        buffer_.consume(buffer_.size());

        // Read another message
        do_read();
    }

private:
    websocket::stream<beast::tcp_stream> ws_;
    beast::flat_buffer buffer_;
};

void run_server(net::io_context& ioc, tcp::endpoint endpoint) {
    tcp::acceptor acceptor{ioc, endpoint};
    std::cout << "Server running on " << endpoint << std::endl;

    for (;;) {
        auto socket = acceptor.accept(ioc);
        std::make_shared<WebSocketSession>(std::move(socket))->run();
    }
}

int main() {
    try {
        auto const address = net::ip::make_address("0.0.0.0");
        auto const port = static_cast<unsigned short>(8080);
        auto const threads = 1;  // Single-threaded for now

        net::io_context ioc{threads};
        run_server(ioc, tcp::endpoint{address, port});

        ioc.run();
    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << std::endl;
        return 1;
    }
    return 0;
}
