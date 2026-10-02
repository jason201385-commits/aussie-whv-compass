export interface NewsSource {
  id: string;
  name: string;
  feedUrl: string;
  publicPageUrl: string;
  termsUrl: string;
  allowedArticleHosts: readonly string[];
  jurisdiction: "AU" | "VIC";
  relevancePattern: RegExp;
}

export const NEWS_SOURCES: readonly NewsSource[] = [
  {
    id: "scamwatch",
    name: "Scamwatch",
    feedUrl: "https://www.scamwatch.gov.au/rss/news-feed.xml",
    publicPageUrl: "https://www.scamwatch.gov.au/about-us/news-and-alerts/browse-news-and-alerts",
    termsUrl: "https://www.scamwatch.gov.au/about-us/copyright",
    allowedArticleHosts: ["www.scamwatch.gov.au", "scamwatch.gov.au"],
    jurisdiction: "AU",
    relevancePattern: /\b(job|recruit|employment|rental|rent|accommodation|identity|mygov|ato|tax|visa|immigration|payment|purchase|delivery|mobile fraud|phishing|bank|online shopping)\b/i,
  },
  {
    id: "jobs-skills-au",
    name: "Jobs and Skills Australia",
    feedUrl: "https://www.jobsandskills.gov.au/news_rss",
    publicPageUrl: "https://www.jobsandskills.gov.au/news",
    termsUrl: "https://www.jobsandskills.gov.au/copyright",
    allowedArticleHosts: ["www.jobsandskills.gov.au", "jobsandskills.gov.au"],
    jurisdiction: "AU",
    relevancePattern: /\b(job|employment|labour|recruit|migrant|migration|regional|vacanc|occupation|hospitality|agricultur|workforce|skill shortage|worker|seasonal)\w*/i,
  },
  {
    id: "health-au",
    name: "Australian Department of Health",
    feedUrl: "https://www.health.gov.au/news/rss.xml",
    publicPageUrl: "https://www.health.gov.au/news",
    termsUrl: "https://www.health.gov.au/using-our-websites/copyright",
    allowedArticleHosts: ["www.health.gov.au", "health.gov.au"],
    jurisdiction: "AU",
    relevancePattern: /\b(alert|outbreak|travel|heat|medicine|medication|vaccin|mental health|infectious|disease|food safety|emergency|public health)\w*/i,
  },
  {
    id: "consumer-vic",
    name: "Consumer Affairs Victoria",
    feedUrl: "https://www.consumer.vic.gov.au/RSS.aspx?RssType=newsalerts",
    publicPageUrl: "https://www.consumer.vic.gov.au/latest-news",
    termsUrl: "https://www.consumer.vic.gov.au/copyright",
    allowedArticleHosts: ["www.consumer.vic.gov.au", "consumer.vic.gov.au"],
    jurisdiction: "VIC",
    relevancePattern: /\b(rent|rental|tenan|bond|estate agent|vehicle|used car|scam|consumer|trader|online|gas|electrical|product safety)\w*/i,
  },
] as const;
