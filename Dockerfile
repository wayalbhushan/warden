# Multi-stage Dockerfile for Warden API Security Gateway
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Download dependencies
COPY go.mod ./
RUN go mod download

# Copy source code
COPY . .

# Build minimal static binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /warden ./cmd/warden

# Production runtime stage
FROM alpine:3.19

RUN apk --no-cache add ca-certificates

WORKDIR /root/
COPY --from=builder /warden /usr/local/bin/warden

EXPOSE 8080

ENTRYPOINT ["/usr/local/bin/warden"]
