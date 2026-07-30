package security

import (
	"net/http"
	"regexp"
)

// Rule represents a compiled security detection rule.
type Rule struct {
	Name    string
	Pattern *regexp.Regexp
}

// SignatureEngine holds pre-compiled WAF detection signatures for high-performance request inspection.
type SignatureEngine struct {
	rules []Rule
}

// NewSignatureEngine initializes and pre-compiles baseline WAF signature rules.
func NewSignatureEngine() *SignatureEngine {
	return &SignatureEngine{
		rules: []Rule{
			{
				Name:    "SQLi",
				Pattern: regexp.MustCompile(`(?i)(UNION\s+.*SELECT|SELECT\s+.*FROM|INSERT\s+INTO|UPDATE\s+.*SET|DROP\s+TABLE|'\s*OR\s*'1'='1|--\s*$)`),
			},
			{
				Name:    "NoSQLi",
				Pattern: regexp.MustCompile(`(?i)(\$where|\$ne|\$gt|\$lt|\$regex)`),
			},
			{
				Name:    "CommandInjection",
				Pattern: regexp.MustCompile(`(?i)(;|\||` + "`" + `|\$\(|\b)(/bin/sh|/bin/bash|curl|wget|nc|ping|cat)(\b|\s|$)`),
			},
		},
	}
}

// AnalyzeRequest inspects request Path, Raw Query, and Query Parameters for signature-based threats.
func (se *SignatureEngine) AnalyzeRequest(r *http.Request) (matched bool, threatType string) {
	if r == nil || r.URL == nil {
		return false, ""
	}

	// 1. Inspect URL Path (raw or parsed)
	path := r.URL.Path
	if r.URL.RawPath != "" {
		path = r.URL.RawPath
	}

	for _, rule := range se.rules {
		if rule.Pattern.MatchString(path) {
			return true, rule.Name
		}
	}

	// 2. Inspect Raw Query String
	if r.URL.RawQuery != "" {
		for _, rule := range se.rules {
			if rule.Pattern.MatchString(r.URL.RawQuery) {
				return true, rule.Name
			}
		}
	}

	// 3. Inspect Parsed Query Parameters
	for key, values := range r.URL.Query() {
		for _, rule := range se.rules {
			if rule.Pattern.MatchString(key) {
				return true, rule.Name
			}
		}
		for _, val := range values {
			for _, rule := range se.rules {
				if rule.Pattern.MatchString(val) {
					return true, rule.Name
				}
			}
		}
	}

	return false, ""
}
