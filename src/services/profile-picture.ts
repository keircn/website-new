import { echo } from "@atums/echo";
import { siteImages } from "#environment";
import { CachedService } from "./base-cache";

type ThemeImages = {
	light: ArrayBuffer | null;
	dark: ArrayBuffer | null;
};

type ImageConfig = {
	light: string | null;
	dark: string | null;
};

class ImageCacheService extends CachedService<ThemeImages> {
	constructor(
		private serviceName: string,
		private getConfig: () => ImageConfig,
	) {
		super();
	}

	protected async fetchData(): Promise<ThemeImages | null> {
		const config = this.getConfig();
		const result: ThemeImages = { light: null, dark: null };

		for (const theme of ["light", "dark"] as const) {
			if (config[theme]) {
				try {
					const response = await fetch(config[theme]);
					if (response.ok) {
						result[theme] = await response.arrayBuffer();
					}
				} catch (error) {
					echo.warn(`Failed to fetch ${theme} ${this.serviceName}: ${error}`);
				}
			}
		}

		if (!result.light && !result.dark) {
			return null;
		}

		return result;
	}

	protected getServiceName(): string {
		return this.serviceName;
	}

	protected logCacheSuccess(): void {
		if (this.cache) {
			const lightSize = this.cache.light
				? (this.cache.light.byteLength / 1024).toFixed(2)
				: "0";
			const darkSize = this.cache.dark
				? (this.cache.dark.byteLength / 1024).toFixed(2)
				: "0";
			echo.debug(
				`${this.serviceName} cached (light: ${lightSize} KB, dark: ${darkSize} KB)`,
			);
		}
	}
}

const profilePictureService = new ImageCacheService(
	"profile picture",
	() => siteImages.profilePicture,
);
const backgroundImageService = new ImageCacheService(
	"background image",
	() => siteImages.background,
);
const backgroundVideoService = new ImageCacheService(
	"background video",
	() => siteImages.backgroundVideo,
);

export function getCachedProfilePicture(
	theme: "light" | "dark",
): ArrayBuffer | null {
	const cache = profilePictureService.getCache();
	if (!cache) return null;
	return cache[theme];
}

export function getCachedBackgroundImage(
	theme: "light" | "dark",
): ArrayBuffer | null {
	const cache = backgroundImageService.getCache();
	if (!cache) return null;
	return cache[theme];
}

export function getCachedBackgroundVideo(
	theme: "light" | "dark",
): ArrayBuffer | null {
	const cache = backgroundVideoService.getCache();
	if (!cache) return null;
	return cache[theme] || cache.light || cache.dark;
}

export function startImageCaches(): void {
	profilePictureService.start();
	backgroundImageService.start();
	backgroundVideoService.start();
}
