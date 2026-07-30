package security

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

// idRegex identifies numeric IDs or UUIDs in request paths.
var idRegex = regexp.MustCompile(`(?i)(?:/)([0-9]+|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})(?:/|$)`)

// BOLAEngine tracks unique object access per user to detect Broken Object Level Authorization (BOLA/IDOR) enumeration.
type BOLAEngine struct {
	client    *redis.Client
	threshold int
	window    time.Duration
}

// NewBOLAEngine creates a new BOLAEngine instance.
func NewBOLAEngine(client *redis.Client, threshold int, window time.Duration) *BOLAEngine {
	return &BOLAEngine{
		client:    client,
		threshold: threshold,
		window:    window,
	}
}

// AnalyzeRequest inspects the path for object IDs and tracks unique access per user via Redis pipeline.
func (b *BOLAEngine) AnalyzeRequest(ctx context.Context, r *http.Request, userID string) (matched bool, threatType string) {
	if r == nil || r.URL == nil || b.client == nil || userID == "" {
		return false, ""
	}

	submatch := idRegex.FindStringSubmatch(r.URL.Path)
	if len(submatch) < 2 {
		return false, ""
	}
	extractedID := submatch[1]

	generalizedPath := idRegex.ReplaceAllString(r.URL.Path, "/*/")
	generalizedPath = strings.TrimSuffix(generalizedPath, "/")

	key := fmt.Sprintf("warden:bola:%s:%s:%s", userID, r.Method, generalizedPath)

	pipe := b.client.Pipeline()
	pipe.SAdd(ctx, key, extractedID)
	pipe.Expire(ctx, key, b.window)
	scard := pipe.SCard(ctx, key)

	_, err := pipe.Exec(ctx)
	if err != nil {
		slog.Error("BOLA engine redis pipeline failure (failing open)",
			slog.String("user_id", userID),
			slog.String("path", r.URL.Path),
			slog.String("error", err.Error()),
		)
		return false, ""
	}

	if scard.Val() > int64(b.threshold) {
		return true, "BOLA_Enumeration"
	}

	return false, ""
}
