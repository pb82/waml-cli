import {debug, error, info, setLogLevel} from "./logger";
import {CompilerOptions} from "./compilerOptions";
import * as program from "commander";
import * as Promise from "bluebird";
import {readFile, existsSync} from "fs";
import {join} from "path";
import Socket = NodeJS.Socket;

const BANNER = "Web Audio Markdown Language Compiler";

/**
 * Returns the path where the WAML compiler is installed. This can be either
 * the globally installed waml-compiler module, or, if that fails the
 * local path. This assumes that WAML is checked out for development and
 * waml-compiler is under the same root folder as waml-cli.
 * @returns {string}
 */
function getCompilerPath(): string {
    try {
        const globalPath = require.resolve("waml-compiler");
        debug("Using globally installed waml-compiler");
        return globalPath;
    } catch (error) {
        const path = `${__dirname}/../../waml-compiler/dist`;
        debug(`Trying to use development compiler in ${path}`);
        if (!existsSync(path)) {
            errorHandler(new Error("Cannot find waml-compiler. Is it installed?"));
        }
        return path;
    }
}

/**
 * Returns the compiler entry point function (called `compile`). This function accepts the
 * compiler options object and returns a function that compiles the source.
 * @returns {function}
 */
function getCompilerEntryPoint(): (opts: CompilerOptions) => (src: string) => void {
    const compilerPath: string = getCompilerPath();
    return require(compilerPath).compile;
}

/**
 * Returns the WAML compiler version by checking the package.json file of the
 * compiler package.
 * @returns {string}
 */
function getCompilerVersion(): string {
    const compilerPath: string = getCompilerPath();
    const pkg = require(join(compilerPath, "..", "package.json"));
    return `${BANNER} (v${pkg.version})`;
}

/**
 * Reads the WAML source from stdin. Keeps buffering the data until the stream
 * is closed.
 * @param stream Usually Process.stdin
 * @returns {Promise} Promise resolving as string
 */
function readFromStream(stream: Socket): Promise<string> {
    return new Promise((resolve: (result: string) => void, reject) => {
        const data: string[] = [];
        stream.resume();
        stream.setEncoding("utf-8");
        stream.on("data", (chunk: string) => {
            data.push(chunk);
        });
        stream.on("end", () => {
            return resolve(data.join(""));
        });
        stream.on("error", reject);
    });
}

/**
 * Read the WAML source from a file and return it's contents as
 * UTF-8 formatted string.
 * @param filename The full path to the input file
 * @returns {Promise} Promise resolving as string
 */
function readFromFile(filename: string): Promise<string> {
    return new Promise((resolve: (result: string) => void, reject) => {
        readFile(filename, (err, data) => {
            if (err) {
                return reject(err);
            }
            resolve(data.toString("utf-8"));
        });
    });
}

// Print error and exit process
function errorHandler(err: Error) {
    error("Compiler error");
    error(err.message || err.toString());
    error(err.stack);
    process.exit(1);
}

/**
 * WAML CLI Entry Point. Parse parameters and compile sources in a file
 * or from a stream.
 */
function main() {
    program
        .version(getCompilerVersion())
        .usage("<cmd> [options] <file>")
        .option("-o, --outfile <outfile>", "Output file")
        .option("-d --debug", "Show debug output")
        .parse(process.argv);

    if (program.debug) {
        setLogLevel("debug");
    }

    const compile = getCompilerEntryPoint();
    const options = new CompilerOptions(program);

    if (program.args.length === 0) {
        info("Awaiting data from stdin");
        readFromStream(process.stdin).then(compile(options)).catch(errorHandler);
    } else {
        info(`Compiling file ${program.args[0]}`);
        readFromFile(program.args[0]).then(compile(options)).catch(errorHandler);
    }
}

main();
