# Multi-stage Dockerfile for Warden API Security Gateway
FROM golang:1.26-alpine AS builder

WORKDIR /app

# Download dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build minimal static binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /warden ./cmd/warden

# Production runtime stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/
COPY --from=builder /warden /usr/local/bin/warden

EXPOSE 8080

CMD ["warden"]
