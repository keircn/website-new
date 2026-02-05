(() => {
	const STORAGE_KEY = "theme-mode";
	const POSITION_KEY = "theme-toggle-position";
	const POSITIONS = ["bottom-right", "bottom-left", "top-right"];
	const MODES = ["website", "system", "light", "dark"];
	const TITLES = {
		website: "website mode (sun-based)",
		system: "system mode",
		light: "light mode",
		dark: "dark mode",
	};

	const calculateSunTimes = (lat, date) => {
		const rad = Math.PI / 180;
		const dayOfYear = Math.floor(
			(date - new Date(date.getFullYear(), 0, 0)) / 86400000,
		);

		const decl = -23.45 * Math.cos(rad * (360 / 365) * (dayOfYear + 10));

		const hourAngle =
			Math.acos(
				Math.cos(rad * 90.833) / (Math.cos(rad * lat) * Math.cos(rad * decl)) -
					Math.tan(rad * lat) * Math.tan(rad * decl),
			) / rad;

		const sunrise = 12 - hourAngle / 15;
		const sunset = 12 + hourAngle / 15;

		return { sunrise, sunset };
	};

	const estimateLatitude = () => {
		const timezoneOffset = new Date().getTimezoneOffset() / 60;
		if (timezoneOffset >= -2 && timezoneOffset <= 3) return 50;
		if (timezoneOffset >= -10 && timezoneOffset <= -5) return 40;
		if (timezoneOffset >= 4 && timezoneOffset <= 8) return 35;
		return 45;
	};

	const getWebsiteTheme = () => {
		const now = new Date();
		const currentHour = now.getHours() + now.getMinutes() / 60;
		const lat = estimateLatitude();
		const { sunrise, sunset } = calculateSunTimes(lat, now);
		return currentHour >= sunrise && currentHour < sunset;
	};

	const getSystemTheme = () => {
		return !window.matchMedia("(prefers-color-scheme: dark)").matches;
	};

	const resolveTheme = (mode) => {
		switch (mode) {
			case "light":
				return true;
			case "dark":
				return false;
			case "system":
				return getSystemTheme();
			default:
				return getWebsiteTheme();
		}
	};

	const applyTheme = () => {
		document.documentElement.setAttribute("data-theme", "dark");

		const meta = document.querySelector('meta[name="color-scheme"]');
		if (meta) {
			meta.setAttribute("content", "dark");
		}

		const updateImages = () => {
			const pfp = document.querySelector(".hero-pfp");
			if (pfp) {
				pfp.src = "/api/pfp";
			}
		};

		if (document.readyState === "loading") {
			document.addEventListener("DOMContentLoaded", updateImages);
		} else {
			updateImages();
		}
	};

	const getMode = () => {
		return "dark";
	};

	const updateToggleButton = (mode) => {
		const btn = document.getElementById("theme-toggle");
		if (!btn) return;

		const isDaytime = resolveTheme(mode);
		btn.setAttribute("data-mode", mode);
		btn.setAttribute("data-theme", isDaytime ? "light" : "dark");
		btn.setAttribute("title", TITLES[mode]);
	};

	const getPosition = () => {
		return localStorage.getItem(POSITION_KEY) || POSITIONS[0];
	};

	const cyclePosition = () => {
		const current = getPosition();
		const available = POSITIONS.filter((p) => p !== current);
		const newPosition = available[Math.floor(Math.random() * available.length)];
		localStorage.setItem(POSITION_KEY, newPosition);
		return newPosition;
	};

	const cycleMode = () => {
		const current = getMode();
		const currentIndex = MODES.indexOf(current);
		const nextIndex = (currentIndex + 1) % MODES.length;
		const newMode = MODES[nextIndex];
		localStorage.setItem(STORAGE_KEY, newMode);

		const isDaytime = resolveTheme(newMode);
		applyTheme(isDaytime);
		updateToggleButton(newMode);

		const btn = document.getElementById("theme-toggle");
		if (btn) {
			btn.setAttribute("data-position", cyclePosition());
		}
	};

	const createToggleButton = () => {
		const mode = getMode();
		const isDaytime = resolveTheme(mode);

		const btn = document.createElement("button");
		btn.id = "theme-toggle";
		btn.className = "theme-toggle";
		btn.setAttribute("aria-label", "Toggle theme");
		btn.setAttribute("data-mode", mode);
		btn.setAttribute("data-theme", isDaytime ? "light" : "dark");
		btn.setAttribute("data-position", getPosition());
		btn.setAttribute("title", TITLES[mode]);
		btn.innerHTML = `
			<svg class="theme-toggle-sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
			<svg class="theme-toggle-moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
			<svg class="theme-toggle-system" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><path d="M8 21h8M12 17v4"/></svg>
			<svg class="theme-toggle-website" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
		`;
		btn.addEventListener("click", cycleMode);
		document.body.appendChild(btn);
	};

	applyTheme();

	window
		.matchMedia("(prefers-color-scheme: dark)")
		.addEventListener("change", () => {
			if (getMode() === "system") {
				applyTheme(resolveTheme("system"));
				updateToggleButton("system");
			}
		});

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", createToggleButton);
	} else {
		createToggleButton();
	}
})();
