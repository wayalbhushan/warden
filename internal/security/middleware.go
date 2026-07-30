package security

import (
	"encoding/json"
	"log/slog"
	"net"
	"net/http"
	"strings"

	"github.com/bhushanwayal/warden/internal/auth"
)

type securityResponse struct {
	Error      string `json:"error"`
	ThreatType string `json:"threat_type"`
	Status     int    `json:"status"`
}

// NewSecurityMiddleware combines Signature WAF, SSRF, and BOLA detection engines into a unified HTTP middleware.
func NewSecurityMiddleware(sig *SignatureEngine, ssrf *SSRPEngine, bola *BOLAEngine) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			var matched bool
			var threatType string

			// 1. Signature WAF Engine
			if sig != nil {
				matched, threatType = sig.AnalyzeRequest(r)
			}

			// 2. SSRF Engine
			if !matched && ssrf != nil {
				matched, threatType = ssrf.AnalyzeRequest(r)
			}

			// 3. BOLA / IDOR Enumeration Engine
			if !matched && bola != nil {
				if claims, ok := auth.GetClaims(r.Context()); ok && claims != nil {
					if sub, ok := claims["sub"].(string); ok && sub != "" {
						matched, threatType = bola.AnalyzeRequest(r.Context(), r, sub)
					}
				}
			}

			if matched {
				clientIP := extractClientIP(r)
				slog.Warn("security threat detected and blocked",
					slog.String("threat_type", threatType),
					slog.String("client_ip", clientIP),
					slog.String("path", r.URL.Path),
				)

				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusForbidden)
				_ = json.NewEncoder(w).Encode(securityResponse{
					Error:      "Forbidden: Malicious activity detected",
					ThreatType: threatType,
					Status:     403,
				})
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func extractClientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		parts := strings.Split(xff, ",")
		ip := strings.TrimSpace(parts[0])
		if ip != "" {
			return ip
		}
	}

	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err == nil && host != "" {
		return host
	}

	if r.RemoteAddr != "" {
		return r.RemoteAddr
	}

	return "unknown"
}
