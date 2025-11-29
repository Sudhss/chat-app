#define _WIN32_WINNT 0x0A00
#include <boost/beast/core.hpp>
#include <boost/beast/websocket.hpp>
#include <boost/asio/ip/tcp.hpp>
#include <cstdlib>
#include <iostream>
#include <string>
#include <thread>

using namespace boost::beast;
using namespace boost::asio;
using namespace boost::asio::ip;
using tcp = tcp;

using namespace std;

void do_session(tcp::socket socket) {
    try {
        websocket::stream<tcp::socket> ws{move(socket)};
        
        // Accept the WebSocket handshake
        ws.accept();
        cout << "Client connected" << endl;

        while (true) {
            // Read a message
            flat_buffer buffer;
            ws.read(buffer);
            auto msg = buffers_to_string(buffer.data());
            cout << "Received: " << msg << endl;
            
            // Echo the message back
            ws.write(buffer.data());
        }
    } catch (system_error const& se) {
        if (se.code() != websocket::error::closed) {
            cerr << "Error: " << se.what() << endl;
        }
    } catch (exception const& e) {
        cerr << "Error: " << e.what() << endl;
    }
}

int main() {
    try {
        auto const address = make_address("0.0.0.0");
        auto const port = static_cast<unsigned short>(8080);

        io_context ioc;
        tcp::acceptor acceptor{ioc, {address, port}};
        cout << "Server running on port " << port << endl;

        while (true) {
            tcp::socket socket{ioc};
            acceptor.accept(socket);
            thread{&do_session, move(socket)}.detach();
        }
    } catch (exception const& e) {
        cerr << "Error: " << e.what() << endl;
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
