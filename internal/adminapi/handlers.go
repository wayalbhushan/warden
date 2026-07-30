package adminapi

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// RegisterRoutes registers all Admin API REST endpoints onto the Gin engine router.
func RegisterRoutes(r *gin.Engine, db *gorm.DB) {
	api := r.Group("/api")

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

		query := db.Model(&Finding{})
		if severity != "" {
			query = query.Where("severity = ?", severity)
		}

		if err := query.Find(&findings).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch findings"})
			return
		}
		c.JSON(http.StatusOK, findings)
	})
}
