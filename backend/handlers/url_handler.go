package handlers

import (
	"database/sql"
	"log"
	"net/http"

	"url-analyzer/models"

	"github.com/gin-gonic/gin"
)

func GetURLsHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		rows, err := db.Query(`
			SELECT id, url, title, html_version, has_login, internal_links, external_links, status, last_crawled, created_at 
			FROM urls 
			ORDER BY id DESC 
			LIMIT 50`)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database query error"})
			return
		}
		defer rows.Close()

		var urls []models.URL

		for rows.Next() {
			var entry models.URL
			var lastCrawled sql.NullTime

			err := rows.Scan(
				&entry.ID,
				&entry.URL,
				&entry.Title,
				&entry.HTMLVersion,
				&entry.HasLogin,
				&entry.InternalLinks,
				&entry.ExternalLinks,
				&entry.Status,
				&lastCrawled,
				&entry.CreatedAt,
			)
			if err != nil {
				log.Println("scan error:", err)
				continue
			}

			if lastCrawled.Valid {
				entry.LastCrawled = &lastCrawled.Time
			}

			urls = append(urls, entry)
		}

		c.JSON(http.StatusOK, urls)
	}
}
