package main

import (
	"database/sql"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"

	"url-analyzer/handlers"

	"golang.org/x/net/html/charset"

	"github.com/gin-gonic/gin"
	_ "github.com/go-sql-driver/mysql"
	"golang.org/x/net/html"
)

var db *sql.DB

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

func main() {
	dsn := "root:password@tcp(127.0.0.1:3306)/crawler?charset=utf8mb4&parseTime=true"
	var err error
	db, err = sql.Open("mysql", dsn)
	if err != nil {
		log.Fatal(err)
	}
	if err = db.Ping(); err != nil {
		log.Fatal(err)
	}

	r := gin.Default()
	r.Use(corsMiddleware())
	r.Use(authMiddleware())

	r.POST("/crawl", handleCrawl)
	r.GET("/urls", handlers.GetURLsHandler(db))
	r.GET("/urls/:id", handleUrlDetail)

	r.Run(":8081")
}

func authMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := c.GetHeader("Authorization")
		if token != "Bearer your-secret-token" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			return
		}
		c.Next()
	}
}

func handleCrawl(c *gin.Context) {
	type Req struct {
		Url string `json:"url" binding:"required,url"`
	}
	var req Req
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	parsed, err := url.Parse(req.Url)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid URL"})
		return
	}

	go processCrawl(req.Url)
	c.JSON(http.StatusAccepted, gin.H{"message": "Crawling started", "url": req.Url})
}

func processCrawl(target string) {
	// Step 1: Insert initial row with status 'queued'
	res, err := db.Exec(`
		INSERT INTO urls (
			url, title, html_version, has_login, internal_links, external_links, status, created_at
		) VALUES (?, '', '', false, 0, 0, 'queued', NOW())`, target)
	if err != nil {
		log.Println("error queuing URL:", err)
		return
	}
	urlID, _ := res.LastInsertId()

	// Step 2: Update status to 'running'
	_, err = db.Exec(`UPDATE urls SET status = 'running' WHERE id = ?`, urlID)
	if err != nil {
		log.Println("error updating status to running:", err)
		return
	}

	// Step 3: HTTP GET the URL
	resp, err := http.Get(target)
	if err != nil || resp.StatusCode >= 400 {
		log.Println("HTTP error:", err)
		_, _ = db.Exec(`UPDATE urls SET status = 'error', last_crawled = NOW() WHERE id = ?`, urlID)
		return
	}
	defer resp.Body.Close()

	// Step 4: Decode body to UTF-8
	contentType := resp.Header.Get("Content-Type")
	decodedReader, err := charset.NewReader(resp.Body, contentType)
	if err != nil {
		log.Println("charset decode error:", err)
		_, _ = db.Exec(`UPDATE urls SET status = 'error', last_crawled = NOW() WHERE id = ?`, urlID)
		return
	}

	bodyBytes, err := io.ReadAll(decodedReader)
	if err != nil {
		log.Println("error reading body:", err)
		_, _ = db.Exec(`UPDATE urls SET status = 'error', last_crawled = NOW() WHERE id = ?`, urlID)
		return
	}

	// Step 5: Analyze HTML
	htmlContent := string(bodyBytes)
	version := detectHTMLVersion(htmlContent)

	title, headings, internalLinks, externalLinks, broken, hasLogin := analyzeHTML(bodyBytes, target)

	if len(title) > 255 {
		title = title[:255]
	}

	// Step 6: Update record with parsed data
	_, err = db.Exec(`
		UPDATE urls
		SET title = ?, html_version = ?, has_login = ?, 
		    internal_links = ?, external_links = ?, 
		    status = 'done', last_crawled = NOW()
		WHERE id = ?`,
		title, version, hasLogin, internalLinks, externalLinks, urlID)
	if err != nil {
		log.Println("error updating parsed results:", err)
		return
	}

	// Step 7: Save headings
	for level, count := range headings {
		_, err := db.Exec(`INSERT INTO headings (url_id, level, count) VALUES (?, ?, ?)`, urlID, level, count)
		if err != nil {
			log.Println("error inserting heading:", err)
		}
	}

	// Step 8: Save broken links
	for _, b := range broken {
		_, err := db.Exec(`INSERT INTO broken_links (url_id, link, status) VALUES (?, ?, ?)`, urlID, b.Link, b.Status)
		if err != nil {
			log.Println("error inserting broken link:", err)
		}
	}

	log.Printf("Crawl completed: ID=%d | URL=%s | Status=done\n", urlID, target)
}

func detectHTMLVersion(htmlContent string) string {
	if strings.Contains(htmlContent, "<!DOCTYPE html>") {
		return "HTML5"
	} else if strings.Contains(htmlContent, "HTML 4.01") {
		return "HTML 4.01"
	}
	return "Unknown"
}

type BrokenLink struct {
	Link   string
	Status int
}

func analyzeHTML(htmlContent []byte, base string) (
	title string,
	headings map[string]int,
	internal, external int,
	broken []BrokenLink,
	hasLogin bool,
) {
	headings = make(map[string]int)
	baseURL, _ := url.Parse(base)

	z := html.NewTokenizer(strings.NewReader(string(htmlContent)))

	for {
		t := z.Next()
		if t == html.ErrorToken {
			break
		}

		tagName, hasAttr := z.TagName()
		name := string(tagName)

		if t == html.StartTagToken {
			switch name {
			case "title":
				if z.Next() == html.TextToken {
					title = string(z.Text())
				}

			case "form":
				for hasAttr {
					key, val, more := z.TagAttr()
					if string(key) == "action" && strings.Contains(strings.ToLower(string(val)), "login") {
						hasLogin = true
					}
					hasAttr = more
				}

			case "a":
				var link string
				for hasAttr {
					key, val, more := z.TagAttr()
					if string(key) == "href" {
						link = string(val)
					}
					hasAttr = more
				}

				parsedLink, err := url.Parse(link)
				if err != nil {
					continue
				}
				resolved := baseURL.ResolveReference(parsedLink)
				if resolved.Host == baseURL.Host {
					internal++
				} else {
					external++
				}

				status := checkLink(resolved.String())
				if status >= 400 {
					broken = append(broken, BrokenLink{Link: resolved.String(), Status: status})
				}

			case "h1", "h2", "h3", "h4", "h5", "h6":
				headings[name]++
			}
		}
	}

	return
}

func checkLink(link string) int {
	if !strings.HasPrefix(link, "http") {
		return 200
	}
	client := http.Client{Timeout: 5 * time.Second}
	resp, err := client.Head(link)
	if err != nil {
		return 500
	}
	defer resp.Body.Close()
	return resp.StatusCode
}

func handleUrlDetail(c *gin.Context) {
	id := c.Param("id")
	rows, err := db.Query(`SELECT level, count FROM headings WHERE url_id = ?`, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	headings := make(map[string]int)
	for rows.Next() {
		var level string
		var count int
		rows.Scan(&level, &count)
		headings[level] = count
	}

	bl, _ := db.Query(`SELECT link, status FROM broken_links WHERE url_id = ?`, id)
	var broken []BrokenLink
	for bl.Next() {
		var l string
		var s int
		bl.Scan(&l, &s)
		broken = append(broken, BrokenLink{Link: l, Status: s})
	}

	c.JSON(http.StatusOK, gin.H{
		"headings":     headings,
		"broken_links": broken,
	})
}
