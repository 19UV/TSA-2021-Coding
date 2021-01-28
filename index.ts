import fs = require("fs"); // FileSystem (Read From Input) | Default Node Library <https://nodejs.org/api/fs.html>
import readline = require("readline"); // Readline (Change File Input) | Default Node Library <https://nodejs.org/api/readline.html>

const rl = readline.createInterface( { input: process.stdin, output: process.stdout } );

const FILE_DEFAULT: string = "input.txt";

const START_PROMOTER_1: RegExp = new RegExp("(TA){2}A{2}", "gi"); // TATAAA
const START_PROMOTER_2: RegExp = new RegExp("[CT]{2}A[ATGC][AT][CT]{2}", "gi"); // (C/T)(C/T)A(A/T/G/C)(A/T)(C/T)(C/T)

const START_PROMOTER: RegExp = new RegExp(`${START_PROMOTER_1.source}|${START_PROMOTER_2.source}`, "gi"); // Find both promoters
const END_TERMINATOR: RegExp = new RegExp("(CG){4}A{3}(CG){4}T{7}", "gi"); // End sequence: CGCGCGCGAAACGCGCGCGTTTTTTT | Assume that file ends at last 'T'

const INTRON_START: RegExp = new RegExp("GU[GA]AGU", "gi");
const INTRON_END: RegExp = new RegExp("CAG", "gi");

interface RegexLocation {
    promoter: string;
    index: number;
}

interface Codon {
    codon: string;
    amino_acid: string;
    mass?: number;
    charge?: number;
}

const CodonTable: Array<Codon> = [];
const codon_file_data: Array<string> = fs.readFileSync("./translation_table.txt", {"encoding": "utf-8"}) // Read From File (it is a small file, so sync is sufficient)
                                       .replace(/(\r)/g,"") // Add Windows support
                                       .split('\n'); // Split file into parseable data

codon_file_data.forEach((line: string) => {
    let line_data: Array<string> = line.split(" ");
    let temp_codon: Codon = {
        codon: line_data[0],
        amino_acid: line_data[1],
    };
    if(line_data[1] != "STOP") {
        temp_codon.mass = parseFloat(line_data[2]);
        temp_codon.charge = parseInt(line_data[3]);
    }
    CodonTable.push(temp_codon);
});

function find_all_indexes(str: string, exp: RegExp): Array<RegexLocation> {
    var resp: Array<RegexLocation> = [];
    var result;
    while((result = exp.exec(str))) {
        resp.push({
            promoter: result[0],
            index: result.index
        });
    }
    return resp;
}

rl.question(`File Name (${FILE_DEFAULT}): `, (file_name: string) => {
    file_name = (file_name != "") ? file_name : FILE_DEFAULT;
    rl.close();
    fs.readFile(file_name, {"encoding": "utf-8"}, (err: any, file_data: string) => {
        if(err) {
            console.log("ERROR: No such file");
            return;
        }
        file_data = file_data.toUpperCase();
        file_data = file_data.replace(/[(\r)(\n) ]/g, ""); // Convert file into one line, remove carrage returns (Windows Support), and remove whitespace

        const starter_indexes: Array<RegexLocation> = find_all_indexes(file_data, START_PROMOTER);
        const end_indexes: Array<RegexLocation> = find_all_indexes(file_data, END_TERMINATOR);

        console.log("Whole File:", file_data);

        starter_indexes.forEach((start_location: RegexLocation) => {
            const start_index: number = start_location.index + (start_location.promoter[1] == "A" ? 6 : 2);
            const temp_end_indexes: Array<RegexLocation> = end_indexes.filter((loc: RegexLocation) => start_location.index <= loc.index); // Remove Terminators Before Promoter
            temp_end_indexes.forEach((end_location: RegexLocation) => {
                var substring: string = file_data.substring(start_index, end_location.index);
                substring = substring.replace(/T/gi, 'U'); // "For each transcribed substring, convert the Thymines to Uracils."

                const intron_starts: Array<RegexLocation> = find_all_indexes(substring, INTRON_START);
                const intron_ends: Array<RegexLocation> = find_all_indexes(substring, INTRON_END);
                
                console.log("----- DATA BETWEEN INTRONS -----");
                intron_starts.forEach((intron_location: RegexLocation) => {
                    var end_target: RegexLocation = intron_ends.filter((intron: RegexLocation) => intron.index > intron_location.index)[0];
                    if(!end_target) return;

                    const substr = substring.substring(intron_location.index + 6, end_target.index); // Past Intron Start

                    console.log("  " + substr);
                });
            });
        });
    });
});