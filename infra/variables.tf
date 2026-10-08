variable "aws_region" {
  description = "Primary AWS region"
  type        = string
  default     = "ap-southeast-2"
}

variable "project_name" {
  description = "Short slug used to name all resources"
  type        = string
  default     = "tt"
}

variable "subdomain" {
  description = "Subdomain to deploy the app to"
  type        = string
  default     = "typestar"
}

variable "root_domain" {
  description = "Root domain (must have a hosted zone in Route53)"
  type        = string
  default     = "theclouddevopslearningblog.com"
}

variable "google_client_id" {
  description = "Google OAuth 2.0 client ID for social sign-in"
  type        = string
}

variable "google_client_secret" {
  description = "Google OAuth 2.0 client secret for social sign-in"
  type        = string
  sensitive   = true
}

variable "allowed_origins" {
  description = "CORS origins allowed by API Gateway"
  type        = list(string)
  default = [
    "https://typestar.theclouddevopslearningblog.com",
    "http://localhost:5173",
    "http://localhost:4173",
  ]
}
