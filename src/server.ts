import { resolve } from "node:path";
import { Echo, echo } from "@atums/echo";
import {
	type BunFile,
	FileSystemRouter,
	type MatchedRoute,
	type Server,
	type ServerWebSocket,
} from "bun";
import { CONTENT_TYPE, HTTP_STATUS } from "#constants";
import { environment } from "#environment";
import { reqLoggerIgnores } from "#environment/constants";
import { processTemplate } from "#utils/template";

class ServerHandler {
	private router: FileSystemRouter;

	constructor(
		private port: number,
		private host: string,
	) {
		this.router = new FileSystemRouter({
			style: "nextjs",
			dir: resolve("src", "routes"),
			fileExtensions: [".ts"],
			origin: `http://${this.host}:${this.port}`,
		});
	}

	public initialize(): void {
		const server: Server<WebSocketData> = Bun.serve({
			port: this.port,
			hostname: this.host,
			fetch: this.handleRequest.bind(this),
			websocket: {
				message: this.handleWebSocketMessage.bind(this),
				open: this.handleWebSocketOpen.bind(this),
				close: this.handleWebSocketClose.bind(this),
			},
		});

		const echoChild = new Echo({ disableFile: true });

		echoChild.info(
			`Server running at http://${server.hostname}:${server.port}`,
		);
		this.logRoutes(echoChild);
	}

	private logRoutes(echo: Echo): void {
		echo.info("Available routes:");

		const sortedRoutes: [string, string][] = Object.entries(
			this.router.routes,
		).sort(([pathA]: [string, string], [pathB]: [string, string]) =>
			pathA.localeCompare(pathB),
		);

		for (const [path, filePath] of sortedRoutes) {
			echo.info(`Route: ${path}, File: ${filePath}`);
		}
	}

	private async serveStaticFile(
		request: ExtendedRequest,
		pathname: string,
		ip: string,
	): Promise<Response> {
		let filePath: string;
		let response: Response;

		try {
			if (pathname === "/favicon.ico") {
				filePath = resolve("public", "assets", "favicon.ico");
			} else {
				filePath = resolve(`.${pathname}`);
			}

			const file: BunFile = Bun.file(filePath);

			if (await file.exists()) {
				const fileContent: ArrayBuffer = await file.arrayBuffer();
				const contentType: string = file.type ?? "application/octet-stream";

				response = new Response(fileContent, {
					headers: { "Content-Type": contentType },
				});
			} else {
				echo.warn(`File not found: ${filePath}`);
				response = new Response("Not Found", { status: 404 });
			}
		} catch (error) {
			echo.error({
				message: `Error serving static file: ${pathname}`,
				error: error as Error,
			});
			response = new Response("Internal Server Error", { status: 500 });
		}

		this.logRequest(request, response, ip);
		return response;
	}

	private logRequest(
		request: ExtendedRequest,
		response: Response,
		ip: string | undefined,
	): void {
		const pathname = new URL(request.url).pathname;

		if (
			reqLoggerIgnores.ignoredStartsWith.some((prefix) =>
				pathname.startsWith(prefix),
			) ||
			reqLoggerIgnores.ignoredPaths.includes(pathname)
		) {
			return;
		}

		echo.custom(`${request.method}`, `${response.status}`, [
			request.url,
			`${(performance.now() - request.startPerf).toFixed(2)}ms`,
			ip || "unknown",
		]);
	}

	private handleWebSocketMessage(
		ws: ServerWebSocket<WebSocketData>,
		message: string,
	): void {
		const data = ws.data;
		if (data?.routeModule?.websocket?.message) {
			data.routeModule.websocket.message(ws, message);
		}
	}

	private handleWebSocketOpen(ws: ServerWebSocket<WebSocketData>): void {
		const data = ws.data;
		if (data?.routeModule?.websocket?.open) {
			data.routeModule.websocket.open(ws);
		}
	}

	private handleWebSocketClose(
		ws: ServerWebSocket<WebSocketData>,
		code: number,
		reason: string,
	): void {
		const data = ws.data;
		if (data?.routeModule?.websocket?.close) {
			data.routeModule.websocket.close(ws, code, reason);
		}
	}

	private async handleRequest(
		request: Request,
		server: Server<WebSocketData>,
	): Promise<Response> {
		const extendedRequest: ExtendedRequest = request as ExtendedRequest;
		extendedRequest.startPerf = performance.now();

		const headers = request.headers;
		let ip = server.requestIP(request)?.address;
		let response: Response;

		if (!ip || ip.startsWith("172.") || ip === "127.0.0.1") {
			ip =
				headers.get("CF-Connecting-IP")?.trim() ||
				headers.get("X-Real-IP")?.trim() ||
				headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
				"unknown";
		}

		const pathname: string = new URL(request.url).pathname;

		const baseDir = resolve("public", "custom");
		const customPath = resolve(baseDir, pathname.slice(1));

		if (!customPath.startsWith(baseDir)) {
			response = new Response("Forbidden", { status: 403 });
			this.logRequest(extendedRequest, response, ip);
			return response;
		}

		const customFile = Bun.file(customPath);
		if (await customFile.exists()) {
			const content = await customFile.arrayBuffer();
			const type: string = customFile.type ?? "application/octet-stream";
			response = new Response(content, {
				headers: { "Content-Type": type },
			});
			this.logRequest(extendedRequest, response, ip);
			return response;
		}

		if (pathname.startsWith("/public") || pathname === "/favicon.ico") {
			return await this.serveStaticFile(extendedRequest, pathname, ip);
		}

		const match: MatchedRoute | null = this.router.match(request);
		let requestBody: unknown = null;

		if (match) {
			const { filePath, params, query } = match;

			try {
				const routeModule: RouteModule = await import(filePath);

				if (routeModule.routeDef.method === "websocket") {
					if (
						server.upgrade(request, { data: { routeModule, params, query } })
					) {
						return new Response("", { status: 101 });
					}
					response = new Response("WebSocket upgrade failed", { status: 400 });
					this.logRequest(extendedRequest, response, ip);
					return response;
				}
				const contentType: string | null = request.headers.get("Content-Type");
				const actualContentType: string | null = contentType
					? (contentType.split(";")[0]?.trim() ?? null)
					: null;

				if (
					routeModule.routeDef.needsBody === "json" &&
					actualContentType === "application/json"
				) {
					try {
						requestBody = (await request.json()) as Record<string, unknown>;
					} catch {
						requestBody = {};
					}
				} else if (
					routeModule.routeDef.needsBody === "multipart" &&
					actualContentType === "multipart/form-data"
				) {
					try {
						requestBody = (await request.formData()) as FormData;
					} catch {
						requestBody = new FormData();
					}
				} else if (
					routeModule.routeDef.needsBody === "urlencoded" &&
					actualContentType === "application/x-www-form-urlencoded"
				) {
					try {
						const formData = await request.formData();
						requestBody = Object.fromEntries(formData.entries()) as Record<
							string,
							string
						>;
					} catch {
						requestBody = {};
					}
				} else if (
					routeModule.routeDef.needsBody === "text" &&
					actualContentType?.startsWith("text/")
				) {
					try {
						requestBody = (await request.text()) as string;
					} catch {
						requestBody = "";
					}
				} else if (
					routeModule.routeDef.needsBody === "raw" ||
					routeModule.routeDef.needsBody === "buffer"
				) {
					try {
						requestBody = (await request.arrayBuffer()) as ArrayBuffer;
					} catch {
						requestBody = new ArrayBuffer(0);
					}
				} else if (routeModule.routeDef.needsBody === "blob") {
					try {
						requestBody = (await request.blob()) as Blob;
					} catch {
						requestBody = new Blob();
					}
				} else {
					if (routeModule.routeDef.needsBody === "json") {
						requestBody = {};
					} else if (routeModule.routeDef.needsBody === "multipart") {
						requestBody = new FormData();
					} else if (routeModule.routeDef.needsBody === "urlencoded") {
						requestBody = {};
					} else if (routeModule.routeDef.needsBody === "text") {
						requestBody = "";
					} else if (
						routeModule.routeDef.needsBody === "raw" ||
						routeModule.routeDef.needsBody === "buffer"
					) {
						requestBody = new ArrayBuffer(0);
					} else if (routeModule.routeDef.needsBody === "blob") {
						requestBody = new Blob();
					} else {
						requestBody = null;
					}
				}

				if (
					(Array.isArray(routeModule.routeDef.method) &&
						!routeModule.routeDef.method.includes(request.method)) ||
					(!Array.isArray(routeModule.routeDef.method) &&
						routeModule.routeDef.method !== request.method)
				) {
					response = Response.json(
						{
							success: false,
							code: 405,
							error: `Method ${request.method} Not Allowed, expected ${
								Array.isArray(routeModule.routeDef.method)
									? routeModule.routeDef.method.join(", ")
									: routeModule.routeDef.method
							}`,
						},
						{ status: 405 },
					);
				} else {
					const expectedContentType: string | string[] | null =
						routeModule.routeDef.accepts;

					let matchesAccepts: boolean;

					if (Array.isArray(expectedContentType)) {
						matchesAccepts =
							expectedContentType.includes("*/*") ||
							expectedContentType.includes(actualContentType || "");
					} else {
						matchesAccepts =
							expectedContentType === "*/*" ||
							actualContentType === expectedContentType;
					}

					if (!matchesAccepts) {
						response = Response.json(
							{
								success: false,
								code: 406,
								error: `Content-Type ${actualContentType} Not Acceptable, expected ${
									Array.isArray(expectedContentType)
										? expectedContentType.join(", ")
										: expectedContentType
								}`,
							},
							{ status: 406 },
						);
					} else {
						extendedRequest.params = params;
						extendedRequest.query = query;
						extendedRequest.requestBody = requestBody;

						response = await routeModule.handler(extendedRequest, server);

						if (routeModule.routeDef.returns !== "*/*") {
							response.headers.set(
								"Content-Type",
								routeModule.routeDef.returns,
							);
						}
					}
				}
			} catch (error: unknown) {
				echo.error({
					message: `Error handling route ${request.url}`,
					error: error,
				});

				response = Response.json(
					{
						success: false,
						code: 500,
						error: "Internal Server Error",
					},
					{ status: 500 },
				);
			}
		} else {
			const notFoundPath = resolve("public", "views", "404.html");
			const notFoundFile = Bun.file(notFoundPath);

			if (await notFoundFile.exists()) {
				const html = processTemplate(await notFoundFile.text());
				response = new Response(html, {
					status: HTTP_STATUS.NOT_FOUND,
					headers: { "Content-Type": CONTENT_TYPE.HTML },
				});
			} else {
				response = Response.json(
					{
						success: false,
						code: HTTP_STATUS.NOT_FOUND,
						error: "Not Found",
					},
					{ status: HTTP_STATUS.NOT_FOUND },
				);
			}
		}

		this.logRequest(extendedRequest, response, ip);
		return response;
	}
}

const serverHandler: ServerHandler = new ServerHandler(
	environment.port,
	environment.host,
);

export { serverHandler };
