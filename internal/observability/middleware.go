package observability

import (
	"net/http"
	"strconv"
	"time"
)

type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

// MetricsMiddleware tracks HTTP request throughput and latency metrics via Prometheus.
func MetricsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		wrappedWriter := &responseWriter{
			ResponseWriter: w,
			statusCode:     http.StatusOK, // Default to 200 OK
		}

		next.ServeHTTP(wrappedWriter, r)

		duration := time.Since(start).Seconds()
		statusStr := strconv.Itoa(wrappedWriter.statusCode)

		RequestDuration.WithLabelValues(r.Method).Observe(duration)
		RequestsTotal.WithLabelValues(r.Method, statusStr).Inc()
	})
}
