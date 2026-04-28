# ─── VPC ──────────────────────────────────────────────────────────────────────
# Lambda and RDS are placed in the same VPC so they communicate privately.
# No NAT gateway — VPC Gateway Endpoints for S3/DynamoDB are free and keep
# traffic on the AWS backbone without egress charges.

data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = { Name = "${local.prefix}-vpc" }
}

# ─── Private subnets (Lambda + RDS) ──────────────────────────────────────────
# Two AZs for RDS multi-AZ subnet group requirement; Lambda scales across them.

resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 1}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = { Name = "${local.prefix}-private-${count.index + 1}" }
}

# ─── Security Groups ──────────────────────────────────────────────────────────

resource "aws_security_group" "lambda" {
  name        = "${local.prefix}-lambda-sg"
  description = "Allows Lambda functions outbound HTTPS (for AWS APIs via VPC endpoints)"
  vpc_id      = aws_vpc.main.id

  egress {
    description = "HTTPS to VPC endpoints and internet (API Gateway)"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "PostgreSQL to RDS Proxy"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    self        = true
  }

  tags = { Name = "${local.prefix}-lambda-sg" }
}

resource "aws_security_group" "rds_proxy" {
  name        = "${local.prefix}-rds-proxy-sg"
  description = "Allows Lambda SG to connect to RDS Proxy"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "PostgreSQL from Lambda"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.lambda.id]
  }

  egress {
    description     = "PostgreSQL to RDS"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.rds.id]
  }

  tags = { Name = "${local.prefix}-rds-proxy-sg" }
}

resource "aws_security_group" "rds" {
  name        = "${local.prefix}-rds-sg"
  description = "Allows RDS Proxy to connect to RDS — no direct public access"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "PostgreSQL from RDS Proxy only"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.rds_proxy.id]
  }

  tags = { Name = "${local.prefix}-rds-sg" }
}

# ─── VPC Endpoints (free Gateway type — avoids NAT gateway costs) ─────────────

resource "aws_vpc_endpoint" "s3" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.${var.aws_region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = [aws_route_table.private.id]

  tags = { Name = "${local.prefix}-s3-endpoint" }
}

resource "aws_vpc_endpoint" "dynamodb" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.${var.aws_region}.dynamodb"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = [aws_route_table.private.id]

  tags = { Name = "${local.prefix}-dynamodb-endpoint" }
}

# ─── Route Table (private subnets — no internet gateway) ─────────────────────

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "${local.prefix}-private-rt" }
}

resource "aws_route_table_association" "private" {
  count          = length(aws_subnet.private)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}
