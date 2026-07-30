package main

import (
	"log/slog"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

func main() {
	slog.Info("Starting Warden Admin API service...", "port", "8082")

	// Set Gin mode based on ENV environment variable if present
	if os.Getenv("ENV") == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.Default()

	// Health check route
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"service": "warden-admin-api",
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
