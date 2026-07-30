package adminapi

import (
	"time"

	"gorm.io/gorm"
)

// ScanReport represents the persisted metadata of an active vulnerability scan execution.
type ScanReport struct {
	ID            uint           `gorm:"primaryKey" json:"id"`
	TargetURL     string         `gorm:"type:varchar(255);not null" json:"target_url"`
	SpecPath      string         `gorm:"type:varchar(255)" json:"spec_path"`
	GeneratedAt   time.Time      `json:"generated_at"`
	TotalFindings int            `json:"total_findings"`
	Findings      []Finding      `gorm:"foreignKey:ScanReportID;constraint:OnDelete:CASCADE" json:"findings,omitempty"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
}

// Finding represents an individual vulnerability discovery linked to a ScanReport.
type Finding struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	ScanReportID uint           `gorm:"index;not null" json:"scan_report_id"`
	Type         string         `gorm:"type:varchar(100);not null" json:"type"`
	Severity     string         `gorm:"type:varchar(50);not null" json:"severity"`
	Method       string         `gorm:"type:varchar(20)" json:"method"`
	Path         string         `gorm:"type:varchar(255)" json:"path"`
	Details      string         `gorm:"type:text" json:"details"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}
