export enum RequestDataTypeEnum {
  JSON = "JSON",
  XML = "XML",
  HTML = "HTML",
  TEXT = "Text",
  JAVASCRIPT = "JavaScript",
  IMAGE = "Image",
}

export enum ResponseStatusCode {
  OK = "200 OK",
  CREATED = "201 Created",
  ACCEPTED = "202 Accepted",
  NO_CONTENT = "204 No Content",
  BAD_REQUEST = "400 Bad Request",
  UNAUTHORIZED = "401 Unauthorized",
  FORBIDDEN = "403 Forbidden",
  NOT_FOUND = "404 Not Found",
  METHOD_NOT_ALLOWED = "405 Method Not Allowed",
  INTERNAL_SERVER_ERROR = "500 Internal Server Error",
  SERVICE_UNAVAILABLE = "503 Service Unavailable",
  ERROR = "Not Found",
}

export interface KeyValue {
  key: string;
  value: string;
  checked?: boolean;
  base?: string;
  type?: "text" | "file";
}