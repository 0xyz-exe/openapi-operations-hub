# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

Please do not report security vulnerabilities through public GitHub issues. Instead, submit reports directly to `security@apihub.local` or through GitHub Security Advisories.

Please include:
- Description of the vulnerability.
- Steps or proof-of-concept script to reproduce.
- Potential impact and affected configurations.

We will acknowledge receipt within 48 hours and coordinate remediation.

## SSRF Security Threat Model

OpenAPI Operations Hub performs outbound HTTP requests for:
1. Synthetic health checking and latency measurement.
2. Remote OpenAPI specification URL imports.
3. Interactive "Try It Out" test requests.

To mitigate Server-Side Request Forgery (SSRF) vulnerabilities, our central security guard enforces:
- Scheme whitelist restricted strictly to `http` and `https`.
- Rejection of loopback addresses (`127.0.0.0/8`, `::1`, `localhost`).
- Rejection of RFC 1918 private IPv4 subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).
- Rejection of Link-Local and Cloud Provider Instance Metadata (`169.254.169.254`, `metadata.google.internal`).
- Pre-flight DNS resolution ensuring resolved addresses comply before request initiation.
