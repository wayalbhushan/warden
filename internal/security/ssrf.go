package security

import (
	"context"
	"net"
	"net/http"
	"net/netip"
	"net/url"
	"strings"
	"time"
)

// SSRPEngine detects Server-Side Request Forgery (SSRF) attempts in HTTP request parameters.
type SSRPEngine struct{}

// NewSSRPEngine creates a new SSRPEngine instance.
func NewSSRPEngine() *SSRPEngine {
	return &SSRPEngine{}
}

// AnalyzeRequest inspects request parameters for URLs targeting internal, loopback, or cloud metadata endpoints.
func (e *SSRPEngine) AnalyzeRequest(r *http.Request) (matched bool, threatType string) {
	if r == nil || r.URL == nil {
		return false, ""
	}

	for _, values := range r.URL.Query() {
		for _, val := range values {
			val = strings.TrimSpace(val)
			if val == "" {
				continue
			}

			parsedURL, err := url.Parse(val)
			if err != nil || parsedURL.Scheme == "" || parsedURL.Host == "" {
				continue
			}

			scheme := strings.ToLower(parsedURL.Scheme)
			if scheme != "http" && scheme != "https" {
				continue
			}

			rawHost := parsedURL.Host
			host, _, err := net.SplitHostPort(rawHost)
			if err != nil || host == "" {
				host = rawHost
			}

			hostLower := strings.ToLower(host)

			// Check hardcoded suspicious internal hostnames
			if hostLower == "localhost" || hostLower == "metadata.google.internal" || strings.HasSuffix(hostLower, ".local") {
				return true, "SSRF"
			}

			// Try parsing host as direct IP address
			ip, err := netip.ParseAddr(host)
			if err != nil {
				// Perform fast DNS lookup with strict 100ms timeout
				reqCtx := r.Context()
				if reqCtx == nil {
					reqCtx = context.Background()
				}

				ctx, cancel := context.WithTimeout(reqCtx, 100*time.Millisecond)
				ips, lookupErr := net.DefaultResolver.LookupNetIP(ctx, "ip4", host)
				cancel()

				if lookupErr != nil || len(ips) == 0 {
					continue
				}
				ip = ips[0]
			}

			// Evaluate IP against internal/restricted subnets
			if isRestrictedIP(ip) {
				return true, "SSRF"
			}
		}
	}

	return false, ""
}

func isRestrictedIP(ip netip.Addr) bool {
	if ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() || ip.String() == "169.254.169.254" {
		return true
	}
	return false
}
