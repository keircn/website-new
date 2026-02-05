interface Library {
	id: string;
	name: string;
	mediaType: string;
}

interface LibrariesResponse {
	libraries: Library[];
}

interface LibraryDetail {
	id: string;
	name: string;
	total: number;
}

interface AudiobookshelfUser {
	username?: string;
	isActive?: boolean;
	lastSeen?: string;
	createdAt?: string;
}

interface AudiobookshelfStats {
	totalTime: number;
	totalItems: number;
	totalBooks: number;
	libraries: LibraryDetail[];
	items: Record<string, unknown>;
	today: number;
	recentSessions: unknown[];
	mediaProgress: unknown[];
	user: AudiobookshelfUser;
}

interface TimezoneData {
	timezone: string;
	[key: string]: unknown;
}

interface ProjectInfo {
	name: string;
	description: string;
	url: string;
}

interface ProjectLinksData {
	projects: ProjectInfo[];
}

interface AniListDate {
	year: number | null;
	month: number | null;
	day: number | null;
}

interface AniListMedia {
	id: number;
	title: {
		romaji: string;
		english: string | null;
		native: string | null;
	};
	coverImage: {
		extraLarge: string;
		large: string;
		medium: string;
	};
	bannerImage: string | null;
	format: string;
	status: string;
	source: string | null;
	episodes: number | null;
	duration: number | null;
	season: string | null;
	seasonYear: number | null;
	averageScore: number | null;
	meanScore: number | null;
	genres: string[];
	description: string | null;
	studios: {
		nodes: Array<{ name: string }>;
	} | null;
	startDate: AniListDate | null;
	endDate: AniListDate | null;
	nextAiringEpisode: {
		airingAt: number;
		timeUntilAiring: number;
		episode: number;
	} | null;
	trailer: {
		id: string;
		site: string;
	} | null;
}

interface AniListEntry {
	id: number;
	mediaId: number;
	status: string;
	score: number;
	progress: number;
	startedAt: AniListDate;
	completedAt: AniListDate;
	updatedAt: number;
	media: AniListMedia;
}

interface AniListCharacter {
	id: number;
	name: {
		full: string;
		native: string | null;
		alternative: string[];
		alternativeSpoiler: string[];
	};
	image: {
		large: string;
		medium: string;
	};
	description: string | null;
	gender: string | null;
	age: string | null;
	dateOfBirth: AniListDate | null;
	bloodType: string | null;
	siteUrl: string;
}

interface AniListFollowing {
	id: number;
	name: string;
	avatar: {
		large: string;
		medium: string;
	};
	siteUrl: string;
	statistics: {
		anime: {
			count: number;
			episodesWatched: number;
			minutesWatched: number;
			meanScore: number;
		};
	};
}

interface AniListUser {
	id: number;
	name: string;
	avatar: {
		large: string;
		medium: string;
	};
	createdAt: number;
	statistics: {
		anime: {
			count: number;
			meanScore: number;
			standardDeviation: number;
			minutesWatched: number;
			episodesWatched: number;
			statuses: Array<{
				status: string;
				count: number;
			}>;
		};
	};
	favourites?: {
		characters?: {
			nodes: AniListCharacter[];
		};
	};
}

interface AniListActivity {
	id: number;
	type: "LIST" | "TEXT" | "MESSAGE";
	status: string | null;
	progress: string | null;
	createdAt: number;
	text: string | null;
	media: {
		id: number;
		title: {
			romaji: string;
			english: string | null;
		};
		coverImage: {
			medium: string;
		};
	} | null;
}

interface AniListData {
	user: AniListUser | null;
	watching: AniListEntry[];
	completed: AniListEntry[];
	onHold: AniListEntry[];
	dropped: AniListEntry[];
	planToWatch: AniListEntry[];
	favouriteCharacters: AniListCharacter[];
	following: AniListFollowing[];
	activities: AniListActivity[];
	statistics: {
		totalAnime: number;
		totalEpisodes: number;
		daysWatched: number;
		meanScore: number;
		watching: number;
		completed: number;
		onHold: number;
		dropped: number;
		planToWatch: number;
	};
}

interface NowPlayingTrack {
	name: string;
	artist: string;
	album: string | null;
	image: string | null;
	url: string;
}

interface NowPlayingData {
	isPlaying: boolean;
	track: NowPlayingTrack | null;
}

interface LastFmImage {
	"#text": string;
	size: string;
}

interface LastFmTrack {
	name: string;
	artist: {
		"#text": string;
		mbid?: string;
	};
	album?: {
		"#text": string;
		mbid?: string;
	};
	image?: LastFmImage[];
	url: string;
	"@attr"?: {
		nowplaying: string;
	};
}

interface LastFmResponse {
	recenttracks?: {
		track: LastFmTrack[];
	};
}

interface AudiobookListeningBook {
	id: string;
	title: string;
	author: string;
	cover: string;
	progress: number;
	currentTime: number;
	duration: number;
}

interface AudiobookListeningData {
	isListening: boolean;
	book: AudiobookListeningBook | null;
}

interface AudiobookshelfSession {
	id: string;
	userId: string;
	libraryItemId: string;
	displayTitle: string;
	displayAuthor: string;
	coverPath: string;
	duration: number;
	currentTime: number;
	progress: number;
	updatedAt: number;
}

interface AudiobookshelfSessionsResponse {
	sessions: AudiobookshelfSession[];
	total: number;
}
