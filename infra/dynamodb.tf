resource "aws_dynamodb_table" "user_data" {
  name         = "${local.project}-user-data"
  billing_mode = "PAY_PER_REQUEST"

  hash_key  = "userId"  # Cognito sub
  range_key = "dataKey" # "profile" | "level#01" | "badge#first-keystroke"

  attribute {
    name = "userId"
    type = "S"
  }
  attribute {
    name = "dataKey"
    type = "S"
  }

  deletion_protection_enabled = true

  tags = { Project = local.project }
}
