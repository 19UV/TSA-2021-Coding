const fs = require("fs"); // FileSystem (Read From Input) | Default Node Library <https://nodejs.org/api/fs.html>
const readline = require("readline"); // Readline (Change File Input) | Default Node Library <https://nodejs.org/api/readline.html>

const rl = readline.createInterface({ input: process.stdin, output: process.stdout }); // STDIN interface

const FILE_DEFAULT = "input.txt";

const START_PROMOTER_1 = new RegExp("(TA){2}A{2}", "gi"); // TATAAA
const START_PROMOTER_2 = new RegExp("[CT]{2}A[ATGC][AT][CT]{2}", "gi"); // (C/T)(C/T)A(A/T/G/C)(A/T)(C/T)(C/T)
const START_PROMOTER = new RegExp(`${START_PROMOTER_1.source}|${START_PROMOTER_2.source}`, "gi"); // Find both promoters
const END_TERMINATOR = new RegExp("(CG){4}A{3}(CG){4}T{7}", "gi"); // End sequence: CGCGCGCGAAACGCGCGCGTTTTTTT | Assume that file ends at last 'T'

const CodonTable = [];
const codon_file_data = fs.readFileSync("./translation_table.txt", { "encoding": "utf-8" }) // Read From File (it is a small file, so sync is sufficient)
                          .replace(/(\r)/g, "") // Add Windows support
                          .split('\n'); // Split file into parseable data

codon_file_data.forEach((line) => {
    let line_data = line.split(" ");
    let temp_codon = {
        codon: line_data[0],
        amino_acid: line_data[1],
    };
    if (line_data[1] != "STOP") {
        temp_codon.mass = parseFloat(line_data[2]);
        temp_codon.charge = parseInt(line_data[3]);
    }
    CodonTable.push(temp_codon);
});

function find_all_indexes(str, exp) {
    var resp = [];
    var result;
    while ((result = exp.exec(str))) {
        resp.push({
            data: result[0],
            index: result.index
        });
    }
    return resp;
}

rl.question(`File Name (${FILE_DEFAULT}): `, (file_name) => {
    file_name = (file_name != "") ? file_name : FILE_DEFAULT;
    rl.close();
    fs.readFile(file_name, { "encoding": "utf-8" }, (err, file_data) => {
        if (err) {
            console.log("ERROR: No such file");
            return;
        }

        file_data = file_data.toUpperCase();
        file_data = file_data.replace(/[(\r)(\n) ]/g, ""); // Convert file into one line, remove carrage returns (Windows Support), and remove whitespace
        file_data = file_data.replace(/^[ATGCU]/g, ""); // Remove any non-DNA data

        const starter_indexes = find_all_indexes(file_data, START_PROMOTER);
        const end_indexes = find_all_indexes(file_data, END_TERMINATOR);
        starter_indexes.forEach((start_location) => {
            const start_index = start_location.index + (start_location.data[1] == "A" ? 6 : 2);
            const temp_end_indexes = end_indexes.filter((loc) => start_location.index <= loc.index); // Remove Terminators Before Promoter

            var protein_strands = [];
            temp_end_indexes.forEach((end_location) => {
                var substring = file_data.substring(start_index, end_location.index + 26);
                substring = substring.replace(/T/g, 'U'); // "For each transcribed substring, convert the Thymines to Uracils."
                var exons = substring.replace(/GU[AG]AGU[AGCU]+?CAG/g, "|").split("|"); // Remove everything between introns
                
                const possible = Math.pow(2, exons.length); // Number of all possible unsigned n-width integer (to iterate through all possible combinations)
                for (var i = 0; i < possible; i++) {
                    /*
                    Using bitwise operations it converts i into a mask (assumes little endian)
                    i: 0: 00000000 <--- Completely blank protein
                    i: 3: 00000011 <--- Last two
                    */
                    var curr_string = exons.map((val, ind) => ((i >> ind) & 1) ? val : "").join("");
                    const curr_string_length = curr_string.length;
                    const locations = find_all_indexes(curr_string, /AUG/g);
                    locations.forEach((loc) => {
                        for (var j = loc.index; j < curr_string_length; j += 3) {
                            if (["UGA", "UAA", "UAG"].includes(curr_string.substring(j, j + 3))) { // Check if is ending block
                                protein_strands.push(curr_string.substring(loc.index, j));
                                break;
                            }
                        }
                    });
                }
            });
            console.log("");
            
            protein_strands = [...new Set(protein_strands)]; // Remove Duplicates (JS Sets remove duplicate numbers)
            protein_strands.forEach((strand) => {
                var proteins = strand.match(/.{3}/g) || [""]; // Split into array of elements of exactly 3 characters
                var response = "";
                var mass = 0;
                var charge = 0;
                proteins.forEach((protein) => {
                    var found_codon = CodonTable.find((e) => e.codon == protein) || {}; // Find matching Codon (if doesn't exist don't change anything)
                    response += found_codon.amino_acid; // Add simplified name, mass, and calculate charge
                    mass += found_codon.mass || 0;
                    charge += found_codon.charge || 0;
                });
                console.log(response, mass.toFixed(4) + "u", charge + "e"); // Print name, mass (fixed to 4 decimal places), and the charge
            });
        });
    });
});
