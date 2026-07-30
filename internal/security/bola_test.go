package security_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/bhushanwayal/warden/internal/ratelimit"
	"github.com/bhushanwayal/warden/internal/security"
)

func TestBOLAEngine(t *testing.T) {
	client, err := ratelimit.NewRedisClient("redis://localhost:6379")
	if err != nil {
		t.Skipf("skipping BOLA engine test (Redis container unavailable): %v", err)
	}
	defer client.Close()

	ctx := context.Background()
	engine := security.NewBOLAEngine(client, 3, 1*time.Minute)
	userID := "attacker-99"

	// Flush old keys before test
	_ = client.Del(ctx, "warden:bola:attacker-99:GET:/api/documents/*").Err()

	// 1st request (/api/documents/10) - allowed (1 unique ID)
	req1 := httptest.NewRequest(http.MethodGet, "/api/documents/10", nil)
	matched, threat := engine.AnalyzeRequest(ctx, req1, userID)
	if matched || threat != "" {
		t.Errorf("request 1: expected matched=false, got matched=%v, threat=%q", matched, threat)
	}

	// 2nd request (/api/documents/11) - allowed (2 unique IDs)
	req2 := httptest.NewRequest(http.MethodGet, "/api/documents/11", nil)
	matched, threat = engine.AnalyzeRequest(ctx, req2, userID)
	if matched || threat != "" {
		t.Errorf("request 2: expected matched=false, got matched=%v, threat=%q", matched, threat)
	}

	// 3rd request (/api/documents/12) - allowed (3 unique IDs, at threshold)
	req3 := httptest.NewRequest(http.MethodGet, "/api/documents/12", nil)
	matched, threat = engine.AnalyzeRequest(ctx, req3, userID)
	if matched || threat != "" {
		t.Errorf("request 3: expected matched=false, got matched=%v, threat=%q", matched, threat)
	}

	// 4th request (/api/documents/13) - TRIPPED (4 unique IDs > threshold 3)
	req4 := httptest.NewRequest(http.MethodGet, "/api/documents/13", nil)
	matched, threat = engine.AnalyzeRequest(ctx, req4, userID)
	if !matched || threat != "BOLA_Enumeration" {
		t.Errorf("request 4: expected matched=true, threat='BOLA_Enumeration'; got matched=%v, threat=%q", matched, threat)
	}
}
