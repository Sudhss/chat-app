#pragma once

#include <string>
#include <fstream>
#include <nlohmann/json.hpp>
#include <filesystem>
#include <iostream>

using json = nlohmann::json;

class Config {
public:
    // Prevent copying and assignment
    Config(const Config&) = delete;
    Config& operator=(const Config&) = delete;

    // Get singleton instance
    static Config& get() {
        static Config instance;
        return instance;
    }

    // Load configuration from file
    bool load(const std::string& config_file = "config.json") {
        try {
            std::ifstream f(config_file);
            if (!f.is_open()) {
                std::cerr << "Config file not found, creating default config" << std::endl;
                return create_default_config(config_file);
            }
            
            json data = json::parse(f);
            config_ = data;
            return true;
        } catch (const std::exception& e) {
            std::cerr << "Error loading config: " << e.what() << std::endl;
            return false;
        }
    }

    // Save configuration to file
    bool save(const std::string& config_file = "config.json") const {
        try {
            std::ofstream f(config_file);
            if (!f.is_open()) {
                return false;
            }
            f << config_.dump(4);
            return true;
        } catch (const std::exception& e) {
            std::cerr << "Error saving config: " << e.what() << std::endl;
            return false;
        }
    }

    // Getters with default values
    std::string get_string(const std::string& key, const std::string& default_val = "") const {
        return config_.value(key, default_val);
    }

    int get_int(const std::string& key, int default_val = 0) const {
        return config_.value(key, default_val);
    }

    bool get_bool(const std::string& key, bool default_val = false) const {
        return config_.value(key, default_val);
    }

    // Setters
    void set(const std::string& key, const std::string& value) {
        config_[key] = value;
    }

    void set(const std::string& key, int value) {
        config_[key] = value;
    }

    void set(const std::string& key, bool value) {
        config_[key] = value;
    }

    // Get the entire config as JSON
    const json& get_json() const {
        return config_;
    }

private:
    Config() = default;
    ~Config() = default;

    bool create_default_config(const std::string& config_file) {
        // Create default config
        config_ = {
            {"server", {
                {"host", "0.0.0.0"},
                {"port", 8080},
                {"threads", 4},
                {"log_level", "info"}
            }},
            {"auth", {
                {"jwt_secret", AuthUtils::generate_secret_key()},
                {"token_expiry_hours", 24},
                {"require_email_verification", false}
            }},
            {"database", {
                {"host", "localhost"},
                {"port", 27017},
                {"name", "chat_app"},
                {"use_mongodb", true}
            }},
            {"caching", {
                {"enabled", true},
                {"provider", "redis"},
                {"ttl_seconds", 3600}
            }}
        };

        // Save default config
        return save(config_file);
    }

    json config_;
};
