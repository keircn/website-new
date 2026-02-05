class VideoBackground {
	constructor() {
		this.video = null;
		this.currentTheme = this.getCurrentTheme();
		this.init();
	}

	init() {
		this.createVideoElement();
		this.setupThemeListener();
		this.loadVideo();
	}

	createVideoElement() {
		this.video = document.createElement("video");
		this.video.className = "video-background";
		this.video.muted = true;
		this.video.loop = true;
		this.video.playsInline = true;
		this.video.setAttribute("aria-hidden", "true");
		document.body.appendChild(this.video);
	}

	getCurrentTheme() {
		return document.documentElement.getAttribute("data-theme") === "white"
			? "light"
			: "dark";
	}

	setupThemeListener() {
		const observer = new MutationObserver((mutations) => {
			mutations.forEach((mutation) => {
				if (mutation.attributeName === "data-theme") {
					const newTheme = this.getCurrentTheme();
					if (newTheme !== this.currentTheme) {
						this.currentTheme = newTheme;
						this.loadVideo();
					}
				}
			});
		});

		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["data-theme"],
		});
	}

	async loadVideo() {
		if (!this.video) return;

		const videoUrl = "/api/background-video";

		try {
			const response = await fetch(videoUrl);
			if (
				response.ok &&
				response.headers.get("content-type")?.includes("video")
			) {
				const blob = await response.blob();
				const videoObjectUrl = URL.createObjectURL(blob);

				this.video.src = videoObjectUrl;

				await this.video.play();
				this.video.classList.add("active");

				setTimeout(() => {
					URL.revokeObjectURL(videoObjectUrl);
				}, 1000);
			} else {
				this.hideVideo();
			}
		} catch {
			// Failed to load background video
			this.hideVideo();
		}
	}

	hideVideo() {
		if (this.video) {
			this.video.classList.remove("active");
			this.video.src = "";
		}
	}
}

if (typeof window !== "undefined") {
	document.addEventListener("DOMContentLoaded", () => {
		new VideoBackground();
	});
}
