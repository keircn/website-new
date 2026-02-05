import { resolve } from "node:path";
import { CONTENT_TYPE } from "#constants";
import { getCachedProjectLinks } from "#services/project-links";
import { processTemplate } from "#utils/template";

const routeDef: RouteDef = {
	method: "GET",
	accepts: "*/*",
	returns: CONTENT_TYPE.HTML,
};

function getIconForUrl(url: string): string {
	if (url.includes("github.com")) {
		return `<svg width="32" height="32" viewBox="0 0 128 128" fill="currentColor">
			<path fill-rule="evenodd" clip-rule="evenodd" d="M64 5.103c-33.347 0-60.388 27.035-60.388 60.388 0 26.682 17.303 49.317 41.297 57.303 3.017.56 4.125-1.31 4.125-2.905 0-1.44-.056-6.197-.082-11.243-16.8 3.653-20.345-7.125-20.345-7.125-2.747-6.98-6.705-8.836-6.705-8.836-5.48-3.748.413-3.67.413-3.67 6.063.425 9.257 6.223 9.257 6.223 5.386 9.23 14.127 6.562 17.573 5.02.542-3.903 2.107-6.568 3.834-8.076-13.413-1.525-27.514-6.704-27.514-29.843 0-6.593 2.36-11.98 6.223-16.21-.628-1.52-2.695-7.662.584-15.98 0 0 5.07-1.623 16.61 6.19C53.7 35 58.867 34.327 64 34.304c5.13.023 10.3.694 15.127 2.033 11.526-7.813 16.59-6.19 16.59-6.19 3.287 8.317 1.22 14.46.593 15.98 3.872 4.23 6.215 9.617 6.215 16.21 0 23.194-14.127 28.3-27.574 29.796 2.167 1.874 4.097 5.55 4.097 11.183 0 8.08-.07 14.583-.07 16.572 0 1.607 1.088 3.49 4.148 2.897 23.98-7.994 41.263-30.622 41.263-57.294C124.388 32.14 97.35 5.104 64 5.104z"/>
			<path d="M26.484 91.806c-.133.3-.605.39-1.035.185-.44-.196-.685-.605-.543-.906.13-.31.603-.395 1.04-.188.44.197.69.61.537.91zm2.446 2.729c-.287.267-.85.143-1.232-.28-.396-.42-.47-.983-.177-1.254.298-.266.844-.14 1.24.28.394.426.472.984.17 1.255zM31.312 98.012c-.37.258-.976.017-1.35-.52-.37-.538-.37-1.183.01-1.44.373-.258.97-.025 1.35.507.368.545.368 1.19-.01 1.452zm3.261 3.361c-.33.365-1.036.267-1.552-.23-.527-.487-.674-1.18-.343-1.544.336-.366 1.045-.264 1.564.23.527.486.686 1.18.333 1.543zm4.5 1.951c-.147.473-.825.688-1.51.486-.683-.207-1.13-.76-.99-1.238.14-.477.823-.7 1.512-.485.683.206 1.13.756.988 1.237zm4.943.361c.017.498-.563.91-1.28.92-.723.017-1.308-.387-1.315-.877 0-.503.568-.91 1.29-.924.717-.013 1.306.387 1.306.88zm4.598-.782c.086.485-.413.984-1.126 1.117-.7.13-1.35-.172-1.44-.653-.086-.498.422-.997 1.122-1.126.714-.123 1.354.17 1.444.663zm0 0"/>
		</svg>`;
	}
	if (url.includes("codeberg.org")) {
		return `<svg width="32" height="32" viewBox="0 0 512 512" fill="none">
			<defs>
				<linearGradient id="codeberg-grad" x1="259.804" x2="383.132" y1="161.4" y2="407.835" gradientUnits="userSpaceOnUse">
					<stop offset="0" stop-color="#ffffff" stop-opacity="0"/>
					<stop offset=".5" stop-color="#71c2ff"/>
					<stop offset="1" stop-color="#39aaff"/>
				</linearGradient>
			</defs>
			<path fill="url(#codeberg-grad)" d="M259.804 161.4c-.44 0-1.1 0-1.32.44l-.44 1.1L332.04 440.21a192.039 192.039 0 0 0 86.77-74.437L261.125 162.06a1.762 1.762 0 0 0-1.321-.661z" opacity=".5"/>
			<path fill="#2185d0" d="M255.3 71.8a192 192 0 0 0-162 294l160.1-207c.5-.6 1.5-1 2.6-1s2 .4 2.6 1l160 207a192 192 0 0 0 29.4-102c0-106-86-192-192-192a192 192 0 0 0-.7 0z"/>
		</svg>`;
	}
	if (url.includes("gitlab") || url.includes("heliopolis")) {
		return `<svg width="32" height="32" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="none">
			<path fill="#FC6D26" d="M14.975 8.904L14.19 6.55l-1.552-4.67a.268.268 0 00-.255-.18.268.268 0 00-.254.18l-1.552 4.667H5.422L3.87 1.879a.267.267 0 00-.254-.179.267.267 0 00-.254.18l-1.55 4.667-.784 2.357a.515.515 0 00.193.583l6.78 4.812 6.778-4.812a.516.516 0 00.196-.583z"/>
			<path fill="#E24329" d="M8 14.296l2.578-7.75H5.423L8 14.296z"/>
			<path fill="#FC6D26" d="M8 14.296l-2.579-7.75H1.813L8 14.296z"/>
		</svg>`;
	}
	if (url.includes("npm")) {
		return `<svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
			<path d="M0 7.334v8h6.666v1.332H12v-1.332h12v-8H0zm6.666 6.664H5.334v-4H3.999v4H1.335V8.667h5.331v5.331zm4 0v1.336H8.001V8.667h5.334v5.332h-2.669v-.001zm12.001 0h-1.33v-4h-1.336v4h-1.335v-4h-1.33v4h-2.671V8.667h8.002v5.331zM10.665 10H12v2.667h-1.335V10z"/>
		</svg>`;
	}
	return `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
		<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
		<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
	</svg>`;
}

function getDisplayPath(url: string): string {
	try {
		const parsed = new URL(url);
		const path = parsed.pathname
			.replace(/^\//, "")
			.replace(/\/$/, "")
			.replace(/\.git$/, "");
		return path || parsed.host;
	} catch {
		return url;
	}
}

async function handler(): Promise<Response> {
	const templatePath = resolve("public", "views", "projects.html");
	const file = Bun.file(templatePath);

	if (!(await file.exists())) {
		return new Response("Template not found", { status: 404 });
	}

	let html = await file.text();

	const cachedData = getCachedProjectLinks();
	const projects = cachedData?.projects || [];

	const projectsHtml = projects
		.map(
			(project) => `
		<a href="${project.url}" class="contact-link large project-link" target="_blank" rel="noopener noreferrer">
			${getIconForUrl(project.url)}
			<div class="contact-text">
				<span>${project.name}</span>
				${project.description ? `<small class="project-description">${project.description}</small>` : ""}
			</div>
			<small class="contact-url">${getDisplayPath(project.url)}</small>
		</a>
	`,
		)
		.join("\n");

	html = html.replace(
		'<div class="full-page-contacts" id="projects-list"></div>',
		`<div class="full-page-contacts" id="projects-list">${projectsHtml}</div>`,
	);

	return new Response(processTemplate(html), {
		headers: { "Content-Type": CONTENT_TYPE.HTML },
	});
}

export { handler, routeDef };
