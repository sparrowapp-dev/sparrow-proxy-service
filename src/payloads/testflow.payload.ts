import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ValidateNested,
  IsArray,
  IsNotEmptyObject,
  IsString,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDate,
} from 'class-validator';
import { HTTPMethods } from "fastify";
import { BodyModeEnum, WorkspaceUserAgentBaseEnum } from 'src/enum/testflow.enum';
import { AuthModeEnum } from 'src/enum/testflow.enum';
import { Auth } from 'src/enum/testflow.enum';


export class KeyValue {
  key: string;
  value: string | unknown;
  checked: boolean;
}

export class VariableDto {
  @IsString()
  key: string;

  @IsString()
  value: string;

  @IsBoolean()
  @IsOptional()
  checked?: boolean;
}


export class SparrowRequestBody {
  raw?: string;
  urlencoded?: KeyValue[];
  formdata?: FormData;
}

export class RequestMetaData {
  @ApiProperty({ example: 'put' })
  @IsNotEmpty()
  method: HTTPMethods;

  @ApiProperty({ example: 'pet' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'updatePet' })
  @IsString()
  @IsOptional()
  operationId?: string;

  @ApiProperty({ example: '/pet' })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiProperty({ type: [SparrowRequestBody] })
  @Type(() => SparrowRequestBody)
  @ValidateNested({ each: true })
  @IsOptional()
  body?: SparrowRequestBody[];

  @ApiProperty({
    enum: [
      'application/json',
      'application/xml',
      'application/x-www-form-urlencoded',
      'multipart/form-data',
      'application/javascript',
      'text/plain',
      'text/html',
    ],
  })
  @IsEnum(BodyModeEnum)
  @IsOptional()
  selectedRequestBodyType?: BodyModeEnum;

  @ApiProperty({
    enum: AuthModeEnum,
  })
  @IsEnum(AuthModeEnum)
  @IsNotEmpty()
  selectedRequestAuthType?: AuthModeEnum;

  @ApiProperty({
    example: {
      name: 'search',
      description: 'The search term to filter results',
      required: false,
      schema: {},
    },
  })
  @IsArray()
  @Type(() => KeyValue)
  @ValidateNested({ each: true })
  @IsOptional()
  queryParams?: KeyValue[];

  @ApiProperty({
    type: [KeyValue],
    example: {
      name: 'userID',
      description: 'The unique identifier of the user',
      required: true,
      schema: {},
    },
  })
  @IsArray()
  @Type(() => KeyValue)
  @ValidateNested({ each: true })
  @IsOptional()
  pathParams?: KeyValue[];

  @ApiProperty({
    type: [KeyValue],
    example: {
      name: 'Authorization',
      description: 'Bearer token for authentication',
    },
  })
  @IsArray()
  @Type(() => KeyValue)
  @ValidateNested({ each: true })
  @IsOptional()
  headers?: KeyValue[];

  @ApiProperty({
    type: [Auth],
    example: {
      bearerToken: 'Bearer xyz',
    },
  })
  @IsArray()
  @Type(() => Auth)
  @ValidateNested({ each: true })
  @IsOptional()
  auth?: Auth[];
}

export class TestflowRunDto {
  @IsArray()
  @Type(() => TestflowNodes)
  @ValidateNested({ each: true })
  @IsOptional()
  nodes: TestflowNodes[];

  @ApiProperty({ type: [VariableDto] })
  @IsArray()
  @Type(() => VariableDto)
  @ValidateNested({ each: true })
  variables: VariableDto[];

  @IsString()
  @IsOptional()
  userId:string;
}

export class NodeData {
  @IsString()
  @IsNotEmpty()
  blockName: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  requestId?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  folderId?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  collectionId?: string;

  @ApiProperty({ type: RequestMetaData })
  @IsOptional()
  @Type(() => RequestMetaData)
  requestData?: RequestMetaData;
}

export class TestflowNodes {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsOptional()
  position?: any;

  @Type(() => NodeData)
  @IsOptional()
  data?: NodeData;
}

export class TestflowSchedularHistoryRequest {
  @IsString()
  @IsOptional()
  method?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  time: string;
}

export class TestFlowSchedularRunHistory {
  @IsString()
  @IsNotEmpty()
  failedRequests: number;

  @IsArray()
  @IsOptional()
  requests?: TestflowSchedularHistoryRequest[];

  @IsString()
  @IsNotEmpty()
  status: string;

  @IsNumber()
  @IsNotEmpty()
  successRequests: number;

  @IsString()
  @IsNotEmpty()
  totalTime: string;

  @IsDate()
  @IsOptional()
  createdAt?: Date;

  @IsDate()
  @IsOptional()
  updatedAt?: Date;

  @IsString()
  @IsOptional()
  createdBy?: string;

  @IsString()
  @IsOptional()
  updatedBy?: string;
}