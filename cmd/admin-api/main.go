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
		host = "localhost"
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
	
	// Attempt database initialization
	database, err := adminapi.InitDB(dsn)
	if err != nil {
		slog.Warn("PostgreSQL database initialization skipped (running without DB connection)", "reason", err)
	} else {
		db = database
	}

	router := gin.Default()

	// Health check route
	router.GET("/health", func(c *gin.Context) {
		dbConnected := db != nil
		c.JSON(http.StatusOK, gin.H{
			"status":       "ok",
			"service":      "warden-admin-api",
			"db_connected": dbConnected,
		})
	})

	port := os.Getenv("ADMIN_API_PORT")
	if port == "" {
		port = "8082"
	}

	if err := router.Run(":" + port); err != nil {
		slog.Error("Failed to start Admin API server", "error", err)
		os.Exit(1)
	}
}
