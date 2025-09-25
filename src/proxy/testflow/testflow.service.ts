import { Injectable } from '@nestjs/common';
import { TestflowRunDto, TestFlowSchedularRunHistory } from 'src/payloads/testflow.payload';
import { HttpService } from '../http/http.service';
import { WorkspaceUserAgentBaseEnum } from 'src/enum/testflow.enum';
import { Base64Converter } from 'src/utils/base64Converter';
import { Logger } from '@nestjs/common';
import axios from "axios";
import { success,error } from 'src/enum/httpResponseFormat';
import { StatusCode } from 'src/utils/status-code';
import { DecodeTestflow, RequestData } from 'src/utils/decode-testflow';
import { ParseTime } from 'src/utils/parse-time';
import { TFAPIResponseType } from 'src/enum/testflow.enum';
import { TFKeyValueStoreType } from 'src/enum/testflow.enum';
import { ResponseStatusCode } from 'src/enum/httpRequest.enum';

@Injectable()
export class TestflowService {
  private readonly logger = new Logger(TestflowService.name);
  private _decodeRequest = new DecodeTestflow();
  constructor(
    private readonly httpService: HttpService,
  ) {}

  async makeRequest(
    url: string,
    method: string,
    headers: string,
    body: string,
    contentType: string,
    selectedAgent: WorkspaceUserAgentBaseEnum,
    signal?: AbortSignal,
    ) {
    const startTime = performance.now();
    try {
    let response;
    // Cloud Agent - call makeHttpRequest directly
    if (selectedAgent === "Cloud Agent") {
      try {
        const cloudResponse = await this.httpService.makeHttpRequest({
          url,
          method,
          headers,
          body,
          contentType,
        });
        return success({
          body: cloudResponse.data,
          status: cloudResponse.status,
          headers: cloudResponse.headers,
        });
      } catch (cloudError) {
        return error(cloudError.message || "Cloud agent request failed");
      }
        } else {
            try {
                let jsonHeader;
                try {
                jsonHeader = JSON.parse(headers);
                console.log("[makeHttpRequestV2] parsed headers", jsonHeader);
                } catch {
                console.warn("[makeHttpRequestV2] failed to parse headers, using []");
                jsonHeader = [];
                }
                const headersObject = jsonHeader.reduce(
                (
                    acc: Record<string, string>,
                    header: { key: string; value: string },
                ) => {
                    acc[header.key] = header.value;
                    return acc;
                },
                {},
                );
                let requestData = body || {};
                console.log("[makeHttpRequestV2] initial requestData", requestData);
                if (contentType === "multipart/form-data") {
                console.log("[makeHttpRequestV2] handling multipart/form-data");
                const formData = new FormData();
                const parsedBody = JSON.parse(body);
                for (const field of parsedBody || []) {
                    try {
                    if (field?.base) {
                        const file = await new Base64Converter().base64ToFile(
                        field.base,
                        field.value,
                        );
                        formData.append(field.key, file);
                    } else {
                        formData.append(field.key, field.value);
                    }
                    } catch (e) {
                    console.error("[makeHttpRequestV2] formData field error", e);
                    formData.append(field.key, field.value);
                    }
                }
                requestData = formData;
                delete headersObject["Content-Type"]; // let axios set boundary
                } else if (contentType === "application/x-www-form-urlencoded") {
                console.log("[makeHttpRequestV2] handling urlencoded body");
                const urlSearchParams = new URLSearchParams();
                const parsedBody = JSON.parse(body);
                (parsedBody || []).forEach(
                    (field: { key: string; value: string }) => {
                    urlSearchParams.append(field.key, field.value);
                    },
                );
                requestData = urlSearchParams;
                } else if (
                contentType === "application/json" ||
                contentType === "text/plain"
                ) {
                headersObject["Content-Type"] = contentType;
                }
                const axiosResponse = await Promise.race([
                axios({
                    method,
                    url,
                    data: requestData || {},
                    headers: { ...headersObject },
                    responseType: "arraybuffer",
                    validateStatus: () => true,
                }),
                this.waitForAbort(signal),
                ]);
                if (signal?.aborted) {
                console.warn("[makeHttpRequestV2] request was aborted");
                throw new DOMException("Request was aborted", "AbortError");
                }
                let responseData = "";
                const responseContentType = axiosResponse.headers["content-type"] || "";
                if (responseContentType.startsWith("image/")) {
                console.log("[makeHttpRequestV2] handling image response");
                const base64 = btoa(
                    new Uint8Array(axiosResponse.data).reduce(
                    (data, byte) => data + String.fromCharCode(byte),
                    "",
                    ),
                );
                responseData = `data:${responseContentType};base64,${base64}`;
                } else {
                responseData = new TextDecoder("utf-8").decode(axiosResponse.data);
                }
                const status = `${axiosResponse.status} ${
                axiosResponse.statusText ||
                new StatusCode().getText(axiosResponse.status)
                }`;
                return success({
                body: responseData,
                status: status,
                headers: Object.fromEntries(
                    Object.entries(axiosResponse.headers),
                ),
                });
            } catch (axiosError: any) {
                console.error("[makeHttpRequestV2] axios error", axiosError);
                if (signal?.aborted) {
                throw new DOMException("Request was aborted", "AbortError");
                }
                return error(axiosError.message || "Browser agent request failed");
            }
        }
    } catch (e) {
        if (signal?.aborted) {
        console.warn("[makeHttpRequestV2] aborted at outer catch");
        throw new DOMException("Request was aborted", "AbortError");
        }
        console.error("[makeHttpRequestV2] request error", e);
        return error(String(e));
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

  async runTestflow(payload: TestflowRunDto) {
    const { nodes, variables } = payload;
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
    };

    let requestChainResponse: Record<string, any> = {};
    const executedNodes: any[] = [];
    const environmentVariables = variables || [];
    for (const element of nodes) {
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
            console.log("🌐 Sending request:", { url, method, headers, body, contentType });
            const response: any = await this.makeRequest(
            url,
            method,
            headers,
            body,
            contentType,
            payload.selectedAgent,
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
            history.requests.push({
                method: requestData.method as string,
                name: requestData.name as string,
                status: resData.status,
                time: new ParseTime().convertMilliseconds(duration),
            });
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
            });
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
            });
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
    console.log("Final history:", history);
    return {
        history,
        requestChainResponse,
        nodes: executedNodes,
    };
  }
}

