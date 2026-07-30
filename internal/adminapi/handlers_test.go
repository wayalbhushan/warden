package adminapi

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

// setupTestRouter initializes an in-memory SQLite DB, runs auto-migrations, seeds data, and returns a Gin router.
func setupTestRouter() (*gin.Engine, *gorm.DB) {
	gin.SetMode(gin.TestMode)
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		panic("failed to connect in-memory sqlite test database: " + err.Error())
	}

	db.AutoMigrate(&ScanReport{}, &Finding{}, &GatewayConfig{}, &BlockedIP{})

	// Seed test scan report and finding
	report := ScanReport{
		TargetURL:     "http://test.local",
		SpecPath:      "./test-spec.json",
		GeneratedAt:   time.Now(),
		TotalFindings: 1,
		Findings: []Finding{
			{
				Type:     "BOLA/IDOR",
				Severity: "Critical",
				Method:   "GET",
				Path:     "/api/documents/1",
				Details:  "User B accessed User A resource",
			},
		},
	}
	db.Create(&report)

	r := gin.Default()
	RegisterRoutes(r, db)
	return r, db
}

func TestGetScans(t *testing.T) {
	r, _ := setupTestRouter()
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/scans", nil)

	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK, got %d", w.Code)
	}
}

func TestGetScanByID_Found(t *testing.T) {
	r, _ := setupTestRouter()
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/scans/1", nil)

	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK, got %d", w.Code)
	}
}

func TestGetScanByID_NotFound(t *testing.T) {
	r, _ := setupTestRouter()
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/scans/999", nil)

	r.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("Expected 404 Not Found, got %d", w.Code)
	}
}

func TestGetFindings(t *testing.T) {
	r, _ := setupTestRouter()
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/findings?severity=Critical", nil)

	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK, got %d", w.Code)
	}
}

func TestGetConfig(t *testing.T) {
	r, _ := setupTestRouter()
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/config", nil)

	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK, got %d", w.Code)
	}
}

func TestUpdateConfig_InvalidMode(t *testing.T) {
	r, _ := setupTestRouter()
	w := httptest.NewRecorder()

	payload := map[string]interface{}{
		"waf_mode":       "invalid_mode",
		"rate_limit_rpm": 200,
	}
	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("PUT", "/api/config", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("Expected 400 Bad Request for invalid WAF mode, got %d", w.Code)
	}
}

func TestBlockedIPsCRUD(t *testing.T) {
	r, _ := setupTestRouter()

	// 1. Add blocked IP
	w1 := httptest.NewRecorder()
	payload := map[string]string{"ip": "10.0.0.99", "reason": "Test Ban"}
	body, _ := json.Marshal(payload)
	req1, _ := http.NewRequest("POST", "/api/blocked-ips", bytes.NewBuffer(body))
	req1.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w1, req1)

	if w1.Code != http.StatusCreated {
		t.Fatalf("Expected 201 Created for POST /api/blocked-ips, got %d", w1.Code)
	}

	// 2. Fetch blocked IPs
	w2 := httptest.NewRecorder()
	req2, _ := http.NewRequest("GET", "/api/blocked-ips", nil)
	r.ServeHTTP(w2, req2)

	if w2.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK for GET /api/blocked-ips, got %d", w2.Code)
	}

	// 3. Delete blocked IP
	w3 := httptest.NewRecorder()
	req3, _ := http.NewRequest("DELETE", "/api/blocked-ips/1", nil)
	r.ServeHTTP(w3, req3)

	if w3.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK for DELETE /api/blocked-ips/1, got %d", w3.Code)
	}
}
