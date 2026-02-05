import { CACHE_CONTROL, CONTENT_TYPE } from "#constants";
import { getCachedProfilePicture } from "#services/profile-picture";
import { handleCachedBinaryResponse } from "#utils/route-handlers";

const routeDef: RouteDef = {
	method: "GET",
	accepts: "*/*",
	returns: CONTENT_TYPE.PNG,
};

async function handler(request: ExtendedRequest): Promise<Response> {
	const cachedImageBuffer = getCachedProfilePicture("dark");
	return handleCachedBinaryResponse(
		cachedImageBuffer,
		"Profile picture",
		CONTENT_TYPE.PNG,
		CACHE_CONTROL.ONE_HOUR,
	);
}

export { handler, routeDef };
