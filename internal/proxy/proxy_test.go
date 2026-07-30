package proxy_test

import (
	"io"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"github.com/bhushanwayal/warden/internal/proxy"
)

func TestProxyForwarding(t *testing.T) {
	// Create mock upstream backend
	mockBackend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("X-Warden-Gateway") != "active" {
			t.Errorf("expected X-Warden-Gateway request header to be 'active', got %q", r.Header.Get("X-Warden-Gateway"))
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	}))
	defer mockBackend.Close()

	// Initialize proxy targeting mock backend
	p, err := proxy.New(mockBackend.URL)
	if err != nil {
		t.Fatalf("failed to create proxy: %v", err)
	}

	if p.ActiveRequests() != 0 {
		t.Errorf("expected 0 active requests initially, got %d", p.ActiveRequests())
	}

	// Record request through proxy
	req := httptest.NewRequest(http.MethodGet, "/test-path", nil)
	rec := httptest.NewRecorder()

	p.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rec.Code)
	}

	if rec.Header().Get("X-Warden-Gateway") != "active" {
		t.Errorf("expected X-Warden-Gateway response header to be 'active', got %q", rec.Header().Get("X-Warden-Gateway"))
	}

	if p.ActiveRequests() != 0 {
		t.Errorf("expected 0 active requests after completion, got %d", p.ActiveRequests())
	}
}

func TestProxyBadGateway(t *testing.T) {
	// Initialize proxy with invalid/unreachable target URL
	p, err := proxy.New("http://127.0.0.1:59999")
	if err != nil {
		t.Fatalf("failed to create proxy: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/error-path", nil)
	rec := httptest.NewRecorder()

	p.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadGateway {
		t.Errorf("expected status 502 Bad Gateway, got %d", rec.Code)
	}

	if rec.Header().Get("X-Warden-Gateway") != "active" {
		t.Errorf("expected X-Warden-Gateway header on error response, got %q", rec.Header().Get("X-Warden-Gateway"))
	}
}

func TestProxyConcurrentLoad(t *testing.T) {
	// 1. Upstream backend returning HTTP 200 OK
	mockUpstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	}))
	defer mockUpstream.Close()

	// 2. Initialize proxy instance targeting upstream backend
	p, err := proxy.New(mockUpstream.URL)
	if err != nil {
		t.Fatalf("failed to create proxy: %v", err)
	}

	// 3. Create test server for proxy itself
	proxyServer := httptest.NewServer(p)
	defer proxyServer.Close()

	// 4. Launch 500 concurrent goroutines sending GET requests
	const concurrency = 500
	var wg sync.WaitGroup
	wg.Add(concurrency)

	client := &http.Client{
		Transport: &http.Transport{
			MaxIdleConns:        concurrency,
			MaxIdleConnsPerHost: concurrency,
			MaxConnsPerHost:     concurrency,
			IdleConnTimeout:     90 * time.Second,
		},
		Timeout: 10 * time.Second,
	}

	errChan := make(chan error, concurrency)

	for i := 0; i < concurrency; i++ {
		go func() {
			defer wg.Done()

			var resp *http.Response
			var err error
			for attempt := 0; attempt < 5; attempt++ {
				resp, err = client.Get(proxyServer.URL + "/concurrent-test")
				if err == nil {
					break
				}
				time.Sleep(5 * time.Millisecond)
			}

			if err != nil {
				errChan <- err
				return
			}
			defer resp.Body.Close()

			_, _ = io.Copy(io.Discard, resp.Body)

			if resp.StatusCode != http.StatusOK {
				t.Errorf("expected HTTP 200, got %d", resp.StatusCode)
			}
		}()
	}

	wg.Wait()
	close(errChan)

	for err := range errChan {
		t.Errorf("concurrent request failed: %v", err)
	}

	// 5. Assert active requests counter drains completely to 0
	if active := p.ActiveRequests(); active != 0 {
		t.Errorf("expected 0 active requests after concurrent load test, got %d", active)
	}
}
