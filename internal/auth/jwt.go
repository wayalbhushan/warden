package auth

import (
	"fmt"

	"github.com/golang-jwt/jwt/v5"
)

// JWTValidator validates cryptographic signatures and standard claims of JWT tokens.
type JWTValidator struct {
	secretKey []byte
}

// NewJWTValidator creates a new JWTValidator instance configured with a secret key.
func NewJWTValidator(secret string) *JWTValidator {
	return &JWTValidator{
		secretKey: []byte(secret),
	}
}

// ValidateToken parses and validates a JWT token string, returning its claims if valid.
func (v *JWTValidator) ValidateToken(tokenString string) (jwt.MapClaims, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		// Strictly enforce HMAC signing algorithm (prevents alg=none vulnerability)
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return v.secretKey, nil
	})

	if err != nil {
		return nil, fmt.Errorf("invalid token: %w", err)
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token claims")
	}

	return claims, nil
}
