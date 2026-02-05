import { echo } from "@atums/echo";
import { gitlab, projectLinks, site } from "#environment";
import { normalizeUrl } from "#utils/url";
import { CachedService } from "./base-cache";

const PLATFORMS = {
	github: {
		name: "GitHub",
		getApiUrl: (owner: string, repo: string) =>
			`https://api.github.com/repos/${owner}/${repo}`,
		getHeaders: () => ({
			Accept: "application/vnd.github.v3+json",
			"User-Agent": site.name,
		}),
	},
	codeberg: {
		name: "Codeberg",
		getApiUrl: (owner: string, repo: string) =>
			`https://codeberg.org/api/v1/repos/${owner}/${repo}`,
		getHeaders: () => ({
			Accept: "application/json",
			"User-Agent": site.name,
		}),
	},
};

class ProjectLinksService extends CachedService<ProjectLinksData> {
	protected async fetchData(): Promise<ProjectLinksData | null> {
		const projects: ProjectInfo[] = [];

		for (const link of projectLinks) {
			try {
				const info = await this.fetchProjectInfo(link.url);
				if (info) {
					projects.push(info);
				}
			} catch (error) {
				echo.warn(`Failed to fetch project info for ${link.url}:`, error);
			}
		}

		return { projects };
	}

	private async fetchProjectInfo(url: string): Promise<ProjectInfo | null> {
		const githubMatch = url.match(/github\.com\/([^/]+)\/([^/]+)/);
		if (githubMatch?.[1] && githubMatch?.[2]) {
			return this.fetchFromPlatform(
				"github",
				githubMatch[1],
				githubMatch[2].replace(/\.git$/, ""),
				url,
			);
		}

		const codebergMatch = url.match(/codeberg\.org\/([^/]+)\/([^/]+)/);
		if (codebergMatch?.[1] && codebergMatch?.[2]) {
			return this.fetchFromPlatform(
				"codeberg",
				codebergMatch[1],
				codebergMatch[2].replace(/\.git$/, ""),
				url,
			);
		}

		if (gitlab.instanceUrl && gitlab.token) {
			const gitlabMatch = url.match(/([^/]+)\/([^/]+)\/([^/]+)\/?$/);
			if (gitlabMatch?.[2] && gitlabMatch[3]) {
				const host = new URL(url).host;
				const normalizedInstanceUrl = normalizeUrl(gitlab.instanceUrl);
				const gitlabHost = new URL(normalizedInstanceUrl).host;
				if (host === gitlabHost) {
					return this.fetchGitLabProject(
						gitlabMatch[2],
						gitlabMatch[3].replace(/\.git$/, ""),
						url,
					);
				}
			}
		}

		echo.warn(`Unsupported project URL format: ${url}`);
		return null;
	}

	private async fetchFromPlatform(
		platform: "github" | "codeberg",
		owner: string,
		repo: string,
		originalUrl: string,
	): Promise<ProjectInfo | null> {
		const config = PLATFORMS[platform];
		const apiUrl = config.getApiUrl(owner, repo);

		try {
			const response = await fetch(apiUrl, { headers: config.getHeaders() });

			if (!response.ok) {
				echo.warn(
					`${config.name} API error for ${owner}/${repo}: ${response.status}`,
				);
				return null;
			}

			const data = (await response.json()) as {
				name: string;
				description: string | null;
				html_url: string;
			};

			return {
				name: data.name,
				description: data.description || "",
				url: data.html_url || originalUrl,
			};
		} catch (error) {
			echo.warn(`${config.name} request failed for ${owner}/${repo}:`, error);
			return null;
		}
	}

	private async fetchGitLabProject(
		namespace: string,
		project: string,
		originalUrl: string,
	): Promise<ProjectInfo | null> {
		if (!gitlab.instanceUrl || !gitlab.token) {
			return null;
		}

		try {
			const baseUrl = normalizeUrl(gitlab.instanceUrl);
			const projectPath = encodeURIComponent(`${namespace}/${project}`);
			const apiUrl = `${baseUrl}/api/v4/projects/${projectPath}`;

			const response = await fetch(apiUrl, {
				headers: { "PRIVATE-TOKEN": gitlab.token },
			});

			if (!response.ok) {
				echo.warn(
					`GitLab API error for ${namespace}/${project}: ${response.status}`,
				);
				return null;
			}

			const data = (await response.json()) as {
				name: string;
				description: string | null;
				web_url: string;
			};

			return {
				name: data.name,
				description: data.description || "",
				url: data.web_url || originalUrl,
			};
		} catch (error) {
			echo.warn(`GitLab request failed for ${namespace}/${project}:`, error);
			return null;
		}
	}

	protected getServiceName(): string {
		return "Project links";
	}

	protected logCacheSuccess(): void {
		if (this.cache) {
			echo.debug(
				`Project links cached successfully (${this.cache.projects.length} projects)`,
			);
		}
	}
}

const projectLinksService = new ProjectLinksService();

export function getCachedProjectLinks(): ProjectLinksData | null {
	return projectLinksService.getCache();
}

export function startProjectLinksCache(): void {
	projectLinksService.start();
}
