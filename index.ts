import fs = require("fs"); // FileSystem (Read From Input) | Default Node Library <https://nodejs.org/api/fs.html>
import readline = require("readline"); // Readline (Change File Input) | Default Node Library <https://nodejs.org/api/readline.html>

const rl: readline.Interface = readline.createInterface( { input: process.stdin, output: process.stdout } ); // STDIN interface

const FILE_DEFAULT: string = "input.txt";

const START_PROMOTER_1: RegExp = new RegExp("(TA){2}A{2}", "gi"); // TATAAA
const START_PROMOTER_2: RegExp = new RegExp("[CT]{2}A[ATGC][AT][CT]{2}", "gi"); // (C/T)(C/T)A(A/T/G/C)(A/T)(C/T)(C/T)
const START_PROMOTER: RegExp = new RegExp(`${START_PROMOTER_1.source}|${START_PROMOTER_2.source}`, "gi"); // Find both promoters

const END_TERMINATOR: RegExp = new RegExp("(CG){4}A{3}(CG){4}T{7}", "gi"); // End sequence: CGCGCGCGAAACGCGCGCGTTTTTTT | Assume that file ends at last 'T'

interface RegexLocation {
    data: string; // Actual match
    index: number; // Index of start of match
};

interface Codon {
    codon: string; // Ex: UUA
    amino_acid: string; // Ex: Leu
    mass?: number; // Ex: 113.1594
    charge?: number; // Ex: 0
};

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
            data: result[0],
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
        file_data = file_data.replace(/^[ATGCU]/g, ""); // Remove any non-DNA data

        const starter_indexes: Array<RegexLocation> = find_all_indexes(file_data, START_PROMOTER);
        const end_indexes: Array<RegexLocation> = find_all_indexes(file_data, END_TERMINATOR);

        starter_indexes.forEach((start_location: RegexLocation) => {
            const start_index: number = start_location.index + (start_location.data[1] == "A" ? 6 : 2);
            const temp_end_indexes: Array<RegexLocation> = end_indexes.filter((loc: RegexLocation) => start_location.index <= loc.index); // Remove Terminators Before Promoter

            var protein_strands: Array<string> = [];
            temp_end_indexes.forEach((end_location: RegexLocation) => { // Go through all substrings between all promoters and terminators
                var substring: string = file_data.substring(start_index, end_location.index + 26);
                substring = substring.replace(/T/g, 'U'); // "For each transcribed substring, convert the Thymines to Uracils."
                
                var exons: Array<string> = substring.replace(/GU[AG]AGU[AGCU]+?CAG/g,"|").split("|"); // Remove everything between introns
                const possible: number = Math.pow(2, exons.length); // Number of all possible unsigned n-width integer (to iterate through all possible combinations)
                for(var i: number = 0; i < possible; i++) {
                    /*
                    Using bitwise operations it converts i into a mask (assumes little endian)
                    i: 0: 00000000 <--- Completely blank protein
                    i: 3: 00000011 <--- Last two
                    */
                    var curr_string: string = exons.map((val: string, ind: number) => ((i>>ind)&1)?val:"").join("");
                    const curr_string_length: number = curr_string.length;
                    const locations: Array<RegexLocation> = find_all_indexes(curr_string, /AUG/g);
                    locations.forEach((loc: RegexLocation) => {
                        for(var j: number = loc.index; j < curr_string_length; j += 3) {
                            if(["UGA", "UAA", "UAG"].includes(curr_string.substring(j, j+3))) { // Check if is ending block
                                protein_strands.push(curr_string.substring(loc.index, j));
                                break;
                            }
                        }
                    });
                }
            });
            console.log("");

            protein_strands = [...new Set(protein_strands)]; // Remove Duplicates (JS Sets remove duplicate numbers)
            protein_strands.forEach((strand: string) => {
                var proteins: Array<string> = strand.match(/.{3}/g) || [""]; // Split into array of elements of exactly 3 characters
                var response: string = "";
                var mass: number = 0;
                var charge: number = 0;
                proteins.forEach((protein: string) => {
                    var found_codon: Codon = CodonTable.find((e: Codon) => e.codon == protein) || {} as Codon; // Find matching Codon (if doesn't exist don't change anything)
                    response += found_codon.amino_acid; // Add simplified name, mass, and calculate charge
                    mass += found_codon.mass || 0;
                    charge += found_codon.charge || 0;
                });
                console.log(response, mass.toFixed(4) + "u", charge + "e"); // Print name, mass (fixed to 4 decimal places), and the charge
            });
        });
    });
});