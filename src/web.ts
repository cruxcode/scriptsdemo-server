import express, { Router } from "express";
import path from "path";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
const argv = yargs(hideBin(process.argv)).argv as any;

export const web = (): Router => {
	const router = Router();
	const WEB_BASE = argv.web || "/storage/proj/ss6146/cruxdemoserver";
	router.use(
		express.static(path.resolve(WEB_BASE, "scriptsdemo-web", "dist"))
	);
	router.get("/", (req, res) => {
		res.sendFile(
			path.resolve(WEB_BASE, "scriptsdemo-web", "dist", "index.html")
		);
	});
	return router;
};
