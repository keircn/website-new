import { offen, site } from "#environment";

export function processTemplate(html: string): string {
	let result = html;

	result = result.replace(/\{\{SITE_NAME\}\}/g, site.name);

	if (offen.scriptUrl && offen.accountId) {
		result = result
			.replace("{{OFFEN_SCRIPT_URL}}", offen.scriptUrl)
			.replace("{{OFFEN_ACCOUNT_ID}}", offen.accountId);
	} else {
		result = result.replace(
			/<script\s+async\s+src="\{\{OFFEN_SCRIPT_URL\}\}"\s+data-account-id="\{\{OFFEN_ACCOUNT_ID\}\}"[^>]*><\/script>/g,
			"",
		);
	}

	return result;
}
