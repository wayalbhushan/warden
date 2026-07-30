package auth_test

import (
	"testing"
	"time"

	"github.com/bhushanwayal/warden/internal/auth"
	"github.com/golang-jwt/jwt/v5"
)

func TestJWTValidator(t *testing.T) {
	secret := "test-secret-key"
	validator := auth.NewJWTValidator(secret)

	// 1. Valid Token (Future exp)
	validClaims := jwt.MapClaims{
		"sub":  "user123",
		"role": "admin",
		"exp":  time.Now().Add(1 * time.Hour).Unix(),
	}
	validToken := jwt.NewWithClaims(jwt.SigningMethodHS256, validClaims)
	validTokenStr, err := validToken.SignedString([]byte(secret))
	if err != nil {
		t.Fatalf("failed to sign valid token: %v", err)
	}

	claims, err := validator.ValidateToken(validTokenStr)
	if err != nil {
		t.Errorf("expected valid token to pass validation, got error: %v", err)
	}
	if claims["sub"] != "user123" {
		t.Errorf("expected sub 'user123', got %v", claims["sub"])
	}

	// 2. Forged Token (Signed with wrong secret)
	forgedToken := jwt.NewWithClaims(jwt.SigningMethodHS256, validClaims)
	forgedTokenStr, err := forgedToken.SignedString([]byte("wrong-secret-key"))
	if err != nil {
		t.Fatalf("failed to sign forged token: %v", err)
	}

	_, err = validator.ValidateToken(forgedTokenStr)
	if err == nil {
		t.Errorf("expected error for forged token signed with wrong secret")
	}

	// 3. Expired Token (Past exp)
	expiredClaims := jwt.MapClaims{
		"sub": "user123",
		"exp": time.Now().Add(-1 * time.Hour).Unix(),
	}
	expiredToken := jwt.NewWithClaims(jwt.SigningMethodHS256, expiredClaims)
	expiredTokenStr, err := expiredToken.SignedString([]byte(secret))
	if err != nil {
		t.Fatalf("failed to sign expired token: %v", err)
	}

	_, err = validator.ValidateToken(expiredTokenStr)
	if err == nil {
		t.Errorf("expected error for expired token")
	}
}
