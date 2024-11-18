# Sparrow Proxy Service

Sparrow Proxy Service is a lightweight Rust-based proxy server designed to handle API requests with ease, bypassing CORS restrictions and forwarding requests to the desired endpoints. It supports raw responses and is designed to work with Sparrow Web implementation.

## Features

- Proxy server built with Rust for performance and reliability.
- Handles `POST` requests with JSON payloads.
- Returns raw responses as JSON strings.
- Configurable to allow CORS for cross-origin requests.
- Lightweight and deployable on any cloud platform or local environment.

## Requirements

- **Rust** (Ensure you have `rustup` installed)
- Cargo (comes with Rust)
- Optional: Docker (for containerized deployment)

## Setup and Installation

1. **Clone the Repository**:

   ```bash
   git clone https://github.com/your-username/sparrow-proxy-service.git
   cd sparrow-proxy-service
   ```

2. **Run the Server**:
   ```bash
   cargo build
   cargo run
   ```
