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
  default     = "typetastic"
}

variable "root_domain" {
  description = "Root domain (must have a hosted zone in Route53)"
  type        = string
  default     = "theclouddevopslearningblog.com"
}

variable "allowed_origins" {
  description = "CORS origins allowed by API Gateway"
  type        = list(string)
  default     = [
    "https://typetastic.theclouddevopslearningblog.com",
    "http://localhost:5173",
    "http://localhost:4173",
  ]
}
