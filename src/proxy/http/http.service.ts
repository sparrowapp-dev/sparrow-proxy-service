import { Injectable } from '@nestjs/common';
import { HttpService as NestHttpService } from '@nestjs/axios';
import * as fs from 'fs';
import FormData from 'form-data';

@Injectable()
export class HttpService {
  constructor(private readonly httpService: NestHttpService) {}

  private base64ToBuffer(base64: string): { buffer: Buffer; mime: string }  {
    const arr = base64.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1];
    const bstr = Buffer.from(arr[1], 'base64');
    return { buffer: bstr, mime };
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
            config.data = typeof body === 'string' ? JSON.parse(body) : body;
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
                try{
                  if (field?.base) {
                    const { buffer, mime } = this.base64ToBuffer(field.base);
                    formData.append(field.key, buffer, { filename: field.value, contentType: mime });
                  }else  {
                    formData.append(field.key, field.value);
                  }
                }catch(e){
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
        });
        const resp = {
          status:
            response.status + ' ' + (response.statusText || 'Unknown Status'),
          data: response.data,
          headers: response.headers,
        };
        return resp;
      } catch (axiosError: any) {
        return {
          status: axiosError.response?.status
            ? axiosError.response?.status +
              ' ' +
              (axiosError.response?.statusText || 'Unknown Status')
            : null,
          data: axiosError.response?.data || { message: axiosError.message },
          headers: axiosError.response?.headers,
        };
      }
    } catch (error: any) {
      console.error('HTTP Service Error:', error);
      throw new Error(error.message || 'Unknown error occurred');
    }
  }
}
