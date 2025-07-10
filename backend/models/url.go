package models

import "time"

type URL struct {
	ID            uint       `json:"id"`
	URL           string     `json:"url"`
	Title         string     `json:"title"`
	HTMLVersion   string     `json:"html_version"`
	HasLogin      bool       `json:"has_login"`
	InternalLinks int        `json:"internal_links"`
	ExternalLinks int        `json:"external_links"`
	Status        string     `json:"status"`
	LastCrawled   *time.Time `json:"last_crawled"`
	CreatedAt     time.Time  `json:"created_at"`
}
