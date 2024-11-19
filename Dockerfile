# Stage 1: Builder
FROM rust:bookworm AS builder

# Set the working directory
WORKDIR /usr/src/app

# Copy the Cargo manifest and lock files
COPY Cargo.toml Cargo.lock ./

# Copy the application source code
COPY . .

# Build the application in release mode
RUN cargo build --release

# Stage 2: Runtime
FROM debian:bookworm-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    libssl-dev && \
    apt-get clean

# Set the working directory
WORKDIR /usr/src/app

# Copy the built binary
COPY --from=builder /usr/src/app/target/release/sparrow-proxy-service .

# Expose the application port
EXPOSE 8080

# Run the application
CMD ["./sparrow-proxy-service"]