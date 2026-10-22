export class NextRequest extends Request {
  get nextUrl() {
    return new URL(this.url);
  }
}
export class NextResponse extends Response {
  static json(body: unknown, init?: ResponseInit) {
    return Response.json(body, init);
  }
  static redirect(url: string | URL, init?: number | ResponseInit) {
    return Response.redirect(
      url,
      typeof init === "number" ? init : (init?.status ?? 307),
    );
  }
}
