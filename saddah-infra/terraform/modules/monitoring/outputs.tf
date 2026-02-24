output "fluent_bit_role_arn" {
  description = "IAM role ARN for Fluent Bit"
  value       = aws_iam_role.fluent_bit.arn
}

output "cloudwatch_agent_role_arn" {
  description = "IAM role ARN for CloudWatch Agent"
  value       = aws_iam_role.cloudwatch_agent.arn
}

output "log_group_application" {
  description = "CloudWatch Log Group for application logs"
  value       = aws_cloudwatch_log_group.application.name
}

output "log_group_host" {
  description = "CloudWatch Log Group for host logs"
  value       = aws_cloudwatch_log_group.host.name
}

output "dashboard_name" {
  description = "Name of the CloudWatch dashboard"
  value       = aws_cloudwatch_dashboard.main.dashboard_name
}

output "sns_topic_arn" {
  description = "ARN of the SNS topic for alarms"
  value       = aws_sns_topic.alarms.arn
}
