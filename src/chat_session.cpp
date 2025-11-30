#include "chat_session.hpp"
#include "chat_room.hpp"
#include <iostream>

using namespace std;

ChatSession::ChatSession(tcp::socket socket, shared_ptr<ChatRoom> room)
    : ws_(move(socket)), room_(move(room)) {}

void ChatSession::start() {
    ws_.async_accept(
        bind(&ChatSession::on_accept, shared_from_this(), placeholders::_1));
}

void ChatSession::on_accept(beast::error_code ec) {
    if (ec) {
        cerr << "Accept error: " << ec.message() << endl;
        return;
    }
    cout << "New client connected" << endl;
    room_->join(shared_from_this());
    read();
}

void ChatSession::read() {
    ws_.async_read(
        buffer_,
        [self = shared_from_this()](beast::error_code ec, size_t) {
            if (!ec) {
                auto msg = beast::buffers_to_string(self->buffer_.data());
                cout << "Message: " << msg << endl;
                self->room_->broadcast(msg, self);
                self->buffer_.consume(self->buffer_.size());
                self->read();
            } else if (ec != websocket::error::closed) {
                cerr << "Read error: " << ec.message() << endl;
                self->room_->leave(self);
            }
        });
}

void ChatSession::deliver(const string& message) {
    // Post the write to the io_context to ensure thread safety
    post(ws_.get_executor(),
        [self = shared_from_this(), message] {
            self->write(message);
        });
}

void ChatSession::write(const string& message) {
    ws_.async_write(
        net::buffer(message),
        [self = shared_from_this()](beast::error_code ec, size_t) {
            if (ec) {
                cerr << "Write error: " << ec.message() << endl;
                self->room_->leave(self);
            }
        });
}
