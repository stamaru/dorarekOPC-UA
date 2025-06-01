# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository appears to be a setup for an OPC-UA related project. The folder structure follows a monorepo pattern, designed to accommodate multiple services, libraries, and applications. The project seems to be in its initial setup phase, as most files are empty or contain minimal content.

## Project Structure

Based on the README.md, the repository follows this organization:
- `apidocs/` - For API specifications (OpenAPI)
- `apps/` - Contains applications
  - `src/` - Source code for applications
  - `webapps/` - Web applications
- `docs/` - Project documentation
- `iac/` - Infrastructure as Code (SAM or CDK)
- `libs/` - Shared libraries, utilities, and Lambda layers
- `services/` - Microservices or Lambda function groups
- `scripts/` - Build, deploy, and utility scripts

## OPC-UA Overview

OPC UA (Open Platform Communications Unified Architecture) is an industrial communication protocol for interoperability in industrial automation. When working on this project, keep in mind:

1. OPC UA is a platform-independent service-oriented architecture
2. It provides secure communication with encrypted messages and authenticated clients/servers
3. It includes a robust addressing space model with complex data types
4. It typically involves client-server architecture for data exchange

## Development Guidelines

As this project evolves, consider these practices for OPC UA implementations:

1. Security should be a primary consideration, as OPC UA systems often control industrial equipment
2. Follow the OPC UA specification for data modeling and communication patterns
3. Ensure proper error handling for network disruptions and reconnection scenarios
4. Include proper logging for security events and operational diagnostics