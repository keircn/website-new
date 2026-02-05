import { echo } from "@atums/echo";
import { audiobookshelf } from "#environment";
import { normalizeUrl } from "#utils/url";
import { CachedService } from "./base-cache";

const POLL_INTERVAL = 30 * 1000;
const STALE_THRESHOLD = 2 * 60 * 1000;

class AudiobookshelfListeningService extends CachedService<AudiobookListeningData> {
	protected getServiceName(): string {
		return "Audiobookshelf listening";
	}

	protected override getCacheInterval(): number {
		return POLL_INTERVAL;
	}

	protected async fetchData(): Promise<AudiobookListeningData | null> {
		if (!audiobookshelf.url || !audiobookshelf.token) {
			return null;
		}

		try {
			const baseUrl = normalizeUrl(audiobookshelf.url);
			const headers = { Authorization: `Bearer ${audiobookshelf.token}` };

			const response = await fetch(`${baseUrl}/api/users/online`, {
				headers,
			});

			if (!response.ok) {
				echo.warn(`Audiobookshelf online users API error: ${response.status}`);
				return { isListening: false, book: null };
			}

			const data = await response.json();
			const sessions = data.openSessions || [];

			if (!Array.isArray(sessions) || sessions.length === 0) {
				return { isListening: false, book: null };
			}

			const activeSession = sessions[0];

			const updatedAt = activeSession.updatedAt || 0;
			const now = Date.now();
			if (now - updatedAt > STALE_THRESHOLD) {
				return { isListening: false, book: null };
			}

			const coverUrl = activeSession.libraryItemId
				? `${baseUrl}/api/items/${activeSession.libraryItemId}/cover`
				: null;

			const currentTime = activeSession.currentTime || 0;
			const duration = activeSession.duration || 0;
			const progress = duration > 0 ? currentTime / duration : 0;

			return {
				isListening: true,
				book: {
					id: activeSession.libraryItemId,
					title: activeSession.displayTitle || "Unknown Title",
					author: activeSession.displayAuthor || "Unknown Author",
					cover: coverUrl || "",
					progress,
					currentTime,
					duration,
				},
			};
		} catch (error) {
			echo.warn("Audiobookshelf listening request failed:", error);
			return { isListening: false, book: null };
		}
	}

	public override start(): void {
		if (!audiobookshelf.url || !audiobookshelf.token) {
			echo.warn("Audiobookshelf not configured, skipping listening cache");
			return;
		}
		super.start();
	}
}

const audiobookshelfListeningService = new AudiobookshelfListeningService();

export function getCachedListening(): AudiobookListeningData | null {
	return audiobookshelfListeningService.getCache();
}

export function startAudiobookshelfListeningCache(): void {
	audiobookshelfListeningService.start();
}
