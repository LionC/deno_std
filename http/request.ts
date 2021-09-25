import { ConnInfo } from "./server.ts";
import { Expand } from "../_util/types.ts";
import { associateBy } from "../collections/associate_by.ts";

export class HttpRequest<C extends {} = {}> implements Request {
  #context: C;

  constructor(
    private request: Request,
    readonly connInfo: ConnInfo,
    context: C,
  ) {
    this.#context = context;
  }

  get context(): C {
    return this.#context;
  }

  addContext<N extends {}>(contextToAdd: N): HttpRequest<Expand<C & N>> {
    this.#context = { ...this.#context, ...contextToAdd };

    //@ts-ignore Limitations of mutation and types, but we should mutate for performance
    return this as HttpRequest<C & N>;
  }
  /**
   * Returns the cache mode associated with request, which is a string
   * indicating how the request will interact with the browser's cache when
   * fetching.
   */
  get cache(): RequestCache {
    return this.request.cache;
  }
  /**
   * Returns the credentials mode associated with request, which is a string
   * indicating whether credentials will be sent with the request always, never,
   * or only when sent to a same-origin URL.
   */
  get credentials(): RequestCredentials {
    return this.request.credentials;
  }
  /**
   * Returns the kind of resource requested by request, e.g., "document" or "script".
   */
  get destination(): RequestDestination {
    return this.request.destination;
  }
  /**
   * Returns a Headers object consisting of the headers associated with request.
   * Note that headers added in the network layer by the user agent will not be
   * accounted for in this object, e.g., the "Host" header.
   */
  get headers(): Headers {
    return this.request.headers;
  }
  /**
   * Returns request's subresource integrity metadata, which is a cryptographic
   * hash of the resource being fetched. Its value consists of multiple hashes
   * separated by whitespace. [SRI]
   */
  get integrity(): string {
    return this.request.integrity;
  }
  /**
   * Returns a boolean indicating whether or not request is for a history
   * navigation (a.k.a. back-forward navigation).
   */
  get isHistoryNavigation(): boolean {
    return this.request.isHistoryNavigation;
  }
  /**
   * Returns a boolean indicating whether or not request is for a reload
   * navigation.
   */
  get isReloadNavigation(): boolean {
    return this.request.isReloadNavigation;
  }
  /**
   * Returns a boolean indicating whether or not request can outlive the global
   * in which it was created.
   */
  get keepalive(): boolean {
    return this.request.keepalive;
  }
  /**
   * Returns request's HTTP method, which is "GET" by default.
   */
  get method(): string {
    return this.request.method;
  }
  /**
   * Returns the mode associated with request, which is a string indicating
   * whether the request will use CORS, or will be restricted to same-origin
   * URLs.
   */
  get mode(): RequestMode {
    return this.request.mode;
  }
  /**
   * Returns the redirect mode associated with request, which is a string
   * indicating how redirects for the request will be handled during fetching. A
   * request will follow redirects by default.
   */
  get redirect(): RequestRedirect {
    return this.request.redirect;
  }
  /**
   * Returns the referrer of request. Its value can be a same-origin URL if
   * explicitly set in init, the empty string to indicate no referrer, and
   * "about:client" when defaulting to the global's default. This is used during
   * fetching to determine the value of the `Referer` header of the request
   * being made.
   */
  get referrer(): string {
    return this.request.referrer;
  }
  /**
   * Returns the referrer policy associated with request. This is used during
   * fetching to compute the value of the request's referrer.
   */
  get referrerPolicy(): ReferrerPolicy {
    return this.request.referrerPolicy;
  }
  /**
   * Returns the signal associated with request, which is an AbortSignal object
   * indicating whether or not request has been aborted, and its abort event
   * handler.
   */
  get signal(): AbortSignal {
    return this.request.signal;
  }
  /**
   * Returns the URL of request as a string.
   */
  get url(): string {
    return this.request.url;
  }

  /** A simple getter used to expose a `ReadableStream` of the body contents. */
  get body(): ReadableStream<Uint8Array> | null {
    return this.request.body;
  }
  /** Stores a `Boolean` that declares whether the body has been used in a
   * response yet.
   */
  get bodyUsed(): boolean {
    return this.request.bodyUsed;
  }
  /** Takes a `Response` stream and reads it to completion. It returns a promise
   * that resolves with an `ArrayBuffer`.
   */
  arrayBuffer(): Promise<ArrayBuffer> {
    return this.request.arrayBuffer();
  }
  /** Takes a `Response` stream and reads it to completion. It returns a promise
   * that resolves with a `Blob`.
   */
  blob(): Promise<Blob> {
    return this.request.blob();
  }
  /** Takes a `Response` stream and reads it to completion. It returns a promise
   * that resolves with a `FormData` object.
   */
  formData(): Promise<FormData> {
    return this.request.formData();
  }
  /** Takes a `Response` stream and reads it to completion. It returns a promise
   * that resolves with the result of parsing the body text as JSON.
   */
  json(): Promise<any> {
    return this.request.json();
  }
  /** Takes a `Response` stream and reads it to completion. It returns a promise
   * that resolves with a `USVString` (text).
   */
  text(): Promise<string> {
    return this.request.text();
  }
  clone(): Request {
    return this.request.clone();
  }
}

interface CookieStoreRead {
  get(name: string): Promise<Cookie>;
  get(options?: CookieStoreGetOptions): Promise<Cookie>;

  getAll(name: string): Promise<Cookie[]>;
  getAll(options?: CookieStoreGetOptions): Promise<Cookie[]>;
}

interface CookieStoreWrite {
  set(name: string, value: string): Promise<void>;
  set(options: CookieInit): Promise<void>;

  delete(name: string): Promise<void>;
  delete(options: CookieStoreDeleteOptions): Promise<void>;
}

interface CookieStore extends CookieStoreRead, CookieStoreWrite {
}

type CookieStoreGetOptions = {
  name?: string;
  url?: string;
};

type CookieSameSite =
  | "strict"
  | "lax"
  | "none";

type CookieInit = {
  name: string;
  value: string;
  expires?: number; // = null;
  domain?: string; // = undefined;
  path?: string; // = "/";
  sameSite?: CookieSameSite; // = "strict";
};

type CookieStoreDeleteOptions = {
  name: string;
  domain?: string; // = null;
  path?: string; // = "/";
};

type Cookie = {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: number;
  secure?: boolean;
  sameSite?: CookieSameSite;
};

class HeaderCookieStoreReader implements CookieStoreRead {
    #rawCookies: string | undefined | null = undefined
    #parsedCookies?: Record<string, Cookie> = undefined

    constructor(readonly headers: Headers) {}

    private get raw() {
        if (this.#rawCookies === undefined) {
            const cookies = 
            this.#rawCookies = this.headers.get('Cookie')
        }

        return this.#rawCookies
    }

    private get parsedCookies() {
        if (this.#parsedCookies === undefined) {
            if (this.raw === null) {
                this.#parsedCookies = {}

                return this.#parsedCookies
            }

            const cookies = this
                .raw
                .split('; ')
                .map(this.parseRawCookie)

            this.#parsedCookies = associateBy(cookies, it => it.name)
        }

        return this.#parsedCookies
    }

    private parseRawCookie(rawCookie: string) {
        const index = rawCookie.indexOf('=')

        return {
            name: rawCookie.substr(0, index + 1),
            value: rawCookie.substr(index),
        }
    }

    async get(name: string) {
        return this.parsedCookies[name]
    }

    async getAll() {
        return Object.values(this.parsedCookies)
    }
}

/**
 * Parse cookies of a header
 * @param {Headers} headers The headers instance to get cookies from
 * @return {Object} Object with cookie names as keys
 */
export function getCookies(headers: Headers): Record<string, string> {
  const cookie = headers.get("Cookie");
  if (cookie != null) {
    const out: Record<string, string> = {};
    const c = cookie.split(";");
    for (const kv of c) {
      const [cookieKey, ...cookieVal] = kv.split("=");
      assert(cookieKey != null);
      const key = cookieKey.trim();
      out[key] = cookieVal.join("=");
    }
    return out;
  }
  return {};
}

