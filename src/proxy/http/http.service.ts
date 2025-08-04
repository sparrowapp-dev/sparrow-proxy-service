import { Injectable } from '@nestjs/common';
import { HttpService as NestHttpService } from '@nestjs/axios';
import * as https from 'https';
import FormData from 'form-data';

@Injectable()
export class HttpService {
  constructor(private readonly httpService: NestHttpService) {}

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

  async makeHttpRequest({
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
}
