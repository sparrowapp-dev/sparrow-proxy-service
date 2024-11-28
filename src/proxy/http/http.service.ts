import { Injectable } from '@nestjs/common';
import { HttpService as NestHttpService } from '@nestjs/axios';
import * as fs from 'fs';
import FormData from 'form-data';

@Injectable()
export class HttpService {
  constructor(private readonly httpService: NestHttpService) {}

  async makeHttpRequest({
    url,
    method,
    headers,
    body,
    contentType,
  }: {
    url: string;
    method: string;
    headers: string; // Passed as a stringified array
    body: any;
    contentType: string;
  }): Promise<{ status: number; data: any; headers: Map<string, string> }> {
    try {
      // Parse headers from stringified JSON
      const parsedHeaders: Record<string, string> = {};
      const headersArray = JSON.parse(headers);

      headersArray.forEach((item: any) => {
        if (item.checked) {
          parsedHeaders[item.key] = item.value;
        }
      });

      // Prepare the request configuration
      const config: any = {
        url,
        method,
        headers: parsedHeaders,
        data: null,
      };

      // Prepare the request body based on the content type
      switch (contentType) {
        case 'application/json':
          config.data = JSON.parse(body);
          break;

        case 'application/x-www-form-urlencoded':
          const formUrlEncoded = new URLSearchParams(JSON.parse(body));
          config.data = formUrlEncoded.toString();
          config.headers['Content-Type'] = 'application/x-www-form-urlencoded';
          break;

        case 'multipart/form-data':
          const formData = new FormData();
          const parsedBody = JSON.parse(body);

          parsedBody.forEach((item: any) => {
            if (item.base) {
              formData.append(item.key, fs.createReadStream(item.base));
            } else {
              formData.append(item.key, item.value);
            }
          });

          config.data = formData;
          config.headers = {
            ...parsedHeaders,
            ...formData.getHeaders(), // Add FormData-specific headers
          };
          break;

        case 'text/plain':
          config.data = body;
          config.headers['Content-Type'] = 'text/plain';
          break;

        default:
          // No body for GET/HEAD/other requests
          break;
      }

      // Some websites like facebook.com are blocking the default browser user agent so hardcoding custom agent
      config.headers['User-Agent'] = 'SparrowRuntime/1.0.0';

      // Make the HTTP request using Axios
      const axiosRequestObject = {
        url: config.url,
        method: config.method,
        headers: config.headers,
        data: config.data,
      };

      const response = await this.httpService.axiosRef(axiosRequestObject);

      // Return the response in the desired format
      return {
        status: response.status,
        data: response.data,
        headers: new Map(Object.entries(response.headers)),
      };
    } catch (error) {
      // Return any error from the backend as-is
      throw new Error(
        error.response?.data || error.message || 'Unknown error occurred',
      );
    }
  }
}
