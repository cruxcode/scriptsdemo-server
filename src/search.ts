import express, { Router } from "express";
import http from "http";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import path from "path";
import fs from "fs";
import { uuid } from "uuidv4";
import { spawn } from "child_process";

const argv = yargs(hideBin(process.argv)).argv as any;
const CLIR_OUTPUT_BASE = argv.clir || "/storage/proj/ss6146/cruxdemoserver";
const procs = argv.procs || 2;

export const search = (): Router => {
	const router = Router();
	router.post("/", express.json(), (req, res) => {
		const query = req.body.query;
		const source = req.body.source;
		const size = req.body.size;
		const lang = req.body.lang;
		// 1 - guards
		if (!query || !source || !size || !lang) {
			res.status(400);
			res.send({
				success: false,
				msg: "query, source, size, lang are required",
			});
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
					// 3 - write response to a file
					const clir_output_filename = uuid() + ".json";
					const clir_output_path = path.resolve(
						CLIR_OUTPUT_BASE,
						lang,
						source
					);
					fs.writeFileSync(
						path.resolve(clir_output_path, clir_output_filename),
						result
					);
					// 4 - call summarizer
					const docker = spawn("docker", [
						`exec summ_${lang}_${source} summarize_queries_demo ${clir_output_filename} ${procs}`,
					]);
					docker.stdout.on("data", (data) => {
						console.log(`stdout: ${data}`);
					});

					docker.stderr.on("data", (data) => {
						console.log(`stderr: ${data}`);
					});

					docker.on("error", (error) => {
						console.log(`error: ${error.message}`);
					});

					docker.on("close", (code) => {
						console.log(`child process exited with code ${code}`);
					});
					// 5 - wait for atleast one summary

					// 6 - send res
					res.send({ success: true, result, clir_output_filename });
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
