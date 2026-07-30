package proxy

import (
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"time"
)

// Proxy handles reverse proxy request routing and traffic forwarding to upstream services.
type Proxy struct {
	targetURL    *url.URL
	reverseProxy *httputil.ReverseProxy
}

// responseWriterWrapper captures the HTTP status code written by the proxy.
type responseWriterWrapper struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriterWrapper) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

// New creates a new Proxy instance targeting the specified upstream URL with optimized transport connection pooling.
func New(targetURLStr string) (*Proxy, error) {
	parsedURL, err := url.Parse(targetURLStr)
	if err != nil {
		return nil, fmt.Errorf("invalid upstream URL %q: %w", targetURLStr, err)
	}

	rp := httputil.NewSingleHostReverseProxy(parsedURL)

	// Configure production-grade HTTP transport for high-throughput connection reuse
	dialer := &net.Dialer{
		Timeout:   30 * time.Second, // Connection establishment timeout
		KeepAlive: 30 * time.Second, // TCP keep-alive probe interval
	}

	transport := &http.Transport{
		Proxy:                 http.ProxyFromEnvironment,
		DialContext:           dialer.DialContext,
		MaxIdleConns:          500,              // High total idle connection limit to support high concurrency
		MaxIdleConnsPerHost:   100,              // Retain active connections per host to reduce TCP handshake overhead
		IdleConnTimeout:       90 * time.Second, // Keep idle connections alive for reuse without socket leak
		TLSHandshakeTimeout:   10 * time.Second, // TLS handshake timeout for HTTPS upstreams
		ExpectContinueTimeout: 1 * time.Second,  // 100-continue header response timeout
		ResponseHeaderTimeout: 30 * time.Second, // Max wait time for upstream response headers
		ForceAttemptHTTP2:     true,             // Attempt HTTP/2 for upstreams supporting protocol negotiation
	}

	rp.Transport = transport

	// Wrap original director to customize request headers
	originalDirector := rp.Director
	rp.Director = func(req *http.Request) {
		originalDirector(req)

		// Inject gateway tracking header
		req.Header.Set("X-Warden-Gateway", "active")

		// Ensure forwarded headers are set
		if req.Header.Get("X-Forwarded-Host") == "" {
			req.Header.Set("X-Forwarded-Host", req.Host)
		}
		if req.Header.Get("X-Forwarded-Proto") == "" {
			if req.TLS != nil {
				req.Header.Set("X-Forwarded-Proto", "https")
			} else {
				req.Header.Set("X-Forwarded-Proto", "http")
			}
		}
	}

	// Add tracking header to response
	rp.ModifyResponse = func(resp *http.Response) error {
		resp.Header.Set("X-Warden-Gateway", "active")
		return nil
	}

	// Handle upstream connection errors gracefully
	rp.ErrorHandler = func(w http.ResponseWriter, r *http.Request, err error) {
		slog.Error("upstream service error",
			slog.String("path", r.URL.Path),
			slog.String("upstream", parsedURL.String()),
			slog.String("error", err.Error()),
		)

		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("X-Warden-Gateway", "active")
		w.WriteHeader(http.StatusBadGateway)
		_, _ = w.Write([]byte(`{"error":"bad gateway","message":"upstream service unavailable"}`))
	}

	return &Proxy{
		targetURL:    parsedURL,
		reverseProxy: rp,
	}, nil
}

// ServeHTTP intercepts incoming HTTP requests, logs metadata, and forwards to upstream backend.
func (p *Proxy) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	wrapper := &responseWriterWrapper{
		ResponseWriter: w,
		statusCode:     http.StatusOK,
	}

	p.reverseProxy.ServeHTTP(wrapper, r)

	duration := time.Since(start)

	slog.Info("proxied request",
		slog.String("method", r.Method),
		slog.String("path", r.URL.Path),
		slog.String("remote_addr", r.RemoteAddr),
		slog.Int("status", wrapper.statusCode),
		slog.Duration("latency", duration),
	)
}
