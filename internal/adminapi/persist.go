package adminapi

import (
	"log/slog"
	"time"

	"github.com/glebarez/sqlite"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// FindingPayload defines a plain struct to accept data from the scanner
// without creating cyclic dependencies or importing GORM in scanner package.
type FindingPayload struct {
	Type     string
	Severity string
	Method   string
	Path     string
	Details  string
}

// SaveScanReport establishes a connection and persists a single scan report into PostgreSQL using GORM.
// Falls back seamlessly to warden-admin.db if PostgreSQL is offline.
func SaveScanReport(dsn, targetURL, specPath string, payloads []FindingPayload) error {
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		slog.Warn("PostgreSQL unreachable for scan persistence, using local SQLite (warden-admin.db)", "error", err)
		db, err = gorm.Open(sqlite.Open("warden-admin.db"), &gorm.Config{})
		if err != nil {
			return err
		}
	}

	// Ensure tables exist in target DB
	_ = db.AutoMigrate(&ScanReport{}, &Finding{})

	report := ScanReport{
		TargetURL:     targetURL,
		SpecPath:      specPath,
		GeneratedAt:   time.Now(),
		TotalFindings: len(payloads),
	}

	for _, p := range payloads {
		report.Findings = append(report.Findings, Finding{
			Type:     p.Type,
			Severity: p.Severity,
			Method:   p.Method,
			Path:     p.Path,
			Details:  p.Details,
		})
	}

	return db.Create(&report).Error
}
