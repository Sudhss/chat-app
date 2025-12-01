#include "chat_session.hpp"
#include "chat_room.hpp"
#include <sstream>
#include <iomanip>
#include <chrono>
#include <boost/uuid/uuid.hpp>
#include <boost/uuid/uuid_generators.hpp>
#include <boost/uuid/uuid_io.hpp>

using namespace std;
using namespace boost::uuids;

ChatSession::ChatSession(tcp::socket socket, shared_ptr<ChatRoom> room)
    : ws_(move(socket))
    , room_(move(room))
    , session_id_(generate_session_id()) {
    
    // Get remote endpoint
    try {
        auto endpoint = ws_.next_layer().socket().remote_endpoint();
        remote_endpoint_ = endpoint.address().to_string() + ":" + to_string(endpoint.port());
    } catch (...) {
        remote_endpoint_ = "unknown";
    }
}

ChatSession::~ChatSession() {
    close();
}

string ChatSession::generate_session_id() {
    random_generator gen;
    uuid id = gen();
    return to_string(id);
}

void ChatSession::start() {
    ws_.async_accept(
        [self = shared_from_this()](beast::error_code ec) {
            self->on_accept(ec);
        });
}

void ChatSession::close() {
    if (ws_.is_open()) {
        beast::error_code ec;
        ws_.close(websocket::close_code::normal, ec);
        if (close_handler_) {
            close_handler_();
        }
    }
}

bool ChatSession::authenticate(const string& username) {
    if (username.empty()) {
        return false;
    }
    
    user_ = UserManager::instance().create_user(username);
    return user_ != nullptr;
}

void ChatSession::on_accept(beast::error_code ec) {
    if (ec) {
        cerr << "Accept error: " << ec.message() << endl;
        return;
    }
    
    // Set binary message type
    ws_.binary(false);
    
    // Start reading messages
    read();
}

void ChatSession::read() {
    ws_.async_read(
        buffer_,
        [self = shared_from_this()](beast::error_code ec, size_t bytes_transferred) {
            if (ec) {
                if (ec != websocket::error::closed) {
                    cerr << "Read error: " << ec.message() << endl;
                }
                self->close();
                return;
            }
            
            // Process the received message
            string message = beast::buffers_to_string(self->buffer_.data());
            self->buffer_.consume(self->buffer_.size());
            
            // Handle the message
            if (self->message_handler_) {
                self->message_handler_(message, self->session_id_);
            }
            
            // Continue reading
            self->read();
        });
}

void ChatSession::deliver(const string& message) {
    // Post the write to the io_context to ensure thread safety
    post(ws_.get_executor(),
        [self = shared_from_this(), message] {
            // Check if the connection is still open
            if (!self->ws_.is_open()) {
                return;
            }
            
            // Queue the message
            self->write(message);
        });
}

void ChatSession::write(const string& message) {
    // Check if we're already writing
    if (ws_.is_open()) {
        ws_.async_write(
            net::buffer(message),
            [self = shared_from_this()](beast::error_code ec, size_t) {
                if (ec) {
                    if (ec != websocket::error::closed) {
                        cerr << "Write error: " << ec.message() << endl;
                    }
                    self->close();
                }
            });
    }
}
