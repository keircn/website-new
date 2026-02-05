import { MAX_POLL_ATTEMPTS, POLL_INTERVAL, UI } from "./utils/constants.js";

let timezoneData = null;
let timezoneError = null;
let timezoneUpdateInterval = null;

const isBrowserLocale24h = () =>
	!new Intl.DateTimeFormat(navigator.language, { hour: "numeric" })
		.format(0)
		.match(/AM/);

let is24HourFormat = localStorage.getItem("timezone24HourFormat")
	? localStorage.getItem("timezone24HourFormat") === "true"
	: isBrowserLocale24h();

fetch("/api/timezonedb")
	.then((response) => {
		if (!response.ok) {
			if (response.status === 503) {
				const timezoneSection = document.querySelector(".timezone-section");
				if (timezoneSection) {
					timezoneSection.style.display = "none";
				}
				return;
			}
			throw new Error("Failed to fetch timezone data");
		}
		return response.json();
	})
	.then((data) => {
		if (data?.error) {
			if (data.error === "TimezoneDB service unavailable") {
				const timezoneSection = document.querySelector(".timezone-section");
				if (timezoneSection) {
					timezoneSection.style.display = "none";
				}
				return;
			}
			timezoneError = "Timezone data unavailable";
			return;
		}
		if (data) {
			timezoneData = data;
		}
	})
	.catch(() => {
		timezoneError = "Failed to load timezone data";
	});

let timezonePollCount = 0;

function updateTimezoneInfo() {
	const timezoneContainer = document.getElementById("timezone-info");
	const timezoneSection = document.querySelector(".timezone-section");

	if (timezoneError || !timezoneContainer) {
		if (timezoneSection) {
			timezoneSection.style.display = "none";
		}
		return;
	}

	if (timezoneData) {
		renderTimezoneWithTime(timezoneData);

		setTimeout(() => {
			timezoneContainer.classList.add("loaded");
		}, 10);
		return;
	}

	timezonePollCount++;
	if (timezonePollCount < MAX_POLL_ATTEMPTS) {
		setTimeout(updateTimezoneInfo, POLL_INTERVAL);
	}
}

function renderTimezoneWithTime(data) {
	const container = document.getElementById("timezone-info");

	const realContentHTML = `
		<div class="timezone-info skeleton-loading">
			<div class="timezone-location">
				<span class="timezone-label skeleton-text skeleton-text-sm"></span>
				<span class="timezone-value skeleton-text skeleton-text-md"></span>
			</div>
			<div class="timezone-time">
				<span class="timezone-label skeleton-text skeleton-text-sm"></span>
				<span class="timezone-value skeleton-text skeleton-text-lg"></span>
			</div>
		</div>
		<div class="timezone-info">
			<div class="timezone-location">
				<span class="timezone-label">timezone:</span>
				<span class="timezone-value">${data.timezone}</span>
			</div>
			<div class="timezone-time" onclick="toggleTimeFormat()">
				<span class="timezone-label">current time:</span>
				<span class="timezone-value" id="current-time">--:--</span>
			</div>
		</div>
	`;
	container.innerHTML = realContentHTML;

	updateCurrentTime();
	if (timezoneUpdateInterval) {
		clearInterval(timezoneUpdateInterval);
	}
	timezoneUpdateInterval = setInterval(
		updateCurrentTime,
		UI.TIMEZONE_UPDATE_INTERVAL,
	);
}

function updateCurrentTime() {
	if (!timezoneData) return;

	const now = new Date();
	let timeString;

	if (is24HourFormat) {
		timeString = now.toLocaleTimeString("en-GB", {
			timeZone: timezoneData.timezone,
			hour12: false,
			hour: "2-digit",
			minute: "2-digit",
		});
	} else {
		timeString = now.toLocaleTimeString("en-US", {
			timeZone: timezoneData.timezone,
			hour12: true,
			hour: "numeric",
			minute: "2-digit",
		});
	}

	const timeElement = document.getElementById("current-time");
	if (timeElement) {
		timeElement.textContent = timeString;
	}
}

function toggleTimeFormat() {
	is24HourFormat = !is24HourFormat;
	localStorage.setItem("timezone24HourFormat", is24HourFormat.toString());
	updateCurrentTime();
}

window.toggleTimeFormat = toggleTimeFormat;

document.addEventListener("DOMContentLoaded", updateTimezoneInfo);
