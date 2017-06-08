"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("./logger");
const compilerOptions_1 = require("./compilerOptions");
const program = require("commander");
const Promise = require("bluebird");
const fs_1 = require("fs");
const path_1 = require("path");
const BANNER = "Web Audio Markdown Language Compiler";
function getCompilerPath() {
    try {
        const globalPath = require.resolve("waml-compiler");
        logger_1.debug("Using globally installed waml-compiler");
        return globalPath;
    }
    catch (error) {
        const path = `${__dirname}/../../waml-compiler/dist`;
        logger_1.debug(`Trying to use development compiler in ${path}`);
        if (!fs_1.existsSync(path)) {
            errorHandler(new Error("Cannot find waml-compiler. Is it installed?"));
        }
        return path;
    }
}
function getCompilerEntryPoint() {
    const compilerPath = getCompilerPath();
    return require(compilerPath).compile;
}
function getCompilerVersion() {
    const compilerPath = getCompilerPath();
    const pkg = require(path_1.join(compilerPath, "..", "package.json"));
    return `${BANNER} (v${pkg.version})`;
}
function readFromStream(stream) {
    return new Promise((resolve, reject) => {
        const data = [];
        stream.resume();
        stream.setEncoding("utf-8");
        stream.on("data", (chunk) => {
            data.push(chunk);
        });
        stream.on("end", () => {
            return resolve(data.join(""));
        });
        stream.on("error", reject);
    });
}
function readFromFile(filename) {
    return new Promise((resolve, reject) => {
        fs_1.readFile(filename, (err, data) => {
            if (err) {
                return reject(err);
            }
            resolve(data.toString("utf-8"));
        });
    });
}
function errorHandler(err) {
    logger_1.error("Compiler error");
    logger_1.error(err.message || err.toString());
    logger_1.error(err.stack);
    process.exit(1);
}
function main() {
    program
        .version(getCompilerVersion())
        .usage("<cmd> [options] <file>")
        .option("-o, --outfile <outfile>", "Output file")
        .option("-d --debug", "Show debug output")
        .parse(process.argv);
    if (program.debug) {
        logger_1.setLogLevel("debug");
    }
    const compile = getCompilerEntryPoint();
    const options = new compilerOptions_1.CompilerOptions(program);
    if (program.args.length === 0) {
        logger_1.info("Awaiting data from stdin");
        readFromStream(process.stdin).then(compile(options)).catch(errorHandler);
    }
    else {
        logger_1.info(`Compiling file ${program.args[0]}`);
        readFromFile(program.args[0]).then(compile(options)).catch(errorHandler);
    }
}
main();
