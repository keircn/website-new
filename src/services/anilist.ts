import { echo } from "@atums/echo";
import { aniList } from "#environment";
import { CachedService } from "./base-cache";

const ANILIST_API = "https://graphql.anilist.co";

const USER_QUERY = `
query ($username: String) {
  User(name: $username) {
    id
    name
    avatar {
      large
      medium
    }
    createdAt
    statistics {
      anime {
        count
        meanScore
        standardDeviation
        minutesWatched
        episodesWatched
        statuses {
          status
          count
        }
      }
    }
    favourites {
      characters(page: 1, perPage: 25) {
        nodes {
          id
          name {
            full
            native
            alternative
            alternativeSpoiler
          }
          image {
            large
            medium
          }
          description
          gender
          age
          dateOfBirth {
            year
            month
            day
          }
          bloodType
          siteUrl
        }
      }
    }
  }
}
`;

const FOLLOWING_QUERY = `
query ($userId: Int!, $page: Int) {
  Page(page: $page, perPage: 25) {
    following(userId: $userId, sort: USERNAME) {
      id
      name
      avatar {
        large
        medium
      }
      siteUrl
      statistics {
        anime {
          count
          episodesWatched
          minutesWatched
          meanScore
        }
      }
    }
  }
}
`;

const ANIME_LIST_QUERY = `
query ($username: String, $status: MediaListStatus) {
  MediaListCollection(userName: $username, type: ANIME, status: $status, sort: UPDATED_TIME_DESC) {
    lists {
      entries {
        id
        mediaId
        status
        score
        progress
        startedAt {
          year
          month
          day
        }
        completedAt {
          year
          month
          day
        }
        updatedAt
        media {
          id
          title {
            romaji
            english
            native
          }
          coverImage {
            extraLarge
            large
            medium
          }
          bannerImage
          format
          status
          source
          episodes
          duration
          season
          seasonYear
          averageScore
          meanScore
          genres
          description(asHtml: false)
          studios(isMain: true) {
            nodes {
              name
            }
          }
          startDate {
            year
            month
            day
          }
          endDate {
            year
            month
            day
          }
          nextAiringEpisode {
            airingAt
            timeUntilAiring
            episode
          }
          trailer {
            id
            site
          }
        }
      }
    }
  }
}
`;

const ACTIVITY_QUERY = `
query ($userId: Int, $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    activities(userId: $userId, sort: ID_DESC) {
      ... on ListActivity {
        id
        status
        progress
        createdAt
        media {
          id
          title {
            romaji
            english
          }
          coverImage {
            medium
          }
        }
      }
      ... on TextActivity {
        id
        text
        createdAt
      }
    }
  }
}
`;

async function graphqlRequest<T>(
	query: string,
	variables: Record<string, unknown>,
): Promise<T | null> {
	try {
		const response = await fetch(ANILIST_API, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
			},
			body: JSON.stringify({ query, variables }),
		});

		if (!response.ok) {
			echo.warn(`AniList API error: ${response.status}`);
			return null;
		}

		const json = (await response.json()) as { data: T; errors?: unknown[] };

		if (json.errors) {
			echo.warn("AniList GraphQL errors:", json.errors);
			return null;
		}

		return json.data;
	} catch (error) {
		echo.warn("AniList request failed:", error);
		return null;
	}
}

class AniListService extends CachedService<AniListData> {
	protected async fetchData(): Promise<AniListData | null> {
		if (!aniList.username) {
			return null;
		}

		try {
			const [userResult, watching, completed, onHold, dropped, planToWatch] =
				await Promise.all([
					graphqlRequest<{ User: AniListUser }>(USER_QUERY, {
						username: aniList.username,
					}),
					this.fetchList("CURRENT"),
					this.fetchList("COMPLETED"),
					this.fetchList("PAUSED"),
					this.fetchList("DROPPED"),
					this.fetchList("PLANNING"),
				]);

			const user = userResult?.User || null;
			const stats = user?.statistics?.anime;
			const favouriteCharacters = user?.favourites?.characters?.nodes || [];

			let following: AniListFollowing[] = [];
			let activities: AniListActivity[] = [];
			if (user?.id) {
				[following, activities] = await Promise.all([
					this.fetchFollowing(user.id),
					this.fetchActivity(user.id),
				]);
			}

			return {
				user,
				watching,
				completed,
				onHold,
				dropped,
				planToWatch,
				favouriteCharacters,
				following,
				activities,
				statistics: {
					totalAnime: stats?.count || 0,
					totalEpisodes: stats?.episodesWatched || 0,
					daysWatched: Math.round((stats?.minutesWatched || 0) / 1440),
					meanScore: stats?.meanScore || 0,
					watching: watching.length,
					completed: completed.length,
					onHold: onHold.length,
					dropped: dropped.length,
					planToWatch: planToWatch.length,
				},
			};
		} catch (error) {
			echo.error("Failed to fetch AniList data:", error);
			return null;
		}
	}

	private async fetchList(status: string): Promise<AniListEntry[]> {
		const result = await graphqlRequest<{
			MediaListCollection: {
				lists: Array<{ entries: AniListEntry[] }>;
			};
		}>(ANIME_LIST_QUERY, {
			username: aniList.username,
			status,
		});

		if (!result?.MediaListCollection?.lists) {
			return [];
		}

		return result.MediaListCollection.lists
			.flatMap((list) => list.entries || [])
			.filter((entry) => entry.status === status);
	}

	private async fetchFollowing(userId: number): Promise<AniListFollowing[]> {
		const result = await graphqlRequest<{
			Page: {
				following: AniListFollowing[];
			};
		}>(FOLLOWING_QUERY, { userId, page: 1 });

		return result?.Page?.following || [];
	}

	private async fetchActivity(userId: number): Promise<AniListActivity[]> {
		const result = await graphqlRequest<{
			Page: {
				activities: Array<{
					id: number;
					status?: string;
					progress?: string;
					text?: string;
					createdAt: number;
					media?: {
						id: number;
						title: { romaji: string; english: string | null };
						coverImage: { medium: string };
					};
				}>;
			};
		}>(ACTIVITY_QUERY, { userId, page: 1, perPage: 15 });

		if (!result?.Page?.activities) {
			return [];
		}

		return result.Page.activities.map((activity) => ({
			id: activity.id,
			type: activity.media ? "LIST" : "TEXT",
			status: activity.status || null,
			progress: activity.progress || null,
			createdAt: activity.createdAt,
			text: activity.text || null,
			media: activity.media || null,
		})) as AniListActivity[];
	}

	protected getServiceName(): string {
		return "AniList";
	}

	protected logCacheSuccess(): void {
		if (this.cache) {
			echo.debug(
				`AniList cached successfully (${this.cache.statistics.totalAnime} anime, ${this.cache.statistics.watching} watching)`,
			);
		}
	}

	public override start(): void {
		if (!aniList.username) {
			echo.warn("AniList username not configured, skipping cache");
			return;
		}
		super.start();
	}
}

const aniListService = new AniListService();

export function getCachedAniList(): AniListData | null {
	return aniListService.getCache();
}

export function startAniListCache(): void {
	aniListService.start();
}
