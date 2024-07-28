exports.fetch = async () => {
	const timeoutDuration = 5 * 60 * 1000; // 5 minutes

	const startTime = Date.now();
	const res = await app.Got("FakeAgent", {
		url: "https://www.pcgamesn.com/zenless-zone-zero/codes",
		responseType: "text",
		throwHttpErrors: false,
		timeout: {
			request: timeoutDuration,
			response: timeoutDuration,
			connect: timeoutDuration
		}
	});
	const endTime = Date.now();

	if (res.statusCode !== 200) {
		app.Logger.log("PCGamesN", {
			message: "Failed to fetch data from PCGamesN.",
			statusCode: res.statusCode
		});

		return [];
	} else {
		const elapsedTime = endTime - startTime;
		if (elapsedTime > 30 * 1000) { // 30 seconds (from Gots global)
			app.Logger.warn("PCGamesN", "Fetch successful, but exceeded 30 seconds. Actual time (in seconds): " + (elapsedTime / 1000));
		}
	}

	const $ = app.Utils.cheerio(res.body);
	const codeList = $("div.entry-content > ul:nth-child(8)").text().split("\n")
		.map(line => line.trim())
		.filter(line => line);

	const data = [];
	const numberWords = {
		k: 1000
	};

	for (const item of codeList) {
		const [codePart, rewardsPart] = item.split(" – ");
		if (!codePart || !rewardsPart) {
			continue;
		}

		const code = codePart.split(" or ")[0];

		let formattedRewardsPart = rewardsPart.replace(/\s*\(NEW\)/gi, "");
		for (const [word, num] of Object.entries(numberWords)) {
			const regex = new RegExp(`\\b${word}\\b`, "gi");
			formattedRewardsPart = formattedRewardsPart.replace(regex, num);
		}

		const rewards = formattedRewardsPart
			.split(/,\s+|\s+and\s+/)
			.map(reward => reward.replace(/(\d+)k/gi, (match, p1) => parseInt(p1) * 1000));

		data.push({ code, rewards });
	}

	app.Logger.debug("PCGamesN", {
		message: `Found ${data.length} rewards.`,
		data
	});

	return data;
};
