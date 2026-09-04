---
title: HTTP Fundamentals: Complete Study Notes
seoTitle: HTTP Fundamentals Notes: Requests, Responses, Headers, and Status Codes
description: >
  Complete HTTP study notes covering the request response model, methods,
  headers, status codes, and caching, with examples and practice questions.
overview: >
  These notes take apart the HTTP request-response cycle piece by piece:
  the request line, headers, body, and the response, then explain
  statelessness, caching, and HTTPS at the level exams and interviews
  expect.
subject: web-development
level: bs-computer-science
chapter: http-fundamentals
topics:
  - http-methods
  - rest-apis
learningObjectives:
  - Describe the parts of an HTTP request and response
  - Explain the role of key request and response headers
  - Classify status codes into their families
  - Explain how caching headers reduce latency and load
  - Describe what HTTPS adds on top of HTTP
keyTerms:
  - term: Request line
    definition: >
      The first line of a request: method, URL, and HTTP version, for
      example GET /users/12 HTTP/1.1.
  - term: Header
    definition: >
      A key-value pair carrying metadata about the request or response, like
      Content-Type or Cache-Control.
  - term: Entity body (payload)
    definition: >
      The bytes transferred with the message, typically JSON for APIs or
      HTML for pages.
  - term: MIME type
    definition: >
      The Content-Type value naming the body format, like text/html or
      application/json.
importantPoints:
  - HTTP is stateless: every request stands alone.
  - Headers control behavior, the body carries data.
  - The Host header made name-based virtual hosting possible.
  - Cache-Control and ETag together enable conditional requests.
formulas:
  - expression: 'HTTP exchange = request (method, URL, headers, body) + response (status, headers, body)'
    meaning: >
      Every HTTP interaction is exactly one request and one response, in
      that order.
summary: >
  HTTP is a text-based request-response protocol. A client sends a method,
  a URL, headers, and an optional body; the server answers with a status
  code, headers, and an optional body. It is stateless, cacheable, and runs
  over TCP, with HTTPS adding TLS encryption and server identity
  verification.
faqs:
  - question: Is HTTP a stateless or stateful protocol?
    answer: >
      Stateless. Each request carries everything needed to process it, and
      the protocol keeps no memory between requests. Stateful experiences,
      like login sessions, are built on top with cookies and tokens.
  - question: What is the difference between HTTP and HTTPS?
    answer: >
      HTTPS is HTTP running inside a TLS connection. TLS encrypts the
      traffic and verifies the server's identity through its certificate, so
      intermediaries cannot read or tamper with the exchange.
  - question: Can a GET request have a body?
    answer: >
      The semantics do not define one, and servers, proxies, and frameworks
      are free to drop it. Send data with GET in the URL query string, or
      use POST when the body is the point.
  - question: What does the Accept header do?
    answer: >
      It tells the server which representation formats the client can
      handle, like application/json. The server picks one and announces it
      back in Content-Type. This is content negotiation.
references:
  - title: HTTP Semantics RFC 9110
    url: https://www.rfc-editor.org/rfc/rfc9110
    source: IETF
  - title: MDN HTTP Reference
    url: https://developer.mozilla.org/en-US/docs/Web/HTTP
    source: Mozilla
author: soban-rasheed
publishedDate: 2026-07-15
updatedDate: 2026-08-28
popular: true
---

## Introduction

HTTP is the language of the web: every page load, API call, and file
download is an HTTP conversation. Understanding its anatomy turns vague
phrases like "the API is broken" into a diagnosis: wrong method, missing
header, or misrouted URL. These notes follow one request through the
protocol, end to end.

## The Request-Response Model

HTTP/1.1 is a client-server protocol over TCP. The client, usually a
browser, opens a connection, sends one request, and reads one response:

```http
GET /notes/rest-api-design/ HTTP/1.1
Host: devsyllabus.com
Accept: text/html
User-Agent: Mozilla/5.0
```

The server responds:

```http
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Content-Length: 4281
Cache-Control: public, max-age=3600

<html>...</html>
```

Three things to internalize:

1. The exchange is asymmetric. The client asks, the server answers, and
   only the client initiates.
2. The message is readable text. You can debug HTTP with a printed log.
3. One connection, one request in HTTP/1.1, though keep-alive connections
   reuse the TCP channel for many sequential requests. HTTP/2 multiplexes
   many concurrent streams over one connection.

## Anatomy of a Request

A request has four parts:

- **Request line:** method, path, version. `POST /orders HTTP/1.1`.
- **Headers:** metadata as `Name: value` lines.
- **Blank line:** separates headers from the body.
- **Optional body:** the payload, described by Content-Type.

Headers worth knowing cold:

| Header | Direction | Purpose |
|---|---|---|
| Host | request | Which site on a shared server. |
| Content-Type | both | Format of the body. |
| Content-Length | both | Size of the body in bytes. |
| Accept | request | Formats the client can consume. |
| Authorization | request | Credentials, typically a bearer token. |
| Cache-Control | both | Caching directives. |
| Set-Cookie | response | Asks the client to store a cookie. |
| Location | response | Where to find a created or moved resource. |
| ETag | response | Version tag for conditional requests. |

## Anatomy of a Response

A response replaces the request line with a **status line**: version,
three-digit code, reason phrase. Headers and an optional body follow the
same grammar as the request. The status families are covered in the [HTTP
methods and status codes topic hub](/topics/http-methods/); the short
version: 2xx success, 3xx redirection, 4xx client error, 5xx server error.

## Statelessness

No request remembers the previous one. This is the property that lets a
load balancer send your second request to a different server than your
first. Stateful experiences are layered on top: cookies identify the client,
and servers or tokens reconstruct context from data the client presents.

## Caching and Conditional Requests

Caching is where HTTP earns its performance reputation. Freshness is
controlled by `Cache-Control`: `max-age=3600` means the response is usable
for an hour without asking the origin server. When the cache expires,
conditional requests avoid re-downloading:

```http
GET /notes/rest-api-design/ HTTP/1.1
If-None-Match: "v3-8f2c"
```

If the ETag still matches, the server answers `304 Not Modified` with no
body, and the cache reuses its stored copy.

## HTTPS

HTTPS wraps the HTTP conversation in TLS. Before any HTTP bytes flow, the
client and server perform a handshake: the server presents a certificate,
the client verifies it chains to a trusted authority, and both derive
session keys. Everything after, including the URL path and headers, is
encrypted. This is why credentials must never travel over plain HTTP, and
why browsers flag HTTP sites as not secure.

## Following a Request End to End

Type a URL and press enter. The browser resolves the hostname to an IP
through DNS, opens a TCP connection (then TLS if HTTPS), writes the request,
reads the response, and renders the body. Every failure you will debug maps
to one of those stages: DNS failure, connection refused, TLS certificate
error, HTTP 4xx or 5xx, or a valid response with unexpected content.
