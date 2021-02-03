import { O_RDONLY } from "constants";
import fs = require("fs"); // FileSystem (Read From Input) | Default Node Library <https://nodejs.org/api/fs.html>
import readline = require("readline"); // Readline (Change File Input) | Default Node Library <https://nodejs.org/api/readline.html>

const rl = readline.createInterface( { input: process.stdin, output: process.stdout } );

const FILE_DEFAULT: string = "input.txt";
const DEBUG_MODE: boolean = false;

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
        file_data = file_data.replace(/^[ATGCU]/g, "");

        const starter_indexes: Array<RegexLocation> = find_all_indexes(file_data, START_PROMOTER);
        const end_indexes: Array<RegexLocation> = find_all_indexes(file_data, END_TERMINATOR);

        if(DEBUG_MODE) console.log("Whole File:\n" + file_data);

        starter_indexes.forEach((start_location: RegexLocation) => {
            const start_index: number = start_location.index + (start_location.promoter[1] == "A" ? 6 : 2);
            const temp_end_indexes: Array<RegexLocation> = end_indexes.filter((loc: RegexLocation) => start_location.index <= loc.index); // Remove Terminators Before Promoter

            var protein_strands: Array<string> = [];

            temp_end_indexes.forEach((end_location: RegexLocation) => {
                var substring: string = file_data.substring(start_index, end_location.index + 26);
                substring = substring.replace(/T/g, 'U'); // "For each transcribed substring, convert the Thymines to Uracils."
                
                if(DEBUG_MODE) console.log(" ".repeat(start_index) + substring);
                
                /*
                var exon_string: string = substring.replace(/GU[AG]AGU[AGCU]+?CAG/g, "");
                const exon_string_length: number = exon_string.length;
                console.log(exon_string);
                const init_indexes: Array<RegexLocation> = find_all_indexes(exon_string, /AUG/g);
                init_indexes.forEach((index: RegexLocation) => {
                    for(var i: number = index.index; i<exon_string_length; i += 3) {
                        if(["UGA", "UAA", "UAG"].includes(exon_string.substring(i, i+3))) {
                            protein_strands.push(exon_string.substring(index.index, i));
                            if (DEBUG_MODE) console.log(exon_string.substring(index.index, i).match(/.{3}/g)?.join(" "));
                            break;
                        }
                    }
                });
                */

                
                var exons: Array<string> = substring.replace(/GU[AG]AGU[AGCU]+?CAG/g,"|").split("|");
                const possible: number = Math.pow(2, exons.length);
                for(var i: number = 0; i < possible; i++) {
                    var curr_string: string = exons.map((val: string, ind: number) => ((i>>ind)&1)?val:"").join("");
                    const curr_string_length: number = curr_string.length;
                    const locations: Array<RegexLocation> = find_all_indexes(curr_string, /AUG/g);
                    locations.forEach((loc: RegexLocation) => {
                        for(var j: number = loc.index; j < curr_string_length; j += 3) {
                            if(["UGA", "UAA", "UAG"].includes(curr_string.substring(j, j+3))) {
                                protein_strands.push(curr_string.substring(loc.index, j));
                                if (DEBUG_MODE) console.log(curr_string.substring(loc.index, j).match(/.{3}/g)?.join(" "));
                                break;
                            }
                        }
                    });
                }
            });

            protein_strands = [...new Set(protein_strands)];

            protein_strands.forEach((strand: string) => {
                var proteins: Array<string> = strand.match(/.{3}/g) || [""];
                var response: string = "";
                var mass: number = 0;
                var charge: number = 0;
                proteins.forEach((protein: string) => {
                    var found_codon: Codon = CodonTable.find((e: Codon) => e.codon == protein) || {} as Codon;
                    response += found_codon.amino_acid;
                    mass += found_codon.mass || 0;
                    charge += found_codon.charge || 0;
                    // console.log(protein, found_codon);
                });
                console.log(response, mass.toFixed(4) + "u", charge + "e");
            });
        });
    });
});