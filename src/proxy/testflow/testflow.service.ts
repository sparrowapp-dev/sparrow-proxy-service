import { Injectable } from '@nestjs/common';
import { TestflowNodes, TestflowRunDto, TestFlowSchedularRunHistory } from 'src/payloads/testflow.payload';
import { Logger } from '@nestjs/common';
import { success,error } from 'src/enum/httpResponseFormat';
import { DecodeTestflow, RequestData } from 'src/utils/decode-testflow';
import { ParseTime } from 'src/utils/parse-time';
import { TFAPIResponseType } from 'src/enum/testflow.enum';
import { TFKeyValueStoreType } from 'src/enum/testflow.enum';
import { ResponseStatusCode } from 'src/enum/httpRequest.enum';
import { BadRequestException } from '@nestjs/common';
import { HttpService as NestHttpService } from '@nestjs/axios';
import * as https from 'https';
import FormData from 'form-data';
import { lookup } from 'dns/promises';
import * as ipaddr from 'ipaddr.js';

@Injectable()
export class TestflowService {
  private readonly logger = new Logger(TestflowService.name);
  private _decodeRequest = new DecodeTestflow();
  constructor(
    private readonly httpService: NestHttpService,
  ) {}

  private base64ToBuffer(base64: string): { buffer: Buffer; mime: string } {
    const arr = base64.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1];
    const bstr = Buffer.from(arr[1], 'base64');
    return { buffer: bstr, mime };
  }
  
  private getStatusText(statusCode: number): string {
      const statusMap: Record<number, string> = {
        // 1xx Informational
        100: 'Continue',
        101: 'Switching Protocols',
        102: 'Processing',
        103: 'Early Hints',
  
        // 2xx Success
        200: 'OK',
        201: 'Created',
        202: 'Accepted',
        203: 'Non-Authoritative Information',
        204: 'No Content',
        205: 'Reset Content',
        206: 'Partial Content',
        207: 'Multi-Status',
        208: 'Already Reported',
        226: 'IM Used',
  
        // 3xx Redirection
        300: 'Multiple Choices',
        301: 'Moved Permanently',
        302: 'Found',
        303: 'See Other',
        304: 'Not Modified',
        305: 'Use Proxy',
        307: 'Temporary Redirect',
        308: 'Permanent Redirect',
  
        // 4xx Client Errors
        400: 'Bad Request',
        401: 'Unauthorized',
        402: 'Payment Required',
        403: 'Forbidden',
        404: 'Not Found',
        405: 'Method Not Allowed',
        406: 'Not Acceptable',
        407: 'Proxy Authentication Required',
        408: 'Request Timeout',
        409: 'Conflict',
        410: 'Gone',
        411: 'Length Required',
        412: 'Precondition Failed',
        413: 'Payload Too Large',
        414: 'URI Too Long',
        415: 'Unsupported Media Type',
        416: 'Range Not Satisfiable',
        417: 'Expectation Failed',
        418: `I\'m a teapot`,
        421: 'Misdirected Request',
        422: 'Unprocessable Entity',
        423: 'Locked',
        424: 'Failed Dependency',
        425: 'Too Early',
        426: 'Upgrade Required',
        428: 'Precondition Required',
        429: 'Too Many Requests',
        431: 'Request Header Fields Too Large',
        451: 'Unavailable For Legal Reasons',
  
        // 5xx Server Errors
        500: 'Internal Server Error',
        501: 'Not Implemented',
        502: 'Bad Gateway',
        503: 'Service Unavailable',
        504: 'Gateway Timeout',
        505: 'HTTP Version Not Supported',
        506: 'Variant Also Negotiates',
        507: 'Insufficient Storage',
        508: 'Loop Detected',
        509: 'Bandwidth Limit Exceeded',
        510: 'Not Extended',
        511: 'Network Authentication Required',
      };
  
      return statusMap[statusCode] || 'Unknown Status';
  }
  
  private async validateUrl(targetUrl: string) {
      try {
        const url = new URL(targetUrl);
  
        // Resolve hostname to IPs
        const addresses = await lookup(url.hostname, { all: true });
  
        for (const addr of addresses) {
          const ip = ipaddr.parse(addr.address);
  
          // Block local, private, or reserved IPs
          if (
            ip.range() === 'linkLocal' ||  // 169.254.0.0/16 (Azure IMDS lives here)
            ip.range() === 'loopback'  ||  // 127.0.0.0/8
            ip.range() === 'private'   ||  // 10.x, 192.168.x, 172.16-31.x
            ip.range() === 'reserved'     // Other reserved ranges
          ) {
            throw new BadRequestException(
              `Access to internal IP addresses is not allowed: ${addr.address}`,
            );
          }
        }
      } catch (err) {
        throw new BadRequestException('Invalid or disallowed URL');
      }
  }

  private async makeHttpRequest({
      url,
      method,
      headers,
      body,
      contentType,
    }: {
      url: string;
      method: string;
      headers: string;
      body: any;
      contentType: string;
    }): Promise<{ status: string; data: any; headers: any }> {
      try {
        await this.validateUrl(url);
        // Parse headers from stringified JSON
        const parsedHeaders: Record<string, string> = {};
        let headersArray;
  
        try {
          headersArray = JSON.parse(headers);
          if (Array.isArray(headersArray)) {
            headersArray.forEach((item: any) => {
              parsedHeaders[item.key] = item.value;
            });
          }
        } catch (headerError) {
          console.error('Error parsing headers:', headerError);
          throw new Error('Invalid headers format');
        }
  
        // Prepare the request configuration
        const config: any = {
          url,
          method,
          headers: parsedHeaders,
          data: null,
        };
  
        // Handle body based on content type
        try {
          switch (contentType) {
            case 'application/json':
              if (typeof body === 'string') {
                // Check if the body is a numeric string
                const isNumeric = !isNaN(body as any) && !isNaN(parseFloat(body));
                if (isNumeric) {
                  config.data = body; // Keep numeric string as is
                } else {
                  // Try parsing as JSON only if it's not a numeric string
                  try {
                    config.data = JSON.parse(body);
                  } catch (e) {
                    config.data = body; // If parsing fails, use the original string
                  }
                }
              } else {
                config.data = body;
              }
              break;
  
            case 'application/x-www-form-urlencoded':
              // Parse body if it's a string
              const formParsedBody =
                typeof body === 'string' ? JSON.parse(body) : body;
  
              if (!Array.isArray(formParsedBody)) {
                throw new Error('Body must be an array for URL-encoded data.');
              }
  
              // Filter and transform the body into key-value pairs
              const formBody: Record<string, string> = {};
              formParsedBody.forEach((item: any) => {
                formBody[item.key] = item.value;
              });
  
              const formUrlEncoded = new URLSearchParams(formBody);
              config.data = formUrlEncoded.toString();
              config.headers['Content-Type'] =
                'application/x-www-form-urlencoded';
              break;
  
            case 'multipart/form-data':
              const formData = new FormData();
              const parsedBody =
                typeof body === 'string' ? JSON.parse(body) : body;
              if (Array.isArray(parsedBody)) {
                for (const field of parsedBody || []) {
                  try {
                    if (field?.base) {
                      const { buffer, mime } = this.base64ToBuffer(field.base);
                      formData.append(field.key, buffer, {
                        filename: field.value,
                        contentType: mime,
                      });
                    } else {
                      formData.append(field.key, field.value);
                    }
                  } catch (e) {
                    formData.append(field.key, field.value);
                  }
                }
              }
  
              config.data = formData;
              config.headers = {
                ...parsedHeaders,
                ...formData.getHeaders(),
              };
              break;
  
            case 'text/plain':
              config.data = body;
              config.headers['Content-Type'] = 'text/plain';
              break;
  
            default:
              break;
          }
        } catch (bodyError) {
          console.error('Error processing request body:', bodyError);
          throw new Error('Invalid request body format');
        }
  
        // Add custom user agent
        config.headers['User-Agent'] = 'SparrowRuntime/1.0.0';
  
        // DNS rebinding protection: re-validate resolved IP before request
        const resolvedAddresses = await lookup(new URL(url).hostname, { all: true });
        for (const addr of resolvedAddresses) {
          const ip = ipaddr.parse(addr.address);
          if (
            ip.range() === 'linkLocal' ||
            ip.range() === 'loopback'  ||
            ip.range() === 'private'   ||
            ip.range() === 'reserved'
          ) {
            throw new BadRequestException(
              `Access to internal IP addresses is not allowed: ${addr.address}`,
            );
          }
        }
        
        try {
          const response = await this.httpService.axiosRef({
            url: config.url,
            method: config.method,
            headers: config.headers,
            data: config.data,
            responseType: 'arraybuffer',
            httpsAgent: new https.Agent({ rejectUnauthorized: false }), // allows expired SSL certs.
          });
  
          let contentType = response.headers['content-type'];
          let responseData = '';
          if (contentType?.startsWith('image/')) {
            const base64 = Buffer.from(response.data).toString('base64');
            responseData = `data:${contentType};base64,${base64}`;
          } else {
            responseData = Buffer.from(response.data).toString('utf-8');
          }
  
          return {
            status:
              response.status +
              ' ' +
              (response.statusText || this.getStatusText(response.status)),
            data: `${responseData}`,
            headers: response.headers,
          };
        } catch (axiosError: any) {
          try {
            const responseData = Buffer.from(axiosError.response?.data).toString(
              'utf-8',
            );
            return {
              status: axiosError.response?.status
                ? axiosError.response?.status +
                  ' ' +
                  (axiosError.response?.statusText ||
                    this.getStatusText(axiosError.response?.status))
                : null,
              data: responseData || { message: axiosError.message },
              headers: axiosError.response?.headers,
            };
          } catch (e) {
            return {
              status: null,
              data: { message: axiosError.message },
              headers: axiosError.response?.headers,
            };
          }
        }
      } catch (error: any) {
        console.error('HTTP Service Error:', error);
        throw new Error(error.message || 'Unknown error occurred');
      }
  }

  private async makeRequest(
    url: string,
    method: string,
    headers: string,
    body: string,
    contentType: string,
    signal?: AbortSignal,
    ) {
    try {
      const response = await this.makeHttpRequest({
        url,
        method,
        headers,
        body,
        contentType,
      });
     return success({
        body: response.data,
        status: response.status,
        headers: response.headers,
     });
    } catch (cloudError) {
      return error(cloudError.message || "Cloud agent request failed");
    }
  }

  async waitForAbort(signal: AbortSignal): Promise<never> {
    return new Promise((_, reject) => {
      if (signal?.aborted) {
        return reject(new Error("Aborted before starting"));
      }
      signal?.addEventListener(
        "abort",
        () => {
          reject(new Error("Aborted during request"));
        },
        { once: true },
      );
    });
  }

  private findConnectedNodes = (
    adj: any[],
    start: number,
    nodes:TestflowNodes[],
    result:TestflowNodes[],
    visited = new Set(),
  ) => {
    if (visited.has(start)) return;
    for (let i = 0; i < nodes.length; i++) {
      if (Number(nodes[i].id) === start) {
        result.push(nodes[i]);
      }
    }
    visited.add(start);
    for (const neighbor of adj[start]) {
      this.findConnectedNodes(adj, neighbor, nodes, result, visited);
    }
  };

  async runTestflow(payload: TestflowRunDto) {
    const { nodes, variables, edges } = payload;
    const abortController = new AbortController();
    const { signal } = abortController;
    let successRequests = 0;
    let failedRequests = 0;
    let totalTime = 0;
    const history: TestFlowSchedularRunHistory = {
        status: "fail",
        successRequests: 0,
        failedRequests: 0,
        totalTime: "",
        createdAt: new Date(),
        createdBy: payload.userId,
        requests: [],
        responses:[]
    };

    let requestChainResponse: Record<string, any> = {};
    const executedNodes: any[] = [];
    const environmentVariables = variables || [];
    let runningNodes: any[] = [];
    let maxNodeId = 1;
    for (let i = 0; i < nodes.length; i++) {
      maxNodeId = Math.max(maxNodeId, Number(nodes[i].id));
    }
    // Initialize adjacency list
    const graph = Array.from({ length: maxNodeId + 1 }, () => []);
    // Populate adjacency list
    for (let i = 0; i < edges.length; i++) {
      graph[Number(edges[i].source)].push(Number(edges[i].target));
    }
    let result = [];
    this.findConnectedNodes(graph, Number("1"), nodes, result);
    runningNodes = [...result];
    for (const element of runningNodes) {
        if (element?.type !== "requestBlock" || !element?.data?.requestData) {
        continue;
        }
        const requestData: RequestData = element.data.requestData as RequestData;
        try {
        // Decode request
        const decodeData = this._decodeRequest.init(
            requestData,
            environmentVariables.filter(
            (env: { key: string; value: string; checked: boolean }) =>
                env.key?.trim() && env.value?.trim(),
            ),
            requestChainResponse,
        );
        const [url, method, headers, body, contentType] = decodeData;
        const start = Date.now();
        let resData: any;
        try {
            const response: any = await this.makeRequest(
            url,
            method,
            headers,
            body,
            contentType,
            signal,
            );
            const duration = Date.now() - start;
            if (response.isSuccessful) {
            const byteLength = new TextEncoder().encode(
                JSON.stringify(response),
            ).length;
            const responseSizeKB = byteLength / 1024;
            const responseData: TFAPIResponseType = response.data;
            const responseBody = responseData.body;
            const formattedHeaders = Object.entries(
                response?.data?.headers || {},
            ).map(([key, value]) => ({
                key,
                value: String(value),
            })) as TFKeyValueStoreType[];
            const responseStatus = response?.data?.status;
            resData = {
                body: responseBody,
                headers: formattedHeaders,
                status: responseStatus,
                time: duration,
                size: responseSizeKB,
                responseContentType:
                this._decodeRequest.setResponseContentType(formattedHeaders),
            };
            const statusCode = Number(resData.status.split(" ")[0]);
            if (statusCode >= 200 && statusCode < 300) {
                successRequests++;
            } else {
                failedRequests++;
            }
            totalTime += duration;
            const resBody = JSON.parse(response.data.body);
            history.requests.push({
                method: requestData.method as string,
                name: requestData.name as string,
                status: resData.status,
                time: new ParseTime().convertMilliseconds(duration),
                ...(statusCode < 200 || statusCode >= 300
                    ? {
                        errorMessage:resBody?.message,
                        error: resBody?.error || undefined,
                        }
                : {}),
            });
            history.responses.push({
                headers: resData.headers,
                status: resData.status,
                body: resData.body,
                time: resData.time,
                size: resData.size,
                responseContentType: resData.responseContentType ,
            })
            // Build chaining object
            const responseHeader =
                this._decodeRequest.setResponseContentType(formattedHeaders);
            const reqParam: Record<string, string> = {};
            const params = new URL(url).searchParams;
            for (const [key, value] of params.entries()) {
                reqParam[key] = value;
            }
            const parsedHeaders = JSON.parse(headers) as {
                key: string;
                value: string;
            }[];
            const headersObject = Object.fromEntries(
                parsedHeaders.map(({ key, value }) => [key, value]),
            );
            let reqBody: any;
            if (contentType === "application/json") {
                try {
                reqBody = JSON.parse(body);
                } catch {
                reqBody = {};
                }
            } else if (
                contentType === "multipart/form-data" ||
                contentType === "application/x-www-form-urlencoded"
            ) {
                try {
                const parsedBody = JSON.parse(body) as {
                    key: string;
                    value: string;
                }[];
                reqBody = Object.fromEntries(
                    parsedBody.map(({ key, value }) => [key, value]),
                );
                } catch {
                reqBody = {};
                }
            } else {
                reqBody = body;
            }
            const responseObject = {
                response: {
                body:
                    responseHeader === "JSON"
                    ? JSON.parse(resData.body)
                    : resData.body,
                headers: response?.data?.headers,
                },
                request: {
                headers: headersObject || {},
                body: reqBody,
                parameters: reqParam || {},
                },
            };
            const sanitizedRequestName = requestData.name.replace(
                /[^a-zA-Z0-9_]/g,
                "_",
            );
            const sanitizedBlockName = (
                element.data.blockName || element.id
            ).replace(/[^a-zA-Z0-9_]/g, "_");
            requestChainResponse[`$$${sanitizedRequestName}`] = responseObject;
            requestChainResponse[`$$${sanitizedBlockName}`] = responseObject;
            } else {
            resData = {
                body: response.message || "Request failed",
                headers: [],
                status: ResponseStatusCode.ERROR,
                time: duration,
                size: 0,
            };
            failedRequests++;
            totalTime += duration;
            history.requests.push({
                method: requestData.method as string,
                name: requestData.name as string,
                status: ResponseStatusCode.ERROR,
                time: new ParseTime().convertMilliseconds(duration),
                errorMessage:response.message,
                error:response.error
            });
            history.responses.push({
                headers: resData.headers,
                status: resData.status,
                body: resData.body,
                time: resData.time,
                size: resData.size,
            })
            }
        } catch (error) {
            const duration = Date.now() - start;
            if (error?.name === "AbortError") {
            console.warn("🛑 Request aborted, breaking loop");
            break;
            }
            resData = {
                body: error?.message || "Request failed",
                headers: [],
                status: ResponseStatusCode.ERROR,
                time: duration,
                size: 0,
            };
            failedRequests++;
            totalTime += duration;
            history.requests.push({
                method: requestData.method as string,
                name: requestData.name as string,
                status: ResponseStatusCode.ERROR,
                time: new ParseTime().convertMilliseconds(duration),
                errorMessage:error.message,
                error:error
            });
            history.responses.push({
                headers: resData.headers,
                status: resData.status,
                body: resData.body,
                time: resData.time,
                size: resData.size,
            })
        }
        executedNodes.push({
            id: element.id,
            response: resData,
            request: requestData,
        });
        } catch (error) {
        failedRequests++;
        history.requests.push({
            method: requestData?.method || "UNKNOWN",
            name: requestData?.name || "Unknown Request",
            status: ResponseStatusCode.ERROR,
            time: "0 ms",
            errorMessage:error.message,
            error:error
        });
        executedNodes.push({
            id: element.id,
            response: {
            body: error?.message || "Processing failed",
            headers: [],
            status: ResponseStatusCode.ERROR,
            time: 0,
            size: 0,
            },
            request: requestData,
        });
        }
    }

    // Finalize history
    history.totalTime = new ParseTime().convertMilliseconds(totalTime);
    history.successRequests = successRequests;
    history.failedRequests = failedRequests;
    history.status = failedRequests === 0 ? "pass" : "fail";
    return {
        history,
        requestChainResponse,
        nodes: executedNodes,
    };
  }
}

