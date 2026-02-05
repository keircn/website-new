let anilistData = null;
let anilistError = null;
const animeById = {};
let allCompletedAnime = [];
let animeCurrentPage = 1;
const ANIME_PER_PAGE = 30;
let activityData = [];

fetch("/api/anilist/stats")
	.then((response) => {
		if (!response.ok) throw new Error("Failed to fetch stats");
		return response.json();
	})
	.then((data) => {
		if (data.error) {
			anilistError = data.error;
			return;
		}
		anilistData = data;
		buildAnimeIndex(data);
	})
	.catch(() => {
		anilistError = "Failed to load anime stats";
	});

function buildAnimeIndex(data) {
	const allLists = [
		...(data.watching || []),
		...(data.completed || []),
		...(data.onHold || []),
		...(data.dropped || []),
		...(data.planToWatch || []),
	];

	for (const item of allLists) {
		animeById[item.media.id] = item;
	}
}

let anilistPollCount = 0;
const MAX_POLL_ATTEMPTS = 200;

function updateAniListStats() {
	const statsContainer = document.getElementById("anilist-stats");

	if (anilistError) {
		if (statsContainer) {
			statsContainer.style.display = "block";
			const errorDiv = document.createElement("div");
			errorDiv.className = "error-message";
			const title = document.createElement("h3");
			title.textContent = "unable to load anime stats";
			const message = document.createElement("p");
			message.textContent = anilistError;
			errorDiv.appendChild(title);
			errorDiv.appendChild(message);
			statsContainer.appendChild(errorDiv);
			statsContainer.style.opacity = "1";
		}
		return;
	}

	if (anilistData) {
		if (!statsContainer) return;
		statsContainer.style.display = "block";
		renderAniListStats(anilistData);
		createAnimeModal();
		setupAnimeClickHandlers();
		setTimeout(() => {
			statsContainer.style.opacity = "1";
		}, 10);
		return;
	}

	anilistPollCount++;
	if (anilistPollCount < MAX_POLL_ATTEMPTS) {
		setTimeout(updateAniListStats, 50);
	}
}

const entityDecoder = document.createElement("textarea");
function decodeEntities(text) {
	entityDecoder.innerHTML = text;
	return entityDecoder.value;
}

function getTitle(media) {
	return media.title.english || media.title.romaji || media.title.native;
}

function formatSeason(item) {
	if (item.media.season && item.media.seasonYear) {
		const season =
			item.media.season.charAt(0) + item.media.season.slice(1).toLowerCase();
		return `${season} ${item.media.seasonYear}`;
	}
	return null;
}

function formatMediaType(format) {
	const types = {
		TV: "TV",
		TV_SHORT: "TV Short",
		MOVIE: "Movie",
		SPECIAL: "Special",
		OVA: "OVA",
		ONA: "ONA",
		MUSIC: "Music",
	};
	return types[format] || format || "TV";
}

function formatActivityTime(timestamp) {
	const now = Date.now();
	const diff = now - timestamp * 1000;
	const minutes = Math.floor(diff / 60000);
	const hours = Math.floor(diff / 3600000);
	const days = Math.floor(diff / 86400000);

	if (minutes < 1) return "just now";
	if (minutes < 60) return `${minutes}m ago`;
	if (hours < 24) return `${hours}h ago`;
	if (days < 7) return `${days}d ago`;
	return new Date(timestamp * 1000).toLocaleDateString();
}

function formatActivityStatus(status) {
	const statusMap = {
		watched: "Watched",
		completed: "Completed",
		dropped: "Dropped",
		paused: "Paused",
		plans_to_watch: "Plans to watch",
		rewatched: "Rewatched",
	};
	return statusMap[status?.toLowerCase()] || status || "Updated";
}

function renderActivityItem(activity) {
	if (activity.type === "TEXT" && activity.text) {
		return `
			<div class="activity-item activity-text">
				<div class="activity-text-content">${activity.text}</div>
				<div class="activity-time">${formatActivityTime(activity.createdAt)}</div>
			</div>
		`;
	}

	if (activity.media) {
		const title =
			activity.media.title.english || activity.media.title.romaji || "Unknown";
		const statusText = formatActivityStatus(activity.status);
		const progressText = activity.progress ? ` ${activity.progress}` : "";

		return `
			<div class="activity-item activity-media" data-anime-id="${activity.media.id}">
				<div class="activity-cover">
					<img src="${activity.media.coverImage.medium}" alt="${title}" loading="lazy" onerror="this.style.display='none'">
				</div>
				<div class="activity-content">
					<div class="activity-status">${statusText}${progressText}</div>
					<div class="activity-title">${title}</div>
					<div class="activity-time">${formatActivityTime(activity.createdAt)}</div>
				</div>
			</div>
		`;
	}

	return "";
}

function createActivityModal() {
	if (document.getElementById("activity-modal-overlay")) return;

	const modalHTML = `
		<div id="activity-modal-overlay" class="activity-modal-overlay">
			<div class="activity-modal">
				<div class="activity-modal-header">
					<h3>recent activity</h3>
					<button class="activity-modal-close" onclick="closeActivityModal()">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M18 6L6 18M6 6l12 12"/>
						</svg>
					</button>
				</div>
				<div id="activity-list" class="activity-list"></div>
			</div>
		</div>
	`;

	document.body.insertAdjacentHTML("beforeend", modalHTML);

	const overlay = document.getElementById("activity-modal-overlay");
	overlay.addEventListener("click", (e) => {
		if (e.target === overlay) {
			closeActivityModal();
		}
	});

	document.addEventListener("keydown", (e) => {
		if (e.key === "Escape") {
			closeActivityModal();
		}
	});
}

function createActivityFab(count) {
	if (document.getElementById("activity-fab")) return;

	const fabHTML = `
		<button id="activity-fab" class="activity-fab" onclick="openActivityModal()">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
			</svg>
			${count > 0 ? `<span class="activity-fab-badge">${count}</span>` : ""}
		</button>
	`;

	document.body.insertAdjacentHTML("beforeend", fabHTML);
}

function openActivityModal() {
	const overlay = document.getElementById("activity-modal-overlay");
	const list = document.getElementById("activity-list");

	if (!overlay || !list) return;

	list.innerHTML = activityData.map((a) => renderActivityItem(a)).join("");

	list.querySelectorAll(".activity-item.activity-media").forEach((item) => {
		item.addEventListener("click", () => {
			const animeId = item.dataset.animeId;
			if (animeId) {
				closeActivityModal();
				showAnimeModal(Number.parseInt(animeId, 10));
			}
		});
	});

	overlay.classList.add("active");
	document.body.style.overflow = "hidden";
}

function closeActivityModal() {
	const overlay = document.getElementById("activity-modal-overlay");
	if (overlay) {
		overlay.classList.remove("active");
		document.body.style.overflow = "";
	}
}

window.openActivityModal = openActivityModal;
window.closeActivityModal = closeActivityModal;

function formatSource(source) {
	if (!source) return null;
	const sources = {
		ORIGINAL: "Original",
		MANGA: "Manga",
		LIGHT_NOVEL: "Light Novel",
		VISUAL_NOVEL: "Visual Novel",
		VIDEO_GAME: "Video Game",
		NOVEL: "Novel",
		DOUJINSHI: "Doujinshi",
		ANIME: "Anime",
		WEB_NOVEL: "Web Novel",
		LIVE_ACTION: "Live Action",
		GAME: "Game",
		COMIC: "Comic",
		MULTIMEDIA_PROJECT: "Multimedia Project",
		PICTURE_BOOK: "Picture Book",
		OTHER: "Other",
	};
	return sources[source] || source;
}

function formatAiringStatus(status) {
	const statuses = {
		FINISHED: "Finished",
		RELEASING: "Airing",
		NOT_YET_RELEASED: "Not Yet Aired",
		CANCELLED: "Cancelled",
		HIATUS: "On Hiatus",
	};
	return statuses[status] || status;
}

function formatTimeUntil(seconds) {
	const days = Math.floor(seconds / 86400);
	const hours = Math.floor((seconds % 86400) / 3600);
	if (days > 0) return `${days}d ${hours}h`;
	const mins = Math.floor((seconds % 3600) / 60);
	if (hours > 0) return `${hours}h ${mins}m`;
	return `${mins}m`;
}

function getTrailerUrl(trailer) {
	if (!trailer || !trailer.id) return null;
	if (trailer.site === "youtube")
		return `https://youtube.com/watch?v=${trailer.id}`;
	if (trailer.site === "dailymotion")
		return `https://dailymotion.com/video/${trailer.id}`;
	return null;
}

function getStudios(media) {
	if (!media.studios || !media.studios.nodes) return null;
	const names = media.studios.nodes.map((s) => s.name).filter(Boolean);
	return names.length > 0 ? names.join(", ") : null;
}

function renderAnimeGridItem(item, options = {}) {
	const {
		showScore = true,
		showDate = true,
		dateField = "startedAt",
	} = options;
	const season = formatSeason(item);
	const mediaType = formatMediaType(item.media.format);
	const title = getTitle(item.media);
	const date = showDate ? formatShortDate(item[dateField]) : null;

	return `
		<div class="anime-grid-item" data-anime-id="${item.media.id}" data-title="${title.toLowerCase()}">
			<div class="anime-grid-cover">
				${
					item.media.coverImage
						? `<img src="${item.media.coverImage.extraLarge || item.media.coverImage.large}" alt="${title}" loading="lazy" onerror="this.style.display='none'">`
						: ""
				}
				${showScore && item.score > 0 ? `<div class="anime-grid-score-badge"><span>★</span> ${item.score}</div>` : ""}
				${date ? `<div class="anime-grid-date-badge">${date}</div>` : ""}
			</div>
			<div class="anime-grid-info">
				<div class="anime-grid-title">${title}</div>
				<div class="anime-grid-meta">
					<span class="anime-grid-type">${mediaType}</span>
					${season ? `<span>${season}</span>` : ""}
				</div>
			</div>
		</div>
	`;
}

function formatDate(dateObj) {
	if (!dateObj || !dateObj.year) return null;
	const { year, month, day } = dateObj;
	if (month && day) {
		return new Date(year, month - 1, day).toLocaleDateString();
	}
	if (month) {
		return `${month}/${year}`;
	}
	return `${year}`;
}

function formatShortDate(dateObj) {
	if (!dateObj || !dateObj.year) return null;
	const { year, month, day } = dateObj;
	if (month && day) {
		return `${month}/${day}/${year.toString().slice(-2)}`;
	}
	if (month) {
		return `${month}/${year.toString().slice(-2)}`;
	}
	return `${year}`;
}

function createAnimeModal() {
	if (document.getElementById("anime-modal-overlay")) return;

	const modalHTML = `
		<div id="anime-modal-overlay" class="anime-modal-overlay">
			<div class="anime-modal">
				<div class="anime-modal-header">
					<div class="anime-modal-cover">
						<img id="modal-cover" src="" alt="">
					</div>
					<div class="anime-modal-info">
						<h3 id="modal-title" class="anime-modal-title"></h3>
						<div id="modal-meta" class="anime-modal-meta"></div>
						<div id="modal-score" class="anime-modal-score"></div>
						<div id="modal-details" class="anime-modal-details"></div>
						<div id="modal-dates" class="anime-modal-dates"></div>
						<div id="modal-genres" class="anime-modal-genres"></div>
					</div>
				</div>
				<div class="anime-modal-body">
					<div id="modal-airing" class="anime-modal-airing"></div>
					<p id="modal-synopsis" class="anime-modal-synopsis"></p>
				</div>
				<div class="anime-modal-footer">
					<a id="modal-anilist-link" href="" target="_blank" class="anime-modal-link">view on anilist</a>
					<a id="modal-trailer-link" href="" target="_blank" class="anime-modal-link anime-modal-trailer">trailer</a>
					<button class="anime-modal-close" onclick="closeAnimeModal()">close</button>
				</div>
			</div>
		</div>
	`;

	document.body.insertAdjacentHTML("beforeend", modalHTML);

	const overlay = document.getElementById("anime-modal-overlay");
	overlay.addEventListener("click", (e) => {
		if (e.target === overlay) {
			closeAnimeModal();
		}
	});

	document.addEventListener("keydown", (e) => {
		if (e.key === "Escape") {
			closeAnimeModal();
		}
	});
}

function showAnimeModal(animeId) {
	const anime = animeById[animeId];
	if (!anime) return;

	const overlay = document.getElementById("anime-modal-overlay");
	const coverImg = document.getElementById("modal-cover");
	const title = document.getElementById("modal-title");
	const meta = document.getElementById("modal-meta");
	const score = document.getElementById("modal-score");
	const details = document.getElementById("modal-details");
	const dates = document.getElementById("modal-dates");
	const genres = document.getElementById("modal-genres");
	const airing = document.getElementById("modal-airing");
	const synopsis = document.getElementById("modal-synopsis");
	const anilistLink = document.getElementById("modal-anilist-link");
	const trailerLink = document.getElementById("modal-trailer-link");

	const media = anime.media;

	if (media.coverImage) {
		coverImg.src = media.coverImage.extraLarge || media.coverImage.large;
		coverImg.alt = getTitle(media);
		coverImg.style.display = "block";
	} else {
		coverImg.style.display = "none";
	}

	title.textContent = getTitle(media);

	const mediaType = formatMediaType(media.format);
	const season = formatSeason(anime);
	const episodes = media.episodes ? `${media.episodes} eps` : null;
	const duration = media.duration ? `${media.duration} min` : null;
	const airingStatus = formatAiringStatus(media.status);

	const metaParts = [
		mediaType,
		airingStatus,
		season,
		episodes,
		duration,
	].filter(Boolean);
	meta.innerHTML = metaParts.map((part) => `<span>${part}</span>`).join("");

	const scoreRows = [];
	if (anime.score > 0) {
		scoreRows.push(
			`<span>★</span> ${anime.score} <span style="color: var(--text-secondary); font-size: var(--font-size-xs);">(your score)</span>`,
		);
	}
	if (media.averageScore) {
		const avg = (media.averageScore / 10).toFixed(1);
		if (anime.score > 0) {
			scoreRows[0] += ` <span style="color: var(--text-secondary); font-size: var(--font-size-xs);">· avg ${avg}</span>`;
		} else {
			scoreRows.push(
				`<span>★</span> ${avg} <span style="color: var(--text-secondary); font-size: var(--font-size-xs);">(average)</span>`,
			);
		}
	}
	score.innerHTML = scoreRows.join("");

	const detailParts = [];
	const studio = getStudios(media);
	if (studio) detailParts.push(`studio: ${studio}`);
	const source = formatSource(media.source);
	if (source) detailParts.push(`source: ${source}`);
	if (anime.progress > 0 && media.episodes) {
		detailParts.push(`progress: ${anime.progress} / ${media.episodes}`);
	} else if (anime.progress > 0) {
		detailParts.push(`progress: ${anime.progress} eps`);
	}
	details.innerHTML =
		detailParts.length > 0
			? detailParts.map((d) => `<span>${d}</span>`).join("")
			: "";

	const dateParts = [];
	const userStart = formatDate(anime.startedAt);
	const userEnd = formatDate(anime.completedAt);
	if (userStart) dateParts.push(`started: ${userStart}`);
	if (userEnd) dateParts.push(`finished: ${userEnd}`);
	const airStart = formatDate(media.startDate);
	const airEnd = formatDate(media.endDate);
	if (airStart)
		dateParts.push(`aired: ${airStart}${airEnd ? ` – ${airEnd}` : ""}`);
	dates.innerHTML =
		dateParts.length > 0
			? dateParts.map((d) => `<span>${d}</span>`).join("")
			: "";

	if (media.nextAiringEpisode) {
		const next = media.nextAiringEpisode;
		const timeStr = formatTimeUntil(next.timeUntilAiring);
		airing.innerHTML = `<span>episode ${next.episode} airing in ${timeStr}</span>`;
	} else {
		airing.innerHTML = "";
	}

	if (media.genres && media.genres.length > 0) {
		genres.innerHTML = media.genres
			.map(
				(genre) =>
					`<span class="anime-modal-genre">${genre.toLowerCase()}</span>`,
			)
			.join("");
	} else {
		genres.innerHTML = "";
	}

	synopsis.textContent = decodeEntities(
		(media.description || "")
			.replace(/<br\s*\/?>/gi, "\n")
			.replace(/<[^>]*>/g, ""),
	);

	anilistLink.href = `https://anilist.co/anime/${media.id}`;

	const trailerUrl = getTrailerUrl(media.trailer);
	if (trailerUrl) {
		trailerLink.href = trailerUrl;
		trailerLink.style.display = "";
	} else {
		trailerLink.style.display = "none";
	}

	overlay.classList.add("active");
	document.body.style.overflow = "hidden";
}

function closeAnimeModal() {
	const overlay = document.getElementById("anime-modal-overlay");
	if (overlay) {
		overlay.classList.remove("active");
		document.body.style.overflow = "";
	}
}

function showCharacterModal(characterId) {
	const char = (anilistData.favouriteCharacters || []).find(
		(c) => c.id === characterId,
	);
	if (!char) return;

	const overlay = document.getElementById("anime-modal-overlay");
	const coverImg = document.getElementById("modal-cover");
	const title = document.getElementById("modal-title");
	const meta = document.getElementById("modal-meta");
	const score = document.getElementById("modal-score");
	const details = document.getElementById("modal-details");
	const dates = document.getElementById("modal-dates");
	const genres = document.getElementById("modal-genres");
	const airing = document.getElementById("modal-airing");
	const synopsis = document.getElementById("modal-synopsis");
	const anilistLink = document.getElementById("modal-anilist-link");
	const trailerLink = document.getElementById("modal-trailer-link");

	if (char.image) {
		coverImg.src = char.image.large || char.image.medium;
		coverImg.alt = char.name.full;
		coverImg.style.display = "block";
	} else {
		coverImg.style.display = "none";
	}

	title.textContent = char.name.full;

	const altNames = [];
	if (char.name.native) altNames.push(char.name.native);
	if (char.name.alternative) {
		for (const name of char.name.alternative) {
			if (name) altNames.push(name);
		}
	}
	const spoilerNames = (char.name.alternativeSpoiler || []).filter(Boolean);

	let altHTML = "";
	if (altNames.length > 0 || spoilerNames.length > 0) {
		const nameSpans = altNames.join(", ");
		const spoilerSpans = spoilerNames
			.map(
				(name) =>
					`<span class="name-spoiler" onclick="this.classList.toggle('revealed')">${name}</span>`,
			)
			.join(", ");

		altHTML = nameSpans;
		if (spoilerSpans) {
			if (altHTML) altHTML += ", ";
			altHTML += spoilerSpans;
		}
	}
	meta.innerHTML = altHTML
		? `<span class="character-alt-names">${altHTML}</span>`
		: "";

	const charDetails = [];
	if (char.dateOfBirth && (char.dateOfBirth.month || char.dateOfBirth.day)) {
		const months = [
			"",
			"Jan",
			"Feb",
			"Mar",
			"Apr",
			"May",
			"Jun",
			"Jul",
			"Aug",
			"Sep",
			"Oct",
			"Nov",
			"Dec",
		];
		let birthday = "";
		if (char.dateOfBirth.month) birthday += months[char.dateOfBirth.month];
		if (char.dateOfBirth.day) birthday += ` ${char.dateOfBirth.day}`;
		if (char.dateOfBirth.year) birthday += `, ${char.dateOfBirth.year}`;
		charDetails.push(`birthday: ${birthday.trim()}`);
	}
	if (char.age) charDetails.push(`age: ${char.age}`);
	if (char.gender) charDetails.push(`gender: ${char.gender}`);
	if (char.bloodType) charDetails.push(`blood type: ${char.bloodType}`);

	score.innerHTML = "";
	details.innerHTML = "";
	airing.innerHTML = "";
	dates.innerHTML =
		charDetails.length > 0
			? charDetails.map((d) => `<span>${d}</span>`).join("")
			: "";
	genres.innerHTML = "";
	trailerLink.style.display = "none";

	const rawDesc = (char.description || "")
		.replace(/__(.+?)__/g, "$1")
		.replace(/\*\*(.+?)\*\*/g, "$1")
		.replace(/<br\s*\/?>/gi, "\n")
		.replace(/<[^>]*>/g, "")
		.replace(
			/^(Height|Weight|Birthday|Age|Gender|Blood Type|Bust|Waist|Hip|BWH|Measurements|Eye Color|Hair Color|Race|Species|Affiliation|Occupation|Rank|Status|VA|CV|Seiyuu|Source):?\s*[^\n]*\n?/gim,
			"",
		)
		.trim();

	synopsis.innerHTML = "";
	if (!rawDesc) {
		synopsis.textContent = "no description available";
	} else {
		const parts = rawDesc.split(/~!([\s\S]*?)!~/g);
		for (let i = 0; i < parts.length; i++) {
			const text = decodeEntities(parts[i].trim());
			if (!text) continue;
			if (i % 2 === 0) {
				synopsis.appendChild(document.createTextNode(text));
			} else {
				const spoiler = document.createElement("span");
				spoiler.className = "desc-spoiler";
				spoiler.textContent = text;
				spoiler.addEventListener("click", () => {
					spoiler.classList.toggle("revealed");
				});
				synopsis.appendChild(spoiler);
			}
		}
	}

	anilistLink.href = char.siteUrl || `https://anilist.co/character/${char.id}`;

	overlay.classList.add("active");
	document.body.style.overflow = "hidden";
}

function setupAnimeClickHandlers() {
	document
		.querySelectorAll(".anime-card, .anime-grid-item:not(.character-grid-item)")
		.forEach((card) => {
			card.addEventListener("click", () => {
				const animeId = card.dataset.animeId;
				if (animeId) {
					showAnimeModal(Number(animeId));
				}
			});
		});

	document.querySelectorAll(".character-grid-item").forEach((card) => {
		card.addEventListener("click", () => {
			const charId = card.dataset.characterId;
			if (charId) {
				showCharacterModal(Number(charId));
			}
		});
	});
}

function renderAniListStats(data) {
	const container = document.getElementById("anilist-stats");
	const stats = data.statistics;

	const statsHTML = `
		<div class="stats-bar">
			<div class="stats-bar-item">
				<span class="stats-bar-value">${Math.round(stats.daysWatched)}</span>
				<span class="stats-bar-label">days watched</span>
			</div>
			<div class="stats-bar-item">
				<span class="stats-bar-value">${stats.totalEpisodes.toLocaleString()}</span>
				<span class="stats-bar-label">episodes</span>
			</div>
			<div class="stats-bar-item">
				<span class="stats-bar-value">${(stats.meanScore / 10).toFixed(1)}</span>
				<span class="stats-bar-label">mean score</span>
			</div>
			<div class="stats-bar-item">
				<span class="stats-bar-value">${stats.totalAnime}</span>
				<span class="stats-bar-label">total</span>
			</div>
			<div class="stats-bar-item">
				<span class="stats-bar-value">${stats.completed}</span>
				<span class="stats-bar-label">completed</span>
			</div>
			<div class="stats-bar-item">
				<span class="stats-bar-value">${stats.watching}</span>
				<span class="stats-bar-label">watching</span>
			</div>
			<div class="stats-bar-item">
				<span class="stats-bar-value">${stats.onHold}</span>
				<span class="stats-bar-label">on hold</span>
			</div>
			<div class="stats-bar-item">
				<span class="stats-bar-value">${stats.dropped}</span>
				<span class="stats-bar-label">dropped</span>
			</div>
			<div class="stats-bar-item">
				<span class="stats-bar-value">${stats.planToWatch}</span>
				<span class="stats-bar-label">plan to watch</span>
			</div>
		</div>

		${
			data.favouriteCharacters && data.favouriteCharacters.length > 0
				? `
		<div class="all-anime">
			<div class="section-header">
				<h4>favourite characters</h4>
				<span class="section-count">(${data.favouriteCharacters.length})</span>
			</div>
			<div class="anime-grid">
				${data.favouriteCharacters
					.map(
						(char) => `
					<div class="anime-grid-item character-grid-item" data-character-id="${char.id}">
						<div class="anime-grid-cover">
							${char.image ? `<img src="${char.image.large || char.image.medium}" alt="${char.name.full}" loading="lazy" onerror="this.style.display='none'">` : ""}
						</div>
						<div class="anime-grid-info">
							<div class="anime-grid-title">${char.name.full}</div>
							${char.name.native ? `<div class="anime-grid-meta"><span>${char.name.native}</span></div>` : ""}
						</div>
					</div>
				`,
					)
					.join("")}
			</div>
		</div>
		`
				: ""
		}

		${
			data.watching.length > 0
				? `
		<div class="currently-watching">
			<div class="section-header">
				<h4>currently watching</h4>
				<span class="section-count">(${data.watching.length})</span>
			</div>
			<div class="anime-carousel">
				${data.watching
					.slice(0, 15)
					.map((item) => {
						const hasEpisodes = item.media.episodes != null;
						const progress = hasEpisodes
							? (item.progress / item.media.episodes) * 100
							: 0;
						const season = formatSeason(item);
						const mediaType = formatMediaType(item.media.format);
						const title = getTitle(item.media);
						const startDate = formatShortDate(item.startedAt);

						return `
					<div class="anime-card" data-anime-id="${item.media.id}">
						<div class="anime-card-cover">
							${
								item.media.coverImage
									? `<img src="${item.media.coverImage.extraLarge || item.media.coverImage.large}" alt="${title}" loading="lazy" onerror="this.style.display='none'">`
									: ""
							}
							${startDate ? `<div class="anime-card-date-badge">${startDate}</div>` : ""}
							<div class="anime-card-overlay">
								${hasEpisodes ? `<div class="anime-card-progress"><div class="anime-card-progress-fill" style="width: ${progress}%"></div></div>` : ""}
								<div class="anime-card-episodes">
									<span class="current">${item.progress}</span>${hasEpisodes ? ` / ${item.media.episodes}` : ""} episodes
								</div>
							</div>
						</div>
						<div class="anime-card-info">
							<div class="anime-card-title">${title}</div>
							<div class="anime-card-meta">
								<span class="anime-card-type">${mediaType}</span>
								${season ? `<span class="anime-card-season">${season}</span>` : ""}
								${item.media.averageScore ? `<span class="anime-card-score"><span class="star">★</span> ${(item.media.averageScore / 10).toFixed(1)}</span>` : ""}
							</div>
						</div>
					</div>
				`;
					})
					.join("")}
			</div>
		</div>
		`
				: ""
		}

		${
			data.completed.length > 0
				? `
		<div class="all-anime">
			<div class="section-header">
				<h4>completed</h4>
				<span class="section-count">(${data.completed.length})</span>
			</div>
			<div class="anime-search">
				<input type="text" id="anime-search-input" class="search-input" placeholder="search completed anime..." oninput="filterAnime()">
			</div>
			<div class="anime-grid" id="all-anime-grid"></div>
			<div class="pagination" id="anime-pagination"></div>
		</div>
		`
				: ""
		}

		${
			data.onHold && data.onHold.length > 0
				? `
		<div class="all-anime">
			<div class="section-header">
				<h4>on hold</h4>
				<span class="section-count">(${data.onHold.length})</span>
			</div>
			<div class="anime-grid">
				${data.onHold.map((item) => renderAnimeGridItem(item)).join("")}
			</div>
		</div>
		`
				: ""
		}

		${
			data.planToWatch && data.planToWatch.length > 0
				? `
		<div class="all-anime">
			<div class="section-header">
				<h4>plan to watch</h4>
				<span class="section-count">(${data.planToWatch.length})</span>
			</div>
			<div class="anime-grid">
				${data.planToWatch
					.slice(0, 30)
					.map((item) =>
						renderAnimeGridItem(item, { showScore: false, showDate: false }),
					)
					.join("")}
			</div>
		</div>
		`
				: ""
		}

		${
			data.dropped && data.dropped.length > 0
				? `
		<div class="all-anime">
			<div class="section-header">
				<h4>dropped</h4>
				<span class="section-count">(${data.dropped.length})</span>
			</div>
			<div class="anime-grid">
				${data.dropped.map((item) => renderAnimeGridItem(item)).join("")}
			</div>
		</div>
		`
				: ""
		}

		${
			data.following && data.following.length > 0
				? `
		<div class="all-anime">
			<div class="section-header">
				<h4>following</h4>
				<span class="section-count">(${data.following.length})</span>
			</div>
			<div class="following-grid">
				${data.following
					.map(
						(user) => `
					<a href="${user.siteUrl}" class="following-card" target="_blank" rel="noopener noreferrer">
						<div class="following-avatar">
							${user.avatar ? `<img src="${user.avatar.large || user.avatar.medium}" alt="${user.name}" loading="lazy" onerror="this.style.display='none'">` : ""}
						</div>
						<div class="following-info">
							<div class="following-name">${user.name}</div>
							<div class="following-stats">
								${user.statistics?.anime?.count ? `<span>${user.statistics.anime.count} anime</span>` : ""}
								${user.statistics?.anime?.meanScore ? `<span>★ ${(user.statistics.anime.meanScore / 10).toFixed(1)}</span>` : ""}
							</div>
						</div>
					</a>
				`,
					)
					.join("")}
			</div>
		</div>
		`
				: ""
		}

		${
			data.user
				? `
		<div class="user-profile-section">
			<div class="section-header">
				<h4>profile</h4>
			</div>
			<div class="profile-stats">
				<div class="profile-stat">
					<span class="profile-label">username</span>
					<span class="profile-value">${data.user.name}</span>
				</div>
				${
					data.user.createdAt
						? `
				<div class="profile-stat">
					<span class="profile-label">member since</span>
					<span class="profile-value">${new Date(data.user.createdAt * 1000).toLocaleDateString()}</span>
				</div>
				`
						: ""
				}
			</div>
		</div>
		`
				: ""
		}
	`;

	container.innerHTML = statsHTML;

	allCompletedAnime = data.completed;
	animeCurrentPage = 1;
	renderAnimePage();

	if (data.activities && data.activities.length > 0) {
		activityData = data.activities;
		createActivityModal();
		createActivityFab(data.activities.length);
	}
}

function renderAnimePage() {
	const grid = document.getElementById("all-anime-grid");
	const pagination = document.getElementById("anime-pagination");
	if (!grid) return;

	const totalPages = Math.ceil(allCompletedAnime.length / ANIME_PER_PAGE);
	const start = (animeCurrentPage - 1) * ANIME_PER_PAGE;
	const pageItems = allCompletedAnime.slice(start, start + ANIME_PER_PAGE);

	grid.innerHTML = pageItems
		.map((item) => renderAnimeGridItem(item, { dateField: "completedAt" }))
		.join("");

	if (pagination && totalPages > 1) {
		pagination.style.display = "";
		pagination.innerHTML = `
			<button class="pagination-btn" onclick="goToAnimePage(${animeCurrentPage - 1})" ${animeCurrentPage <= 1 ? "disabled" : ""}>prev</button>
			<span class="pagination-info">${animeCurrentPage} / ${totalPages}</span>
			<button class="pagination-btn" onclick="goToAnimePage(${animeCurrentPage + 1})" ${animeCurrentPage >= totalPages ? "disabled" : ""}>next</button>
		`;
	} else if (pagination) {
		pagination.style.display = "none";
	}
}

// biome-ignore lint/correctness/noUnusedVariables: Called from HTML onclick attribute
function goToAnimePage(page) {
	const totalPages = Math.ceil(allCompletedAnime.length / ANIME_PER_PAGE);
	if (page < 1 || page > totalPages) return;
	animeCurrentPage = page;
	renderAnimePage();

	const grid = document.getElementById("all-anime-grid");
	if (grid) {
		grid.scrollIntoView({ behavior: "smooth", block: "start" });
	}
}

// biome-ignore lint/correctness/noUnusedVariables: Used in HTML oninput attribute
function filterAnime() {
	const searchInput = document.getElementById("anime-search-input");
	const animeGrid = document.getElementById("all-anime-grid");
	const pagination = document.getElementById("anime-pagination");

	if (!searchInput || !animeGrid) return;

	const searchTerm = searchInput.value.toLowerCase();

	if (!searchTerm) {
		renderAnimePage();
		return;
	}

	const matched = allCompletedAnime.filter((item) => {
		const title = getTitle(item.media).toLowerCase();
		return title.includes(searchTerm);
	});

	animeGrid.innerHTML = matched
		.map((item) => renderAnimeGridItem(item, { dateField: "completedAt" }))
		.join("");

	if (pagination) {
		pagination.style.display = "none";
	}
}

window.closeAnimeModal = closeAnimeModal;

document.addEventListener("DOMContentLoaded", updateAniListStats);
