import express from "express";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import { search } from "./search";
import { doc } from "./doc";
import { web } from "./web";

const app = express();
const argv = yargs(hideBin(process.argv)).argv as any;
const port = argv.port || 8080;

app.use((req, res, next) => {
	console.log("req arrived");
	next();
});
app.use("/search", search());
app.use("/doc", doc());
app.use("/", web());

app.listen(port, "0.0.0.0", () => {
	console.log("server listening on port", port);
});
