# ── User Pool ─────────────────────────────────────────────────────────────────

resource "aws_cognito_user_pool" "main" {
  name = "${local.project}-users"

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_uppercase = true
    require_numbers   = true
    require_symbols   = false
  }

  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_subject        = "Your TypeStar verification code"
    email_message        = "Your TypeStar verification code is {####} — happy typing! 🚀"
  }

  schema {
    name                = "email"
    attribute_data_type = "String"
    required            = true
    mutable             = true
    string_attribute_constraints {
      min_length = 3
      max_length = 320
    }
  }

  tags = { Project = local.project }
}

# ── Cognito Domain (required for OAuth hosted UI and IdP callbacks) ───────────

resource "aws_cognito_user_pool_domain" "main" {
  domain       = "typestar-auth"   # globally unique prefix → typestar-auth.auth.<region>.amazoncognito.com
  user_pool_id = aws_cognito_user_pool.main.id
}

# ── Google Identity Provider ──────────────────────────────────────────────────

resource "aws_cognito_identity_provider" "google" {
  user_pool_id  = aws_cognito_user_pool.main.id
  provider_name = "Google"
  provider_type = "Google"

  provider_details = {
    client_id        = var.google_client_id
    client_secret    = var.google_client_secret
    authorize_scopes = "email profile openid"
  }

  attribute_mapping = {
    email    = "email"
    username = "sub"
  }
}

# ── App Client (browser SPA — no secret) ─────────────────────────────────────

resource "aws_cognito_user_pool_client" "spa" {
  name         = "${local.project}-spa"
  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret = false

  # SRP flows kept for email/password login
  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]

  # OAuth Authorization Code + PKCE for Google sign-in
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["email", "openid", "profile"]

  callback_urls = [
    "https://${local.subdomain}/callback",
    "http://localhost:5173/callback",
    "http://localhost:4173/callback",
  ]

  logout_urls = [
    "https://${local.subdomain}",
    "http://localhost:5173",
    "http://localhost:4173",
  ]

  supported_identity_providers = ["COGNITO", "Google"]

  access_token_validity  = 1   # hours
  id_token_validity      = 1   # hours
  refresh_token_validity = 30  # days

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }

  depends_on = [aws_cognito_identity_provider.google]
}
