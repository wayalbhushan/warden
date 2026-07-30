package adminapi

import (
	"fmt"
	"log/slog"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// InitDB initializes PostgreSQL connection using GORM and executes AutoMigrate for all adminapi models.
func InitDB(dsn string) (*gorm.DB, error) {
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("failed to open postgres database connection: %w", err)
	}

	slog.Info("Executing GORM auto-migration for scan history and configuration tables...")
	if err := db.AutoMigrate(&ScanReport{}, &Finding{}, &GatewayConfig{}, &BlockedIP{}); err != nil {
		return nil, fmt.Errorf("failed to auto-migrate postgres database schema: %w", err)
	}

	slog.Info("PostgreSQL database connection and GORM auto-migration successful.")
	return db, nil
}
