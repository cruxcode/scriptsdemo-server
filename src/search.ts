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
const PIPELINE_BASE = argv.pipeline || "/storage/proj/ss6146/cruxdemoserver";
const procs = argv.procs || 2;

export const search = (): Router => {
	const router = Router();
	router.post("/", express.json(), (req, res) => {
		const query = encodeURIComponent(req.body.query);
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
		const port = lang === "fa" ? 6000 : 5000;
		const request = http.request(
			{
				host: "localhost",
				port: port,
				method: "GET",
				path: `/search?q=${query}&source=${source}&size=${size}`,
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
						source,
						"output",
						"clir_output"
					);
					fs.writeFileSync(
						path.resolve(clir_output_path, clir_output_filename),
						result
					);
					console.log("clir result", result);
					// 4 - call summarizer
					const docker = spawn("docker", [
						"exec",
						`summ_${lang}_${source}`,
						`summarize_queries_demo`,
						`${clir_output_filename}`,
						`${procs}`,
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
					res.send({
						success: true,
						result,
						queryid: clir_output_filename,
					});
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

	router.get("/summary", async (req, res) => {
		const queryid = req.query.queryid as string;
		const filename = req.query.filename as string;
		const lang = req.query.lang as string;
		const source = req.query.source as string;
		// 1 - guards
		if (!queryid || !filename || !lang || !source) {
			res.status(400);
			res.send({
				success: false,
				msg: "queryid, lang, source and filename are required",
			});
			return;
		}
		const output_path = path.resolve(
			PIPELINE_BASE,
			lang,
			source,
			"output",
			"markup",
			queryid
		);
		try {
			const files = fs.readdirSync(output_path).filter((f) => {
				return f.indexOf(filename) >= 0;
			});
			if (files.length > 0) {
				res.send({
					success: true,
					file_ready: true,
					content: JSON.parse(
						fs
							.readFileSync(path.resolve(output_path, files[0]))
							.toString()
					),
				});
			} else {
				res.send({ success: true, files_ready: false });
			}
		} catch (err) {
			res.send({ success: true, files_ready: false });
		}
	});
	return router;
};
