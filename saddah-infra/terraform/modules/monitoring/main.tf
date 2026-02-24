# CloudWatch Monitoring Module for SADDAH
# Includes: Fluent Bit, Container Insights, Dashboards, Alarms

locals {
  fluent_bit_namespace = "amazon-cloudwatch"
  log_group_prefix     = "/aws/containerinsights/${var.cluster_name}"
}

# -----------------------------------------------------------------------------
# CloudWatch Log Groups
# -----------------------------------------------------------------------------

resource "aws_cloudwatch_log_group" "application" {
  name              = "${local.log_group_prefix}/application"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

resource "aws_cloudwatch_log_group" "host" {
  name              = "${local.log_group_prefix}/host"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

resource "aws_cloudwatch_log_group" "dataplane" {
  name              = "${local.log_group_prefix}/dataplane"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

resource "aws_cloudwatch_log_group" "performance" {
  name              = "${local.log_group_prefix}/performance"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

# -----------------------------------------------------------------------------
# IAM Role for Fluent Bit
# -----------------------------------------------------------------------------

resource "aws_iam_role" "fluent_bit" {
  name = "${var.cluster_name}-fluent-bit"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRoleWithWebIdentity"
        Effect = "Allow"
        Principal = {
          Federated = var.oidc_provider_arn
        }
        Condition = {
          StringEquals = {
            "${replace(var.oidc_provider_arn, "/^arn:aws:iam::\\d+:oidc-provider\\//", "")}:sub" = "system:serviceaccount:${local.fluent_bit_namespace}:fluent-bit"
          }
        }
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy" "fluent_bit" {
  name = "fluent-bit-cloudwatch"
  role = aws_iam_role.fluent_bit.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData",
          "logs:CreateLogStream",
          "logs:CreateLogGroup",
          "logs:DescribeLogStreams",
          "logs:PutLogEvents",
          "logs:PutRetentionPolicy"
        ]
        Resource = "*"
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# IAM Role for CloudWatch Container Insights
# -----------------------------------------------------------------------------

resource "aws_iam_role" "cloudwatch_agent" {
  name = "${var.cluster_name}-cloudwatch-agent"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRoleWithWebIdentity"
        Effect = "Allow"
        Principal = {
          Federated = var.oidc_provider_arn
        }
        Condition = {
          StringEquals = {
            "${replace(var.oidc_provider_arn, "/^arn:aws:iam::\\d+:oidc-provider\\//", "")}:sub" = "system:serviceaccount:${local.fluent_bit_namespace}:cloudwatch-agent"
          }
        }
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "cloudwatch_agent" {
  role       = aws_iam_role.cloudwatch_agent.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

# -----------------------------------------------------------------------------
# CloudWatch Dashboard
# -----------------------------------------------------------------------------

resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.cluster_name}-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      # Row 1: API Metrics
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 8
        height = 6
        properties = {
          title  = "API - CPU Utilization"
          region = var.region
          metrics = [
            ["ContainerInsights", "pod_cpu_utilization", "ClusterName", var.cluster_name, "Namespace", var.namespace, "PodName", "saddah-api", { stat = "Average" }]
          ]
          period = 300
          yAxis = {
            left = { min = 0, max = 100 }
          }
        }
      },
      {
        type   = "metric"
        x      = 8
        y      = 0
        width  = 8
        height = 6
        properties = {
          title  = "API - Memory Utilization"
          region = var.region
          metrics = [
            ["ContainerInsights", "pod_memory_utilization", "ClusterName", var.cluster_name, "Namespace", var.namespace, "PodName", "saddah-api", { stat = "Average" }]
          ]
          period = 300
          yAxis = {
            left = { min = 0, max = 100 }
          }
        }
      },
      {
        type   = "metric"
        x      = 16
        y      = 0
        width  = 8
        height = 6
        properties = {
          title  = "API - Network I/O"
          region = var.region
          metrics = [
            ["ContainerInsights", "pod_network_rx_bytes", "ClusterName", var.cluster_name, "Namespace", var.namespace, "PodName", "saddah-api", { stat = "Sum", label = "Received" }],
            ["ContainerInsights", "pod_network_tx_bytes", "ClusterName", var.cluster_name, "Namespace", var.namespace, "PodName", "saddah-api", { stat = "Sum", label = "Transmitted" }]
          ]
          period = 300
        }
      },
      # Row 2: Web Metrics
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 8
        height = 6
        properties = {
          title  = "Web - CPU Utilization"
          region = var.region
          metrics = [
            ["ContainerInsights", "pod_cpu_utilization", "ClusterName", var.cluster_name, "Namespace", var.namespace, "PodName", "saddah-web", { stat = "Average" }]
          ]
          period = 300
          yAxis = {
            left = { min = 0, max = 100 }
          }
        }
      },
      {
        type   = "metric"
        x      = 8
        y      = 6
        width  = 8
        height = 6
        properties = {
          title  = "Web - Memory Utilization"
          region = var.region
          metrics = [
            ["ContainerInsights", "pod_memory_utilization", "ClusterName", var.cluster_name, "Namespace", var.namespace, "PodName", "saddah-web", { stat = "Average" }]
          ]
          period = 300
          yAxis = {
            left = { min = 0, max = 100 }
          }
        }
      },
      {
        type   = "metric"
        x      = 16
        y      = 6
        width  = 8
        height = 6
        properties = {
          title  = "Pod Count"
          region = var.region
          metrics = [
            ["ContainerInsights", "pod_number_of_running_pods", "ClusterName", var.cluster_name, "Namespace", var.namespace, { stat = "Average" }]
          ]
          period = 300
        }
      },
      # Row 3: Cluster Metrics
      {
        type   = "metric"
        x      = 0
        y      = 12
        width  = 12
        height = 6
        properties = {
          title  = "Cluster - Node CPU Reserved"
          region = var.region
          metrics = [
            ["ContainerInsights", "node_cpu_reserved_capacity", "ClusterName", var.cluster_name, { stat = "Average" }]
          ]
          period = 300
          yAxis = {
            left = { min = 0, max = 100 }
          }
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 12
        width  = 12
        height = 6
        properties = {
          title  = "Cluster - Node Memory Reserved"
          region = var.region
          metrics = [
            ["ContainerInsights", "node_memory_reserved_capacity", "ClusterName", var.cluster_name, { stat = "Average" }]
          ]
          period = 300
          yAxis = {
            left = { min = 0, max = 100 }
          }
        }
      },
      # Row 4: Logs
      {
        type   = "log"
        x      = 0
        y      = 18
        width  = 24
        height = 6
        properties = {
          title  = "Recent Application Logs"
          region = var.region
          query  = "SOURCE '${local.log_group_prefix}/application' | fields @timestamp, @message | sort @timestamp desc | limit 100"
        }
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# CloudWatch Alarms
# -----------------------------------------------------------------------------

# SNS Topic for Alarms
resource "aws_sns_topic" "alarms" {
  name = "${var.cluster_name}-alarms"
  tags = var.tags
}

# API High CPU Alarm
resource "aws_cloudwatch_metric_alarm" "api_high_cpu" {
  alarm_name          = "${var.cluster_name}-api-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "pod_cpu_utilization"
  namespace           = "ContainerInsights"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "API CPU utilization is above 80%"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  ok_actions          = [aws_sns_topic.alarms.arn]

  dimensions = {
    ClusterName = var.cluster_name
    Namespace   = var.namespace
    PodName     = "saddah-api"
  }

  tags = var.tags
}

# API High Memory Alarm
resource "aws_cloudwatch_metric_alarm" "api_high_memory" {
  alarm_name          = "${var.cluster_name}-api-high-memory"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "pod_memory_utilization"
  namespace           = "ContainerInsights"
  period              = 300
  statistic           = "Average"
  threshold           = 85
  alarm_description   = "API Memory utilization is above 85%"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  ok_actions          = [aws_sns_topic.alarms.arn]

  dimensions = {
    ClusterName = var.cluster_name
    Namespace   = var.namespace
    PodName     = "saddah-api"
  }

  tags = var.tags
}

# Pod Restart Alarm
resource "aws_cloudwatch_metric_alarm" "pod_restarts" {
  alarm_name          = "${var.cluster_name}-pod-restarts"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "pod_number_of_container_restarts"
  namespace           = "ContainerInsights"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "High number of pod restarts detected"
  alarm_actions       = [aws_sns_topic.alarms.arn]

  dimensions = {
    ClusterName = var.cluster_name
    Namespace   = var.namespace
  }

  tags = var.tags
}

# Node High CPU Alarm
resource "aws_cloudwatch_metric_alarm" "node_high_cpu" {
  alarm_name          = "${var.cluster_name}-node-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "node_cpu_utilization"
  namespace           = "ContainerInsights"
  period              = 300
  statistic           = "Average"
  threshold           = 85
  alarm_description   = "Node CPU utilization is above 85%"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  ok_actions          = [aws_sns_topic.alarms.arn]

  dimensions = {
    ClusterName = var.cluster_name
  }

  tags = var.tags
}

# Node High Memory Alarm
resource "aws_cloudwatch_metric_alarm" "node_high_memory" {
  alarm_name          = "${var.cluster_name}-node-high-memory"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "node_memory_utilization"
  namespace           = "ContainerInsights"
  period              = 300
  statistic           = "Average"
  threshold           = 85
  alarm_description   = "Node Memory utilization is above 85%"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  ok_actions          = [aws_sns_topic.alarms.arn]

  dimensions = {
    ClusterName = var.cluster_name
  }

  tags = var.tags
}
