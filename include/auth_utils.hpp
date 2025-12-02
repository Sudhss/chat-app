#pragma once

#include <string>
#include <jwt-cpp/jwt.h>
#include <boost/beast/http/status.hpp>
#include <chrono>
#include <stdexcept>

class AuthUtils {
public:
    // Initialize with a secret key for JWT
    static void initialize(const std::string& secret_key, const std::string& issuer = "chat-app") {
        get_instance().secret_key_ = secret_key;
        get_instance().issuer_ = issuer;
    }

    // Generate JWT token for a user
    static std::string generate_token(const std::string& user_id, const std::string& username) {
        auto& instance = get_instance();
        auto now = std::chrono::system_clock::now();
        auto expires_at = now + std::chrono::hours(24); // Token expires in 24 hours

        return jwt::create()
            .set_issuer(instance.issuer_)
            .set_type("JWT")
            .set_issued_at(now)
            .set_expires_at(expires_at)
            .set_payload_claim("user_id", jwt::claim(user_id))
            .set_payload_claim("username", jwt::claim(username))
            .sign(jwt::algorithm::hs256{instance.secret_key});
    }

    // Verify and decode JWT token
    static std::pair<std::string, std::string> verify_token(const std::string& token) {
        auto& instance = get_instance();
        
        try {
            auto decoded = jwt::decode(token);
            auto verifier = jwt::verify()
                .allow_algorithm(jwt::algorithm::hs256{instance.secret_key})
                .with_issuer(instance.issuer_);

            verifier.verify(decoded);

            return {
                decoded.get_payload_claim("user_id").as_string(),
                decoded.get_payload_claim("username").as_string()
            };
        } catch (const std::exception& e) {
            throw std::runtime_error("Invalid token: " + std::string(e.what()));
        }
    }

    // Generate a random string for secret key
    static std::string generate_secret_key() {
        static const char alphanum[] =
            "0123456789"
            "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
            "abcdefghijklmnopqrstuvwxyz";
        
        std::string result;
        result.reserve(64);
        
        std::random_device rd;
        std::mt19937 gen(rd());
        std::uniform_int_distribution<> dis(0, sizeof(alphanum) - 2);
        
        for (int i = 0; i < 64; ++i) {
            result += alphanum[dis(gen)];
        }
        
        return result;
    }

private:
    static AuthUtils& get_instance() {
        static AuthUtils instance;
        return instance;
    }

    std::string secret_key_;
    std::string issuer_;
};
