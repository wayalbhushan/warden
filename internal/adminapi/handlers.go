package adminapi

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// RegisterRoutes registers all Admin API REST endpoints onto the Gin engine router.
func RegisterRoutes(r *gin.Engine, db *gorm.DB) {
	api := r.Group("/api")

	// ------------------------------------------------------------------
	// Scan History Endpoints
	// ------------------------------------------------------------------

	// GET /api/scans — Returns a list of all scan reports (most recent first)
	api.GET("/scans", func(c *gin.Context) {
		if db == nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "PostgreSQL database not connected"})
			return
		}

		var scans []ScanReport
		if err := db.Order("generated_at desc").Find(&scans).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch scan reports"})
			return
		}
		c.JSON(http.StatusOK, scans)
	})

	// GET /api/scans/:id — Returns a specific scan report with preloaded findings
	api.GET("/scans/:id", func(c *gin.Context) {
		if db == nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "PostgreSQL database not connected"})
			return
		}

		id := c.Param("id")
		var scan ScanReport
		if err := db.Preload("Findings").First(&scan, id).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				c.JSON(http.StatusNotFound, gin.H{"error": "Scan report not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database query error"})
			return
		}
		c.JSON(http.StatusOK, scan)
	})

	// GET /api/findings — Returns findings, optionally filtered by ?severity=Critical
	api.GET("/findings", func(c *gin.Context) {
		if db == nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "PostgreSQL database not connected"})
			return
		}

		severity := c.Query("severity")
		var findings []Finding

		query := db.Model(&Finding{}).Preload("ScanReport")
		if severity != "" {
			query = query.Where("severity = ?", severity)
		}

		if err := query.Find(&findings).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch findings"})
			return
		}
		c.JSON(http.StatusOK, findings)
	})

	// ------------------------------------------------------------------
	// Gateway Configuration Management Endpoints
	// ------------------------------------------------------------------

	// GET /api/config — Returns current gateway configuration (creates default if none exists)
	api.GET("/config", func(c *gin.Context) {
		if db == nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "PostgreSQL database not connected"})
			return
		}

		var cfg GatewayConfig
		if err := db.First(&cfg).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				// Seed default config
				cfg = GatewayConfig{
					WAFMode:      "balanced",
					RateLimitRPM: 100,
				}
				if err := db.Create(&cfg).Error; err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create default configuration"})
					return
				}
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch configuration"})
				return
			}
		}
		c.JSON(http.StatusOK, cfg)
	})

	// PUT /api/config — Updates WAF sensitivity mode and rate limit threshold
	api.PUT("/config", func(c *gin.Context) {
		if db == nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "PostgreSQL database not connected"})
			return
		}

		var input struct {
			WAFMode      string `json:"waf_mode"`
			RateLimitRPM int    `json:"rate_limit_rpm"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
			return
		}

		// Validate WAF mode enum
		mode := strings.ToLower(input.WAFMode)
		if mode != "permissive" && mode != "balanced" && mode != "strict" {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid waf_mode. Must be one of: permissive, balanced, strict",
			})
			return
		}

		if input.RateLimitRPM <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid rate_limit_rpm. Must be a positive integer",
			})
			return
		}

		var cfg GatewayConfig
		if err := db.First(&cfg).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				cfg = GatewayConfig{
					WAFMode:      mode,
					RateLimitRPM: input.RateLimitRPM,
				}
				if err := db.Create(&cfg).Error; err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create config"})
					return
				}
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query config"})
				return
			}
		} else {
			cfg.WAFMode = mode
			cfg.RateLimitRPM = input.RateLimitRPM
			if err := db.Save(&cfg).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update configuration"})
				return
			}
		}

		c.JSON(http.StatusOK, cfg)
	})

	// ------------------------------------------------------------------
	// IP Blocklist Management Endpoints
	// ------------------------------------------------------------------

	// GET /api/blocked-ips — Returns list of explicitly banned IPs
	api.GET("/blocked-ips", func(c *gin.Context) {
		if db == nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "PostgreSQL database not connected"})
			return
		}

		var blocked []BlockedIP
		if err := db.Order("created_at desc").Find(&blocked).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch blocked IPs"})
			return
		}
		c.JSON(http.StatusOK, blocked)
	})

	// POST /api/blocked-ips — Adds an IP to the blocklist
	api.POST("/blocked-ips", func(c *gin.Context) {
		if db == nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "PostgreSQL database not connected"})
			return
		}

		var input struct {
			IP     string `json:"ip" binding:"required"`
			Reason string `json:"reason"`
		}

		if err := c.ShouldBindJSON(&input); err != nil || strings.TrimSpace(input.IP) == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "IP address is required"})
			return
		}

		entry := BlockedIP{
			IPAddress: strings.TrimSpace(input.IP),
			Reason:    input.Reason,
		}

		if err := db.Create(&entry).Error; err != nil {
			if strings.Contains(err.Error(), "duplicate key") || strings.Contains(err.Error(), "UNIQUE constraint") {
				c.JSON(http.StatusBadRequest, gin.H{"error": "IP address is already blocked"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to block IP"})
			return
		}

		c.JSON(http.StatusCreated, entry)
	})

	// DELETE /api/blocked-ips/:id — Removes an IP from the blocklist by ID
	api.DELETE("/blocked-ips/:id", func(c *gin.Context) {
		if db == nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "PostgreSQL database not connected"})
			return
		}

		id := c.Param("id")
		var entry BlockedIP
		if err := db.First(&entry, id).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				c.JSON(http.StatusNotFound, gin.H{"error": "Blocked IP record not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
			return
		}

		if err := db.Delete(&entry).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove blocked IP"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "IP unblocked successfully", "id": entry.ID})
	})
}
