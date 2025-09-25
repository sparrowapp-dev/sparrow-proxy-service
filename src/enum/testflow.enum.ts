export enum BodyModeEnum {
  "none" = "none",
  "application/json" = "application/json",
  "application/xml" = "application/xml",
  "application/yaml" = "application/yaml",
  "application/x-www-form-urlencoded" = "application/x-www-form-urlencoded",
  "multipart/form-data" = "multipart/form-data",
  "application/javascript" = "application/javascript",
  "text/plain" = "text/plain",
  "text/html" = "text/html",
}

export enum AuthModeEnum {
  "No Auth" = "No Auth",
  "Inherit Auth" = "Inherit Auth",
  "API Key" = "API Key",
  "Bearer Token" = "Bearer Token",
  "Basic Auth" = "Basic Auth",
}


export enum AddTo {
  Header = "Header",
  QueryParameter = "Query Parameter",
}

export class Auth {
  bearerToken?: string;
  basicAuth?: {
    username: string;
    password: string;
  };
  apiKey?: {
    authKey: string;
    authValue: string | unknown;
    addTo: AddTo;
  };
}

export enum WorkspaceUserAgentBaseEnum {
  BROWSER_AGENT= "Browser Agent",
  CLOUD_AGENT= "Cloud Agent"
}

export type TFKeyValueStoreType = {
  key: string;
  value: string;
  checked?: boolean;
};

export interface TFAPIResponseType {
  body?: string;
  headers?: object;
  status?: string;
}