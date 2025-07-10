export interface UrlEntry {
  id: number;
  url: string;
  title: string;
  html_version: string;
  has_login: boolean;
  internal_links: number;
  external_links: number;
  status: string;
  last_crawled?: string;
  created_at: string;
}
