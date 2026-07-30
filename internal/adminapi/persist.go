package adminapi

import (
	"time"

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
func SaveScanReport(dsn, targetURL, specPath string, payloads []FindingPayload) error {
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return err
	}

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
