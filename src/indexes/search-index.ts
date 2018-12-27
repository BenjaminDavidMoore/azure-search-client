import {
  AnalyzeQuery,
  AnalyzeResults,
  Document as IDocument,
  Index as IndexSchema,
  IndexDocument,
  IndexingResult,
  IndexingResults,
  IndexStatistics,
  Query,
  SearchDocument,
  SearchResults,
  SuggestQuery,
  SuggestResults,
} from 'azure-search-types';

import { jsonParser } from "../parsers";
import { promiseOrCallback } from '../promise-or-callback';
import { SearchRequester } from "../search-requester";
import { SearchResource } from "../search-resource";
import { AzureSearchResponse, ListOptions, OptionsOrCallback, SearchCallback, SearchOptions } from '../types';
import { FieldName, QueryBuilder, QueryFacet } from "./builders";
import { IndexBuffer } from './index-buffer';
import { IndexStream } from './index-stream';

export {
  IndexSchema,
  Query,
  SuggestQuery,
  AnalyzeQuery,
  IndexDocument,
  SearchResults,
  SuggestResults,
  AnalyzeResults,
  IndexingResults,
  IndexStatistics,
  IDocument,
  SearchDocument,
};

export interface DocumentParseOptions {
  parseDates?: boolean;
}

export interface SearchResponse<T> extends AzureSearchResponse<SearchResults<T>> {
}

export interface SuggestResponse<T> extends AzureSearchResponse<SuggestResults<T>> {
}

export interface SearchResponse<T> extends AzureSearchResponse<SearchResults<T>> {
}

export type IndexingCallback = (err?: Error, results?: IndexingResult[]) => void;
export type OptionsOrIndexingCallback = SearchOptions | IndexingCallback;

export * from 'azure-search-types/dist/indexes/search';

const RE_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

export class SearchIndex<TDocument = any> extends SearchResource<IndexSchema> {

  /**
   * Manage Azure Search index resources
   * @param requester http handler
   * @param type must be 'indexes'
   * @param name the name of the current search index
   */
  constructor(requester: SearchRequester, type: string, name: string) {
    super(requester, type, name);
  }

  buildQuery(): QueryBuilder<TDocument> {
    return new QueryBuilder<TDocument>(this);
  }

  /**
   * Execute a search query
   * @param query query to execute
   * @param options optional request options
   */
  search(query?: Query, options?: SearchOptions & DocumentParseOptions): Promise<SearchResponse<TDocument>>;
  search(query: Query, callback: SearchCallback<SearchResults<TDocument>>): void;
  search(query: Query, options: SearchOptions & DocumentParseOptions, callback: SearchCallback<SearchResults<TDocument>>): void;
  search(query: Query, optionsOrCallback?: (SearchOptions & DocumentParseOptions) | SearchCallback<SearchResults<TDocument>>, callback?: SearchCallback<SearchResults<TDocument>>) {
    const options: SearchOptions & DocumentParseOptions = typeof optionsOrCallback === 'function' ? {} : optionsOrCallback || {};
    if (options.parseDates === undefined) {
      options.parseDates = true;
    }
    return this.request<SearchResults<TDocument>>({
      method: 'post',
      path: '/docs/search',
      body: query,
      parser: jsonParser((key, value) => {
        if (options.parseDates && typeof value === 'string' && RE_DATE.test(value)) {
          value = new Date(value);
        }
        return value;
      }),
    }, optionsOrCallback, callback);
  }

  /**
   * Execute a suggest query
   * @param query query to execute
   * @param options optional request options
   */
  suggest(query: SuggestQuery, options?: SearchOptions & DocumentParseOptions): Promise<SuggestResponse<TDocument>>;
  suggest(query: SuggestQuery, callback: SearchCallback<SuggestResults<TDocument>>): void;
  suggest(query: SuggestQuery, options: SearchOptions & DocumentParseOptions, callback: SearchCallback<SuggestResults<TDocument>>): void;
  suggest(query: SuggestQuery, optionsOrCallback?: (SearchOptions & DocumentParseOptions) | SearchCallback<SuggestResults<TDocument>>, callback?: SearchCallback<SuggestResults<TDocument>>) {
    const options: DocumentParseOptions = typeof optionsOrCallback === 'function' ? {} : optionsOrCallback || {};
    if (options.parseDates === undefined) {
      options.parseDates = true;
    }
    return this.request<SuggestResults<TDocument>>({
      method: 'post',
      path: '/docs/suggest',
      body: query,
      parser: jsonParser((key, value) => {
        if (options.parseDates && typeof value === 'string' && RE_DATE.test(value)) {
          value = new Date(value);
        }
        return value;
      }),
    }, optionsOrCallback, callback);
  }

  /**
   * Perform indexing analysis on text
   * @param query query to execute
   * @param options optional request options
   */
  analyze(query: AnalyzeQuery, options?: SearchOptions): Promise<AzureSearchResponse<AnalyzeResults>>;
  analyze(query: AnalyzeQuery, callback: SearchCallback<AnalyzeResults>): void;
  analyze(query: AnalyzeQuery, options: SearchOptions, callback: SearchCallback<AnalyzeResults>): void;
  analyze(query: AnalyzeQuery, optionsOrCallback?: OptionsOrCallback<AnalyzeResults>, callback?: SearchCallback<AnalyzeResults>) {
    return this.request<AnalyzeResults>({
      method: 'post',
      path: '/analyze',
      body: query,
    }, optionsOrCallback, callback);
  }

  /**
   * Add, remove, or update documents in the search index. This function handles batching of content to fit within indexing request limits.
   * @param documents documents to index
   * @param options optional request options
   */
  index(documents: Array<IndexDocument & TDocument>, options?: SearchOptions): Promise<IndexingResult[]>;
  index(documents: Array<IndexDocument & TDocument>, callback: IndexingCallback): void;
  index(documents: Array<IndexDocument & TDocument>, options: SearchOptions, callback: IndexingCallback): void;
  async index(documents: Array<IndexDocument & TDocument>, optionsOrCallback?: OptionsOrIndexingCallback, callback?: IndexingCallback) {

    const options = typeof optionsOrCallback === 'function' ? {} : optionsOrCallback;
    const cb = typeof optionsOrCallback === 'function' ? optionsOrCallback : callback;
    const results: IndexingResult[] = [];

    return await promiseOrCallback(async () => {
      const buffer = new IndexBuffer(async (data) => {
        const resp = await this.request<IndexingResults>({
          method: 'post',
          path: '/docs/index',
          headers: { 'content-type': 'application/json' },
          body: data,
        }, options);
        resp.result.value.forEach((x) => results.push(x));
      });
      for (const document of documents) {
        await buffer.add(document);
      }
      await buffer.flush();
      return results;
    }, cb);
  }

  /**
   * Create a indexing stream suitable for piping in document objects
   * @param options optional request options
   */
  createIndexingStream(options?: SearchOptions) {
    return new IndexStream(this.requester, this.name, options);
  }

  /**
   * Get document count and usage for the current index
   * @param options optional request options
   */
  statistics(options?: SearchOptions): Promise<AzureSearchResponse<IndexStatistics>>;
  statistics(callback: SearchCallback<IndexStatistics>): void;
  statistics(options: SearchOptions, callback: SearchCallback<IndexStatistics>): void;
  statistics(optionsOrCallback?: OptionsOrCallback<IndexStatistics>, callback?: SearchCallback<IndexStatistics>) {
    return this.request<IndexStatistics>({
      method: 'get',
      path: '/stats',
    }, optionsOrCallback, callback);
  }

  /**
   * Retrieve a single document from the current index
   * @param key document key
   * @param options optional request options
   */
  lookup(key: string, options?: SearchOptions): Promise<AzureSearchResponse<IDocument & TDocument>>;
  lookup(key: string, callback: SearchCallback<IDocument & TDocument>): void;
  lookup(key: string, options: SearchOptions, callback: SearchCallback<IDocument & TDocument>): void;
  lookup(key: string, optionsOrCallback?: (SearchOptions & ListOptions & DocumentParseOptions) | SearchCallback<IDocument & TDocument>, callback?: SearchCallback<IDocument & TDocument>) {
    const options: DocumentParseOptions = typeof optionsOrCallback === 'function' ? {} : optionsOrCallback || {};
    if (options.parseDates === undefined) {
      options.parseDates = true;
    }
    return this.request<IDocument & TDocument>({
      method: 'get',
      path: `/docs/${key}`,
      parser: jsonParser((key, value) => {
        if (options.parseDates && typeof value === 'string' && RE_DATE.test(value)) {
          value = new Date(value);
        }
        return value;
      }),
    }, optionsOrCallback, callback);
  }

  /**
   * Retrieve a count of the number of documents in a search index
   * @param options optional request options
   */
  count(options?: SearchOptions): Promise<AzureSearchResponse<number>>;
  count(callback: SearchCallback<number>): void;
  count(options: SearchOptions, callback: SearchCallback<number>): void;
  count(optionsOrCallback?: OptionsOrCallback<number>, callback?: SearchCallback<number>) {
    return this.request<number>({
      method: 'get',
      path: '/docs/$count',
      headers: { accept: 'text/plain' },
      parser: jsonParser(),
    }, optionsOrCallback, callback);
  }

  /**
   * Create a new FacetBuilder for this index
   */
  facet(field: FieldName<TDocument>): QueryFacet<TDocument>;
  facet(field: FieldName<TDocument>) {
    return new QueryFacet<TDocument>(field);
  }
}
