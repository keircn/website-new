type Environment = {
	port: number;
	host: string;
	development: boolean;
};

type Audiobookshelf = {
	url: string | null;
	token: string | null;
	libraryIds: string[];
};

type TimezoneDB = {
	url: string | null;
	id: string | null;
};

type GitLab = {
	instanceUrl: string | null;
	token: string | null;
};

type SiteImages = {
	profilePicture: {
		light: null;
		dark: string | null;
	};
	background: {
		light: null;
		dark: string | null;
	};
	backgroundVideo: {
		light: null;
		dark: string | null;
	};
};

type ProjectLink = {
	url: string;
};

type AniList = {
	username: string | null;
};

type LastFm = {
	apiKey: string | null;
	username: string | null;
};

type Offen = {
	scriptUrl: string | null;
	accountId: string | null;
};

type Site = {
	name: string;
};
