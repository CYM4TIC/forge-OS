use std::sync::OnceLock;

use regex::Regex;

/// Port detection patterns for common dev server frameworks.
/// Ordered by specificity — URL patterns first, keyword patterns second.
/// Each regex must have exactly one capture group for the port number.
fn patterns() -> &'static [Regex] {
    static PATTERNS: OnceLock<Vec<Regex>> = OnceLock::new();
    PATTERNS.get_or_init(|| {
        [
            // URL patterns (high confidence)
            // Vite: "Local:   http://localhost:5173/"
            // Next.js: "url: http://localhost:3000"
            // Flask: "Running on http://127.0.0.1:5000"
            // Django: "Starting development server at http://127.0.0.1:8000/"
            r"https?://(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1?\]):(\d{4,5})",

            // Keyword + port patterns (medium confidence)
            // Go/generic: "Listening on :8080"
            r"(?i)listening\s+on\s+:(\d{4,5})",

            // Express: "listening on port 3000"
            r"(?i)listening\s+on\s+port\s+(\d{4,5})",

            // Generic: "running on port 3000"
            r"(?i)running\s+on\s+port\s+(\d{4,5})",

            // Bun/generic: "started server at ... :3000"
            r"(?i)started\s+(?:server\s+)?(?:at|on)\s+\S*:(\d{4,5})",

            // Key-value: "Port: 8080" or "port: 8080"
            r"(?i)\bport:\s*(\d{4,5})\b",

            // "server on 0.0.0.0:3000"
            r"(?i)server\s+on\s+\S*:(\d{4,5})",

            // Bare address patterns (lower confidence, catch-all)
            // "localhost:PORT" anywhere in line
            r"localhost:(\d{4,5})",

            // "127.0.0.1:PORT"
            r"127\.0\.0\.1:(\d{4,5})",

            // "0.0.0.0:PORT"
            r"0\.0\.0\.0:(\d{4,5})",

            // "[::]:PORT" or "[::1]:PORT" (IPv6 loopback)
            r"\[::\d?\]:(\d{4,5})",
        ]
        .iter()
        .map(|p| Regex::new(p).expect("invalid port pattern regex"))
        .collect()
    })
}

/// Extract a port number from a log line using known dev server patterns.
/// Returns the first match. Validates port is in the usable range (1024-65535).
pub fn extract_port(line: &str) -> Option<u16> {
    for pattern in patterns() {
        if let Some(caps) = pattern.captures(line) {
            if let Some(port_str) = caps.get(1) {
                if let Ok(port) = port_str.as_str().parse::<u16>() {
                    if port >= 1024 {
                        return Some(port);
                    }
                }
            }
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vite() {
        assert_eq!(
            extract_port("  ➜  Local:   http://localhost:5173/"),
            Some(5173)
        );
    }

    #[test]
    fn test_nextjs() {
        assert_eq!(
            extract_port("- ready started server on 0.0.0.0:3000, url: http://localhost:3000"),
            Some(3000)
        );
    }

    #[test]
    fn test_flask() {
        assert_eq!(
            extract_port(" * Running on http://127.0.0.1:5000"),
            Some(5000)
        );
    }

    #[test]
    fn test_express() {
        assert_eq!(
            extract_port("Server listening on port 4000"),
            Some(4000)
        );
    }

    #[test]
    fn test_go_bare() {
        assert_eq!(extract_port("Listening on :8080"), Some(8080));
    }

    #[test]
    fn test_django() {
        assert_eq!(
            extract_port("Starting development server at http://127.0.0.1:8000/"),
            Some(8000)
        );
    }

    #[test]
    fn test_port_key_value() {
        assert_eq!(extract_port("Port: 9000"), Some(9000));
    }

    #[test]
    fn test_rejects_low_port() {
        assert_eq!(extract_port("http://localhost:80/"), None);
    }

    #[test]
    fn test_no_match() {
        assert_eq!(extract_port("compiling modules..."), None);
    }
}
