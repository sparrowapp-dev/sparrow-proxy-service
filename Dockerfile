# Use the official Rust image for building the application
FROM rust:1.73 AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy the Cargo.toml and Cargo.lock to cache dependencies
COPY Cargo.toml Cargo.lock ./

# Copy the source code into the container
COPY . .

# Build the Rust application in release mode
RUN cargo build --release

# Use a lightweight image for the runtime
FROM debian:buster-slim

# Set the working directory for the runtime container
WORKDIR /app

# Install dependencies required for glibc and OpenSSL
RUN apt-get update && apt-get install -y \
    build-essential \
    gawk \
    bison \
    python3 \
    curl \
    ca-certificates && \
    apt-get clean

# Download and build glibc 2.34 in a custom directory
RUN curl -O http://ftp.gnu.org/gnu/libc/glibc-2.34.tar.gz && \
    tar -xzf glibc-2.34.tar.gz && \
    cd glibc-2.34 && \
    mkdir build && \
    cd build && \
    ../configure --prefix=/opt/glibc-2.34 && \
    make -j$(nproc) && \
    make install && \
    cd ../../ && \
    rm -rf glibc-2.34 glibc-2.34.tar.gz

# Add the custom glibc path to the library path
ENV LD_LIBRARY_PATH="/opt/glibc-2.34/lib:$LD_LIBRARY_PATH"

# Download and build OpenSSL 3.x
RUN curl -OL https://www.openssl.org/source/openssl-3.0.11.tar.gz && \
    tar -xzf openssl-3.0.11.tar.gz && \
    cd openssl-3.0.11 && \
    ./config --prefix=/usr/local/openssl --openssldir=/usr/local/openssl && \
    make && \
    make install && \
    rm -rf /openssl-3.0.11.tar.gz /openssl-3.0.11

# Add OpenSSL to the library path
ENV LD_LIBRARY_PATH="/usr/local/openssl/lib:$LD_LIBRARY_PATH"

# Create symbolic links for OpenSSL libraries
RUN ln -s /usr/local/openssl/lib/libssl.so.3 /usr/lib/libssl.so.3 && \
    ln -s /usr/local/openssl/lib/libcrypto.so.3 /usr/lib/libcrypto.so.3 && \
    ldconfig

    # Copy the built binary from the builder stage
COPY --from=builder /app/target/release/sparrow-proxy-service .

# Expose the port on which the app will run
EXPOSE 8080

# Run the application
CMD ["./sparrow-proxy-service"]
