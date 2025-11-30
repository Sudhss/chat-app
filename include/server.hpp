#pragma once

#include <boost/asio/ip/tcp.hpp>
#include <memory>

namespace net = boost::asio;
using tcp = net::ip::tcp;

class ChatRoom;

class Server {
public:
    Server(net::io_context& ioc, const tcp::endpoint& endpoint);

private:
    void accept();
    void on_accept(boost::system::error_code ec, tcp::socket socket);

    tcp::acceptor acceptor_;
    std::shared_ptr<ChatRoom> room_;
};
