#ifndef STD_FORMAT_POLYFILL_H
#define STD_FORMAT_POLYFILL_H

#include <string>

namespace std {

template<typename T>
inline string format(const string& fmt, T value) {
    auto result = std::to_string(value);
    auto dot = result.find('.');
    if (dot != std::string::npos) {
        result.erase(result.find_last_not_of('0') + 1, std::string::npos);
        if (result.back() == '.') result.pop_back();
    }
    result += '%';
    return result;
}

}

#endif
