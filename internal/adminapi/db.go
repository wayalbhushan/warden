package adminapi

import (
	"fmt"
	"log/slog"

	"github.com/glebarez/sqlite"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// InitDB initializes PostgreSQL connection using GORM and executes AutoMigrate for all adminapi models.
// If PostgreSQL is unreachable, it seamlessly falls back to a local SQLite database (warden-admin.db).
func InitDB(dsn string) (*gorm.DB, error) {
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		slog.Warn("PostgreSQL server unreachable, falling back to local SQLite database (warden-admin.db)", "reason", err)
		db, err = gorm.Open(sqlite.Open("warden-admin.db"), &gorm.Config{})
		if err != nil {
			return nil, fmt.Errorf("failed to initialize fallback sqlite database: %w", err)
		}
		slog.Info("Successfully initialized fallback SQLite database (warden-admin.db)")
	} else {
		slog.Info("Successfully connected to PostgreSQL database")
	}

	slog.Info("Executing GORM auto-migration for scan history and configuration tables...")
	if err := db.AutoMigrate(&ScanReport{}, &Finding{}, &GatewayConfig{}, &BlockedIP{}); err != nil {
		return nil, fmt.Errorf("failed to auto-migrate database schema: %w", err)
	}

	slog.Info("Database connection and GORM auto-migration completed successfully.")
	return db, nil
}
