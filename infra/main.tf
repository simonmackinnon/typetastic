terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
  }

  # Partial S3 backend — bucket name is passed via -backend-config in CI
  # and via `terraform init -backend-config=...` locally.
  # Run scripts/bootstrap-state-bucket.sh once before first terraform init.
  backend "s3" {
    key     = "tt/terraform.tfstate"
    region  = "ap-southeast-2"
    encrypt = true
  }
}

provider "aws" {
  region = var.aws_region
}

# CloudFront requires ACM certificates to be in us-east-1
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

locals {
  project   = var.project_name
  subdomain = "${var.subdomain}.${var.root_domain}"
}
