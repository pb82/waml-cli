import {CommanderStatic} from "commander";

// Stores the flags passed to the compiler on the command line
export class CompilerOptions {
    debug: boolean;
    outfile: string;

    constructor(program: CommanderStatic) {
        this.debug = program.debug;
        this.outfile = program.outfile;
    }
}