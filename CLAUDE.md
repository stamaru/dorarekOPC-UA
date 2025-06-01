# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository is structured for an OPC-UA (Open Platform Communications Unified Architecture) project. It follows a monorepo pattern designed to accommodate multiple services, libraries, and applications. The project appears to be in its initial setup phase.

## Project Architecture

This repository is organized in a microservices architecture pattern with a focus on OPC-UA implementation:

1. **Core OPC-UA Services**: Will likely be developed under the `services/` directory, implementing server and client components for industrial automation communication.

2. **Frontend Applications**: Located in `apps/` directory, including both source code (`src/`) and web applications (`webapps/`).

3. **Reusable Libraries**: Common OPC-UA functionality, data models, and utilities will be placed in the `libs/` directory.

4. **Infrastructure**: Cloud resources and deployment templates will be defined in the `iac/` directory, likely using AWS SAM or CDK.

## OPC-UA Technical Considerations

When working with this codebase, consider these OPC-UA specific concepts:

1. **Information Modeling**: OPC-UA defines a rich object model with types, instances, references, and methods. Ensure proper implementation of OPC-UA object models.

2. **Address Space**: The address space is the collection of information that an OPC-UA server makes available to clients. Data modeling should follow OPC-UA specifications.

3. **Security Model**: OPC-UA has a comprehensive security model including authentication, authorization, and encryption. Implement all security features according to spec.

4. **Communication Patterns**: Support for various messaging patterns like publish/subscribe and client/server.

5. **Discovery Services**: Methods for clients to find available servers and their capabilities.

## Technical Stack

Based on the repository structure, this project is likely built with:

- **JavaScript/Node.js**: For application development
- **AWS Cloud Services**: For hosting and infrastructure
- **Node-OPC-UA or similar library**: For OPC-UA protocol implementation

## Development Workflow

As this project develops, the following workflow will likely be established:

1. **Library Development**: Create OPC-UA abstraction layers and utilities in the `libs/` directory
2. **Service Implementation**: Build microservices for specific industrial automation needs
3. **Application Development**: Create frontend applications to visualize and control OPC-UA data
4. **Infrastructure Deployment**: Deploy services using IaC templates

## Related Documentation

For OPC-UA development, consult:

1. OPC Foundation specifications (https://opcfoundation.org/developer-tools/specifications-unified-architecture)
2. Node-OPC-UA documentation (if used)
3. AWS documentation for cloud service integration (if AWS is the cloud provider)