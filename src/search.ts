import express, { Router } from "express";
import http from "http";

export const search = (): Router => {
	const router = Router();
	router.post("/", express.json(), (req, res) => {
		const query = req.body.query;
		const source = req.body.source;
		const size = req.body.size;

		// 1 - guards
		if (!query || !source || !size) {
			res.status(400);
			res.send({ success: false, msg: "query is required" });
			return;
		}

		// 2 - call clir
		const request = http.request(
			{
				host: "localhost",
				port: 5000,
				method: "GET",
				path: encodeURI(
					`/search?q=${query}&source=${source}&size=${size}`
				),
			},
			(response) => {
				let chunks: Buffer[] = [];
				response.on("data", (chunk) => {
					chunks.push(Buffer.from(chunk));
				});
				response.on("end", () => {
					const result = chunks.join();
					res.send({ success: true, result });
					// 3 - write response to a file

					// 4 - call summarizer

					// 5 - wait for atleast one summary

					// 6 - send res
				});
				response.on("error", (err) => {
					console.log(err);
					res.status(501);
					res.send({ success: false, msg: "failed to get response" });
				});
			}
		);

		request.on("error", (err) => {
			console.log(err);
			res.send({ success: false, msg: "request to clir errored out" });
		});

		request.on("finish", () => {
			console.log("request finished");
		});

		request.end();
	});
	return router;
};
