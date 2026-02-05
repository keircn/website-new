import { echo } from "@atums/echo";
import { timezoneDB } from "#environment";
import { normalizeUrl } from "#utils/url";
import { CachedService } from "./base-cache";

class TimezoneService extends CachedService<TimezoneData> {
	protected async fetchData(): Promise<TimezoneData | null> {
		if (!timezoneDB.url || !timezoneDB.id) {
			return null;
		}

		try {
			const baseUrl = normalizeUrl(timezoneDB.url);
			const apiUrl = `${baseUrl}/get?id=${encodeURIComponent(timezoneDB.id)}`;

			const response = await fetch(apiUrl);

			if (!response.ok) {
				echo.warn(`TimezoneDB API error: ${response.status}`);
				return null;
			}

			return await response.json();
		} catch (error) {
			echo.warn("TimezoneDB request failed:", error);
			return null;
		}
	}

	protected getServiceName(): string {
		return "timezone data";
	}

	public override start(): void {
		if (!timezoneDB.url || !timezoneDB.id) {
			echo.warn("TimezoneDB not configured, skipping cache");
			return;
		}
		super.start();
	}
}

const timezoneService = new TimezoneService();

export function getCachedTimezone(): TimezoneData | null {
	return timezoneService.getCache();
}

export function startTimezoneCache(): void {
	timezoneService.start();
}
