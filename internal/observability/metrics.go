package observability

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
	// RequestsTotal tracks overall HTTP requests by method and status code.
	RequestsTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "warden_requests_total",
			Help: "Total number of HTTP requests processed by Warden gateway",
		},
		[]string{"method", "status"},
	)

	// RequestDuration tracks HTTP request latency histogram by method.
	RequestDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "warden_request_duration_seconds",
			Help:    "Histogram of request processing duration in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method"},
	)

	// SecurityBlocksTotal tracks security blocks by threat type (WAF, SSRF, BOLA).
	SecurityBlocksTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "warden_security_blocks_total",
			Help: "Total number of requests blocked by Warden security engines",
		},
		[]string{"threat_type"},
	)

	// RateLimitDropsTotal tracks requests dropped by Token Bucket rate limiter.
	RateLimitDropsTotal = prometheus.NewCounter(
		prometheus.CounterOpts{
			Name: "warden_rate_limit_drops_total",
			Help: "Total number of requests dropped due to rate limiting",
		},
	)
)

func init() {
	prometheus.MustRegister(
		RequestsTotal,
		RequestDuration,
		SecurityBlocksTotal,
		RateLimitDropsTotal,
	)
}

// StartMetricsServer starts a separate HTTP server on the given port to expose Prometheus metrics.
func StartMetricsServer(port string) {
	mux := http.NewServeMux()
	mux.Handle("/metrics", promhttp.Handler())

	server := &http.Server{
		Addr:    port,
		Handler: mux,
	}

	go func() {
		slog.Info("Starting Prometheus telemetry metrics server", slog.String("port", port))
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			slog.Error("Prometheus metrics server failed", slog.String("error", err.Error()))
		}
	}()
}
