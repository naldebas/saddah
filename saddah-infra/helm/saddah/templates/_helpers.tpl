{{/*
Expand the name of the chart.
*/}}
{{- define "saddah.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "saddah.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "saddah.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "saddah.labels" -}}
helm.sh/chart: {{ include "saddah.chart" . }}
{{ include "saddah.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: saddah
environment: {{ .Values.global.environment }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "saddah.selectorLabels" -}}
app.kubernetes.io/name: {{ include "saddah.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
API labels
*/}}
{{- define "saddah.api.labels" -}}
{{ include "saddah.labels" . }}
app: {{ .Values.api.name }}
component: backend
{{- end }}

{{/*
API selector labels
*/}}
{{- define "saddah.api.selectorLabels" -}}
app: {{ .Values.api.name }}
{{- end }}

{{/*
Web labels
*/}}
{{- define "saddah.web.labels" -}}
{{ include "saddah.labels" . }}
app: {{ .Values.web.name }}
component: frontend
{{- end }}

{{/*
Web selector labels
*/}}
{{- define "saddah.web.selectorLabels" -}}
app: {{ .Values.web.name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "saddah.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "saddah.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Return the proper image name
*/}}
{{- define "saddah.image" -}}
{{- $registryName := .Values.global.imageRegistry -}}
{{- $repositoryName := .image.repository -}}
{{- $tag := .image.tag | default "latest" -}}
{{- if $registryName }}
{{- printf "%s/%s:%s" $registryName $repositoryName $tag -}}
{{- else }}
{{- printf "%s:%s" $repositoryName $tag -}}
{{- end }}
{{- end }}

{{/*
Namespace
*/}}
{{- define "saddah.namespace" -}}
{{- .Values.namespace.name | default "saddah" }}
{{- end }}
