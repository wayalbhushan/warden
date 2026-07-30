package proxy

// Proxy handles reverse proxy request routing and traffic forwarding.
type Proxy struct {
	// Target upstream address for proxying requests
	targetURL string
}

// New creates a new Proxy instance.
func New(targetURL string) *Proxy {
	return &Proxy{
		targetURL: targetURL,
	}
}
