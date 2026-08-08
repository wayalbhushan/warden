package main

import (
	"fmt"
	"log/slog"
	"net/http"
	"os"

	"github.com/bhushanwayal/warden/internal/adminapi"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func getDSN() string {
	if envDSN := os.Getenv("DATABASE_URL"); envDSN != "" {
		return envDSN
	}

	host := os.Getenv("POSTGRES_HOST")
	if host == "" {
		host = "127.0.0.1"
	}
	port := os.Getenv("POSTGRES_PORT")
	if port == "" {
		port = "5432"
	}
	user := os.Getenv("POSTGRES_USER")
	if user == "" {
		user = "warden"
	}
	pass := os.Getenv("POSTGRES_PASSWORD")
	if pass == "" {
		pass = "wardenpass"
	}
	dbname := os.Getenv("POSTGRES_DB")
	if dbname == "" {
		dbname = "wardendb"
	}

	return fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable",
		host, user, pass, dbname, port)
}

func main() {
	slog.Info("Starting Warden Admin API service...", "port", "8082")

	if os.Getenv("ENV") == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	var db *gorm.DB
	dsn := getDSN()

	// Initialize database (connects to PostgreSQL or falls back to local SQLite warden-admin.db)
	database, err := adminapi.InitDB(dsn)
	if err != nil {
		slog.Error("Fatal: Database initialization failed", "error", err)
		os.Exit(1)
	}
	db = database

	router := gin.Default()

	// Health check route
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":       "ok",
			"service":      "warden-admin-api",
			"db_connected": db != nil,
			"db_driver":    db.Dialector.Name(),
		})
	})

	// Register scan history and findings REST routes
	adminapi.RegisterRoutes(router, db)

	port := os.Getenv("ADMIN_API_PORT")
	if port == "" {
		port = "8082"
	}

	if err := router.Run(":" + port); err != nil {
		slog.Error("Failed to start Admin API server", "error", err)
		os.Exit(1)
	}
}
