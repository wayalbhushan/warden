package main

import (
	"fmt"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func main() {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "warden-dev-secret-key"
	}

	claims := jwt.MapClaims{
		"sub": "test-user-1",
		"iss": "warden-gateway-cli",
		"exp": time.Now().Add(1 * time.Hour).Unix(),
		"iat": time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signedToken, err := token.SignedString([]byte(secret))
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to generate token: %v\n", err)
		os.Exit(1)
	}

	fmt.Print(signedToken)
}
