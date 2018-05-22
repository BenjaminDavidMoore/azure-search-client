import * as request from 'superagent';

export interface SearchOptions {
  version?: string;
  key?: string;
  retry?: number;
  timeout?: number | { deadline: number, response: number };
  clientRequestId?: string;
  returnClientRequestId?: boolean;
  ifMatch?: string;
  ifNoneMatch?: string;
}

export interface SearchRequest<T> {
  method: string;
  path: string;
  headers?: { [key: string]: string };
  query?: { [key: string]: string };
  body?: any;
  parser?: Parser;
  callback?: SearchCallback<T>;
}

export interface AzureSearchResponse<T> {
  result: T;
  properties: AzureSearchResponseProperties;
  statusCode: number;
  timer: SearchTimer;
}

export interface AzureSearchResponseProperties {
  requestId: string;
  elapsedTime: number;
  clientRequestId?: string;
  eTag?: string;
  location?: string;
}

export interface SearchTimer {
  start: Date;
  response: [number, number];
  end: [number, number];
}

export interface ListResults<T> {
  value: T[];
}

export interface ListOptions {
  $select: string;
}

export interface ServiceCounter {
  usage: number;
  quota: number;
}

export interface ServiceStatisticsResult {
  counters: {
    documentCount: ServiceCounter;
    indexesCount: ServiceCounter;
    indexersCount: ServiceCounter;
    dataSourcesCount: ServiceCounter;
    storageSize: ServiceCounter;
    synonymMaps: ServiceCounter;
  };
  limits: {
    maxFieldsPerIndex: number;
    maxIndexerRunTime: string;
    maxFileExtractionSize: number;
    maxFileContentCharactersToExtract: number;
  };
}

export type SearchCallback<T> = (err: Error, resp: AzureSearchResponse<T>) => void;
export type ErrorCallback = (err: Error) => void;
export type ResponseCallback = (resp: any) => void;
export type RequestCallback = (req: any) => void;
export type ParserCallback = (err: Error, body: any) => void;
export type Parser = (res: request.Response, callback: ParserCallback) => void;