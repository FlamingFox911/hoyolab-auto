const config = {
	data: [
		// "account_cookie_1",
		// "account_cookie_2",
		// ... more account cookies
	]
};

const DISCORD_WEBHOOK = null; // Replace with your Discord webhook URL if you want to send notifications
const DEFAULT_CONSTANTS = {
	ACT_ID: "e202303301540311",
	successMessage: "You have successfully checked in today, Trailblazer~",
	signedMessage: "You've already checked in today, Trailblazer~",
	assets: {
		author: "PomPom",
		game: "Honkai: Star Rail"
	},
	url: {
		info: "https://sg-public-api.hoyolab.com/event/luna/os/info",
		home: "https://sg-public-api.hoyolab.com/event/luna/os/home",
		sign: "https://sg-public-api.hoyolab.com/event/luna/os/sign"
	}
};

/**
 * Class representing the Honkai: Star Rail game for daily check-in.
 */
class StarRail {
	/**
     * Create a StarRail object.
     * @param {Object} config - The configuration object for the Star Rail check-in.
     * @param {string} config.id - The HoyoLab ID.
     * @param {Account[]} config.data - An array of Honkai: Star Rail account objects.
     * @param {Object} [config.config=DEFAULT_CONSTANTS] - Custom constants to override defaults.
     */
	constructor (config) {
		this.name = "starrail";
		this.fullName = "Honkai: Star Rail";
		this.id = config.id;
		this.data = config.data || [];
		this.config = { ...DEFAULT_CONSTANTS, ...config.config };

		if (this.data.length === 0) {
			throw new Error("No Star Rail accounts provided");
		}
	}

	/**
   * Performs the daily check-in for Honkai: Star Rail accounts.
   * @returns {Promise<SuccessObject[]>} - A promise that resolves to an array of successful check-in objects.
   */
	async checkAndExecute () {
		const accounts = this.data;
		if (accounts.length === 0) {
			console.warn("No active accounts found for Honkai: Star Rail");
			return [];
		}

		const success = [];
		for (const cookie of accounts) { // Iterate through account cookies
			try {
				const info = await this.getSignInfo(cookie);
				if (!info.success) {
					continue;
				}

				const awardsData = await this.getAwardsData(cookie);
				if (!awardsData.success) {
					continue;
				}

				const awards = awardsData.data;
				const data = {
					total: info.data.total,
					today: info.data.today,
					isSigned: info.data.isSigned
				};

				if (data.isSigned) {
					console.info(`${this.fullName}:CheckIn`, `Already signed in today`);
					continue;
				}

				const totalSigned = data.total;
				const awardObject = {
					name: awards[totalSigned].name,
					count: awards[totalSigned].cnt,
					icon: awards[totalSigned].icon
				};

				const sign = await this.sign(cookie);
				if (!sign.success) {
					continue;
				}

				console.info(`${this.fullName}:CheckIn`, `Today's Reward: ${awardObject.name} x${awardObject.count}`);

				success.push({
					platform: this.name,
					total: data.total + 1,
					result: this.config.successMessage,
					assets: {
						...this.config.assets
					},
					award: awardObject
				});
			}
			catch (e) {
				console.error(`${this.fullName}:CheckIn`, e);
			}
		}

		return success;
	}

	/**
   * Performs the sign-in request.
   * @param {string} cookieData - The MiHoYo account cookie.
   * @returns {Promise<{ success: boolean }>} - A promise that resolves to an object indicating the success of the sign-in.
   */
	async sign (cookieData) {
		try {
			const payload = { act_id: this.config.ACT_ID };
			const options = {
				method: "POST",
				contentType: "application/json",
				headers: {
					"User-Agent": this.userAgent,
					Cookie: cookieData
				},
				payload: JSON.stringify(payload)
			};

			const response = UrlFetchApp.fetch(this.config.url.sign, options);
			const data = JSON.parse(response.getContentText());
			if (response.getResponseCode() !== 200) {
				console.log(`${this.name}`, {
					message: "Failed to sign in",
					args: {
						status: response.getResponseCode(),
						body: data
					}
				});
				return { success: false };
			}
			if (data.retcode !== 0) {
				console.log(`${this.name}`, {
					message: "Failed to sign in",
					args: {
						status: data.retcode,
						body: data
					}
				});
				return { success: false };
			}
			return { success: true };
		}
		catch (e) {
			console.error(`${this.name}:sign`, `Error signing in: ${e.message}`);
			return { success: false };
		}
	}

	/**
   * Retrieves sign-in information.
   * @param {string} cookieData - The MiHoYo account cookie.
   * @returns {Promise<{ success: boolean, data: SignInfo }>} - A promise that resolves to an object containing sign-in information.
   */
	async getSignInfo (cookieData) {
		try {
			const url = `${this.config.url.info}?act_id=${this.config.ACT_ID}`;
			const response = await UrlFetchApp.fetch(url, { headers: { Cookie: cookieData } });
			const data = JSON.parse(response.getContentText());

			if (response.getResponseCode() !== 200) {
				console.log(`${this.fullName}`, {
					message: "Failed to get sign info",
					args: { status: response.getResponseCode(), body: data }
				});
				return { success: false };
			}
			if (data.retcode !== 0) {
				console.log(`${this.fullName}`, {
					message: "Info returned non-zero retcode",
					args: { status: data.retcode, body: data }
				});
				return { success: false };
			}
			return {
				success: true,
				data: {
					total: data.data.total_sign_day,
					today: data.data.today,
					isSigned: data.data.is_sign
				}
			};
		}
		catch (e) {
			console.error(`${this.fullName}:getSignInfo`, `Error getting sign info: ${e.message}`);
			return { success: false };
		}
	}

	/**
   * Retrieves the awards data.
   * @param {string} cookieData - The MiHoYo account cookie.
   * @returns {Promise<{ success: boolean, data: any[] }>} - A promise that resolves to an object containing awards data.
   */
	async getAwardsData (cookieData) {
		try {
			const url = `${this.config.url.home}?act_id=${this.config.ACT_ID}`;
			const response = await UrlFetchApp.fetch(url, { headers: { Cookie: cookieData } });
			const data = JSON.parse(response.getContentText());
			if (response.getResponseCode() !== 200) {
				console.log(`${this.fullName}`, {
					message: "Failed to get awards data",
					args: { status: response.getResponseCode(), body: data }
				});
				return { success: false };
			}
			if (data.retcode !== 0) {
				console.log(`${this.fullName}`, {
					message: "Failed to get awards data",
					args: { status: data.retcode, body: data }
				});
				return { success: false };
			}
			if (data.data.awards.length === 0) {
				throw new Error("No awards data available (?)");
			}
			return { success: true, data: data.data.awards };
		}
		catch (e) {
			console.error(
				`${this.fullName}:getAwardsData`,
				`Error getting awards data: ${e.message}`
			);
			return { success: false };
		}
	}

	get userAgent () {
		return "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36";
	}
}

function checkInHonkaiStarRail () {
	const starRail = new StarRail(config);
	starRail
		.checkAndExecute()
		.then((successes) => {
			console.log("Successful check-ins:", successes);
			// Send Discord notification if webhook is configured
			if (DISCORD_WEBHOOK) {
				for (const success of successes) {
					const embed = {
						color: 16748258, // Example color, customize as needed
						title: "Honkai: Star Rail Daily Check-In",
						author: {
							name: "PomPom",
							icon_url: "https://fastcdn.hoyoverse.com/static-resource-v2/2024/04/12/74330de1ee71ada37bbba7b72775c9d3_1883015313866544428.png"
						},
						description: `Today's Reward: ${success.award.name} x${success.award.count}`
                        + `\nTotal Check-Ins: ${success.total}`,
						thumbnail: {
							url: success.award.icon
						},
						timestamp: new Date(),
						footer: {
							text: "Honkai: Star Rail Daily Check-In"
						}
					};

					UrlFetchApp.fetch(DISCORD_WEBHOOK, {
						method: "POST",
						contentType: "application/json",
						payload: JSON.stringify({
							embeds: [embed],
							username: "PomPom",
							avatar_url: "https://fastcdn.hoyoverse.com/static-resource-v2/2024/04/12/74330de1ee71ada37bbba7b72775c9d3_1883015313866544428.png"
						})
					});
				}
			}
		})
		.catch((e) => {
			console.error("An error occurred:", e);
		});
}