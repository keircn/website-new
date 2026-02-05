import { resolve } from "node:path";
import { file } from "bun";
import { CONTENT_TYPE, ERROR_MESSAGES, HTTP_STATUS } from "#constants";
import { processTemplate } from "#utils/template";

export function createHTMLRouteHandler(filename: string) {
	return async (): Promise<Response> => {
		const path = resolve("public", "views", filename);
		const bunFile = file(path);

		if (!(await bunFile.exists())) {
			return new Response(`${filename} ${ERROR_MESSAGES.NOT_FOUND}`, {
				status: HTTP_STATUS.NOT_FOUND,
				headers: { "Content-Type": CONTENT_TYPE.HTML },
			});
		}

		const html = processTemplate(await bunFile.text());
		return new Response(html, {
			headers: { "Content-Type": CONTENT_TYPE.HTML },
		});
	};
}

export function handleCachedJSONResponse<T>(
	data: T | null,
	serviceName: string,
): Response {
	if (!data) {
		return Response.json(
			{ error: `${serviceName} ${ERROR_MESSAGES.NOT_AVAILABLE}` },
			{ status: HTTP_STATUS.SERVICE_UNAVAILABLE },
		);
	}

	return Response.json(data);
}

export function handleCachedBinaryResponse(
	data: ArrayBuffer | null,
	serviceName: string,
	contentType: string,
	cacheControl?: string,
): Response {
	if (!data) {
		return new Response(`${serviceName} ${ERROR_MESSAGES.NOT_AVAILABLE}`, {
			status: HTTP_STATUS.SERVICE_UNAVAILABLE,
			headers: { "Content-Type": CONTENT_TYPE.PLAIN },
		});
	}

	const headers: Record<string, string> = {
		"Content-Type": contentType,
	};

	if (cacheControl) {
		headers["Cache-Control"] = cacheControl;
	}

	return new Response(data, { headers });
}
