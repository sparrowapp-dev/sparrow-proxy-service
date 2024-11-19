#![windows_subsystem = "windows"]

// Submodules
mod raw_handler;
mod request_handler;
mod utils;

// Imports
use raw_handler::make_text_request;
use request_handler::formdata_handler_v2::make_formdata_request_v2;
use request_handler::http_requests::make_without_body_request;
use request_handler::json_handler_v2::make_json_request_v2;
use request_handler::urlencoded_handler_v2::make_www_form_urlencoded_request_v2;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use utils::response_decoder::decode_response_body;
use warp::http::Response;
use warp::Filter;

// Define the key value structure
#[derive(Debug, Deserialize, Serialize)]
struct KeyValue {
    key: String,
    value: String,
    checked: Option<bool>,
}

// Define the request body structure
#[derive(Deserialize)]
struct HttpRequest {
    url: String,
    method: String,
    headers: String,
    body: String,
    request: String,
}

async fn make_request_v2(
    url: &str,
    method: &str,
    headers: &str,
    body: &str,
    request: &str,
) -> Result<String, std::io::Error> {
    // Create a client
    let client = Client::new();

    // Convert method string to reqwest::Method
    let reqwest_method = match method {
        "GET" => reqwest::Method::GET,
        "POST" => reqwest::Method::POST,
        "PUT" => reqwest::Method::PUT,
        "DELETE" => reqwest::Method::DELETE,
        "PATCH" => reqwest::Method::PATCH,
        // Add other HTTP methods as needed
        _ => reqwest::Method::GET,
    };

    // Deserialize the JSON string into a Vec<KeyValue>
    let headers_key_values: Vec<KeyValue> = serde_json::from_str(headers).unwrap();

    // Create a HashMap to store key-value pairs
    let mut headers_key_value_map: HashMap<String, String> = HashMap::new();

    // Iterate over key_values and add key-value pairs to the map
    for kv in headers_key_values {
        headers_key_value_map.insert(kv.key, kv.value);
    }

    // Create request builder with request method and url
    let mut request_builder = client.request(reqwest_method, url);

    // Add all headers in request builder
    for (key, value) in headers_key_value_map.iter() {
        request_builder = request_builder.header(key, value);
    }

    // Make request call as per Body type
    let check = match request {
        "application/json" => make_json_request_v2(request_builder, body).await,
        "application/x-www-form-urlencoded" => {
            make_www_form_urlencoded_request_v2(request_builder, body).await
        }
        "multipart/form-data" => make_formdata_request_v2(request_builder, body).await,
        "text/plain" => make_text_request(request_builder, body).await,
        _ => make_without_body_request(request_builder).await,
    };

    // check response is successful or not
    let response_value = match check {
        Ok(value) => value,
        Err(err) => {
            // converting `reqwest::Error` to `std::io::Error
            return Err(err);
        }
    };

    // Extract headers from response
    let response_headers = response_value.headers().clone();

    // Extract status code from response
    let response_status = response_value.status().clone();

    // Extract response value from response
    let response_text_result = decode_response_body(response_value).await;

    // Map headers into json
    let response_headers_json: serde_json::Value = response_headers
        .iter()
        .map(|(name, value)| (name.to_string(), value.to_str().unwrap()))
        .collect();

    let response_text = match response_text_result {
        Ok(value) => value,
        Err(err) => format!("Error: {}", err),
    };

    // Combining all the parameters
    let combined_json = json!({
        "headers": response_headers_json,
        "status": response_status.to_string(),
        "body": response_text,
    });

    return Ok(combined_json.to_string());
}

async fn make_http_request_v2(
    url: &str,
    method: &str,
    headers: &str,
    body: &str,
    request: &str,
) -> Result<String, String> {
    let result = make_request_v2(url, method, headers, body, request).await;

    // Convert the result to a string for response formatting
    let result_value = match result {
        Ok(value) => value.to_string(), // Convert successful result to string
        Err(err) => err.to_string(),    // Convert error to string
    };

    // Create a JSON response with the result and tab ID
    let response = json!({
        "body": result_value,
    });

    return match serde_json::to_string(&response) {
        Ok(value) => Ok(value.to_string()),
        Err(err) => Err(err.to_string()),
    };
}

#[tokio::main]
async fn main() {
    // Define CORS settings
    let cors = warp::cors()
        .allow_any_origin()
        .allow_methods(vec!["OPTIONS", "GET", "POST", "DELETE", "PUT", "PATCH"])
        .allow_headers(vec![
            "Accept",
            "Content-Type",
            "User-Agent",
            "Sec-Fetch-Mode",
            "Sec-Fetch-Dest",
            "Sec-Fetch-Site",
            "Referer",
            "Origin",
            "Access-Control-Request-Method",
            "Access-Control-Request-Headers",
        ]);

    // Define the POST route
    let post_route = warp::path("api")
        .and(warp::post())
        .and(warp::body::json())
        .and_then(handle_request)
        .with(cors);

    // Define the GET route for server health check
    let get_route = warp::path("health")
        .and(warp::get())
        .map(|| warp::reply::json(&json!({ "message": "Server is up" })));

    // Combine routes
    let routes = post_route.or(get_route);

    // Start the server
    warp::serve(routes).run(([0, 0, 0, 0], 8080)).await;
}

async fn handle_request(req: HttpRequest) -> Result<impl warp::Reply, warp::Rejection> {
    // Call the make_http_request_v2 function
    match make_http_request_v2(&req.url, &req.method, &req.headers, &req.body, &req.request).await {
        Ok(raw_response) => {
            // Return the raw response directly
            let wrapped_response = format!("{}", serde_json::to_string(&raw_response).unwrap());
            Ok(Response::builder()
                .status(200)
                .header("Content-Type", "application/json")
                .body(wrapped_response)
                .unwrap())
        }
        Err(error) => {
            let wrapped_error = format!("{}", error);
            // Return the error as the raw response
            Ok(Response::builder()
                .status(500)
                .header("Content-Type", "text/plain")
                .body(wrapped_error)
                .unwrap())
        }
    }
}
