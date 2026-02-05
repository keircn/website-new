import { resolve } from "node:path";
import { CONTENT_TYPE } from "#constants";
import { getCachedNowPlaying } from "#services/lastfm";
import { processTemplate } from "#utils/template";

const routeDef: RouteDef = {
	method: "GET",
	accepts: "*/*",
	returns: CONTENT_TYPE.HTML,
};

function getServiceUrl(service: string, track: string, artist: string): string {
	const query = encodeURIComponent(`${track} ${artist}`);
	switch (service) {
		case "lastfm":
			return `https://www.last.fm/music/${encodeURIComponent(artist)}/_/${encodeURIComponent(track)}`;
		case "tidal":
			return `https://tidal.com/search?q=${query}`;
		case "spotify":
			return `https://open.spotify.com/search/${query}`;
		default:
			return "";
	}
}

async function handler(): Promise<Response> {
	const templatePath = resolve("public", "views", "index.html");
	const file = Bun.file(templatePath);

	if (!(await file.exists())) {
		return new Response("Template not found", { status: 404 });
	}

	let html = await file.text();

	const nowPlaying = getCachedNowPlaying();
	if (nowPlaying?.isPlaying && nowPlaying.track) {
		const track = nowPlaying.track;
		html = html.replace(
			'class="now-playing" id="now-playing"',
			'class="now-playing visible" id="now-playing"',
		);
		if (track.image) {
			html = html.replace(
				'src="/public/assets/default-album.svg"',
				`src="${track.image}"`,
			);
		}
		html = html.replace(
			'<span class="now-playing-track"></span>',
			`<span class="now-playing-track">${track.name}</span>`,
		);
		html = html.replace(
			'<span class="now-playing-artist"></span>',
			`<span class="now-playing-artist">${track.artist}</span>`,
		);
		html = html.replace(
			'data-service="lastfm" href=""',
			`data-service="lastfm" href="${getServiceUrl("lastfm", track.name, track.artist)}"`,
		);
		html = html.replace(
			'data-service="tidal" href=""',
			`data-service="tidal" href="${getServiceUrl("tidal", track.name, track.artist)}"`,
		);
		html = html.replace(
			'data-service="spotify" href=""',
			`data-service="spotify" href="${getServiceUrl("spotify", track.name, track.artist)}"`,
		);
	}

	return new Response(processTemplate(html), {
		headers: { "Content-Type": CONTENT_TYPE.HTML },
	});
}

export { handler, routeDef };
