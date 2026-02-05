import { CACHE_CONTROL, CONTENT_TYPE } from "#constants";
import { getCachedBackgroundVideo } from "#services/profile-picture";
import { handleCachedBinaryResponse } from "#utils/route-handlers";

const routeDef: RouteDef = {
	method: "GET",
	accepts: "*/*",
	returns: CONTENT_TYPE.MP4,
};

async function handler(request: ExtendedRequest): Promise<Response> {
	const cachedVideoBuffer = getCachedBackgroundVideo("dark");
	return handleCachedBinaryResponse(
		cachedVideoBuffer,
		"Background video",
		CONTENT_TYPE.MP4,
		CACHE_CONTROL.ONE_HOUR,
	);
}

export { handler, routeDef };
