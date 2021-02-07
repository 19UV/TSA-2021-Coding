const fs = require("fs"); // FileSystem (Read From Input) | Default Node Library <https://nodejs.org/api/fs.html>
const readline = require("readline"); // Readline (Change File Input) | Default Node Library <https://nodejs.org/api/readline.html>

const rl = readline.createInterface({ input: process.stdin, output: process.stdout }); // STDIN interface

const FILE_DEFAULT = "input.txt";

const START_PROMOTER_1 = new RegExp("(TA){2}A{2}", "gi"); // TATAAA
const START_PROMOTER_2 = new RegExp("[CT]{2}A[ATGC][AT][CT]{2}", "gi"); // (C/T)(C/T)A(A/T/G/C)(A/T)(C/T)(C/T)
const START_PROMOTER = new RegExp(`${START_PROMOTER_1.source}|${START_PROMOTER_2.source}`, "gi"); // Find both promoters
const END_TERMINATOR = new RegExp("(CG){4}A{3}(CG){4}T{7}", "gi"); // End sequence: CGCGCGCGAAACGCGCGCGTTTTTTT | Assume that file ends at last 'T'

const CodonTable = [
    { codon: "UUU", amino_acid: "Phe", "mass": 147.1766, charge: 0 },
    { codon: "UUC", amino_acid: "Phe", "mass": 147.1766, charge: 0 },
    { codon: "UUA", amino_acid: "Leu", "mass": 113.1594, charge: 0 },
    { codon: "UUG", amino_acid: "Leu", "mass": 113.1594, charge: 0 },
    { codon: "UCU", amino_acid: "Ser", "mass": 87.0782, charge: 0 },
    { codon: "UCC", amino_acid: "Ser", "mass": 87.0782, charge: 0 },
    { codon: "UCA", amino_acid: "Ser", "mass": 87.0782, charge: 0 },
    { codon: "UCG", amino_acid: "Ser", "mass": 87.0782, charge: 0 },
    { codon: "UAU", amino_acid: "Tyr", "mass": 163.1760, charge: 0 },
    { codon: "UAC", amino_acid: "Tyr", "mass": 163.1760, charge: 0 },
    { codon: "UAG", amino_acid: "STOP" },
    { codon: "UAA", amino_acid: "STOP" },
    { codon: "UGU", amino_acid: "Cys", "mass": 103.1388, charge: 0 },
    { codon: "UGC", amino_acid: "Cys", "mass": 103.1388, charge: 0 },
    { codon: "UGA", amino_acid: "STOP" },
    { codon: "UGG", amino_acid: "Trp", "mass": 186.2132, charge: 0 },
    { codon: "CUU", amino_acid: "Leu", "mass": 113.1594, charge: 0 },
    { codon: "CUC", amino_acid: "Leu", "mass": 113.1594, charge: 0 },
    { codon: "CUA", amino_acid: "Leu", "mass": 113.1594, charge: 0 },
    { codon: "CUG", amino_acid: "Leu", "mass": 113.1594, charge: 0 },
    { codon: "CCU", amino_acid: "Pro", "mass": 97.1167, charge: 0 },
    { codon: "CCC", amino_acid: "Pro", "mass": 97.1167, charge: 0 },
    { codon: "CCA", amino_acid: "Pro", "mass": 97.1167, charge: 0 },
    { codon: "CCG", amino_acid: "Pro", "mass": 97.1167, charge: 0 },
    { codon: "CAU", amino_acid: "His", "mass": 137.1411, charge: 1 },
    { codon: "CAC", amino_acid: "His", "mass": 137.1411, charge: 1 },
    { codon: "CAA", amino_acid: "Gln", "mass": 128.1307, charge: 0 },
    { codon: "CAG", amino_acid: "Gln", "mass": 128.1307, charge: 0 },
    { codon: "CGU", amino_acid: "Arg", "mass": 156.1875, charge: 1 },
    { codon: "CGC", amino_acid: "Arg", "mass": 156.1875, charge: 1 },
    { codon: "CGA", amino_acid: "Arg", "mass": 156.1875, charge: 1 },
    { codon: "CGG", amino_acid: "Arg", "mass": 156.1875, charge: 1 },
    { codon: "AUU", amino_acid: "Ile", "mass": 113.1594, charge: 0 },
    { codon: "AUC", amino_acid: "Ile", "mass": 113.1594, charge: 0 },
    { codon: "AUA", amino_acid: "Ile", "mass": 113.1594, charge: 0 },
    { codon: "AUG", amino_acid: "Met", "mass": 131.1926, charge: 0 },
    { codon: "ACU", amino_acid: "Thr", "mass": 101.1051, charge: 0 },
    { codon: "ACC", amino_acid: "Thr", "mass": 101.1051, charge: 0 },
    { codon: "ACA", amino_acid: "Thr", "mass": 101.1051, charge: 0 },
    { codon: "ACG", amino_acid: "Thr", "mass": 101.1051, charge: 0 },
    { codon: "AAU", amino_acid: "Asn", "mass": 114.1038, charge: 0 },
    { codon: "AAC", amino_acid: "Asn", "mass": 114.1038, charge: 0 },
    { codon: "AAA", amino_acid: "Lys", "mass": 128.1741, charge: 1 },
    { codon: "AAG", amino_acid: "Lys", "mass": 128.1741, charge: 1 },
    { codon: "AGU", amino_acid: "Ser", "mass": 87.0782, charge: 0 },
    { codon: "AGC", amino_acid: "Ser", "mass": 87.0782, charge: 0 },
    { codon: "AGA", amino_acid: "Arg", "mass": 156.1875, charge: 1 },
    { codon: "AGG", amino_acid: "Arg", "mass": 156.1875, charge: 1 },
    { codon: "GUU", amino_acid: "Val", "mass": 99.1326, charge: 0 },
    { codon: "GUC", amino_acid: "Val", "mass": 99.1326, charge: 0 },
    { codon: "GUA", amino_acid: "Val", "mass": 99.1326, charge: 0 },
    { codon: "GUG", amino_acid: "Val", "mass": 99.1326, charge: 0 },
    { codon: "GCU", amino_acid: "Ala", "mass": 71.0788, charge: 0 },
    { codon: "GCC", amino_acid: "Ala", "mass": 71.0788, charge: 0 },
    { codon: "GCA", amino_acid: "Ala", "mass": 71.0788, charge: 0 },
    { codon: "GCG", amino_acid: "Ala", "mass": 71.0788, charge: 0 },
    { codon: "GAU", amino_acid: "Asp", "mass": 115.0886, charge: -1 },
    { codon: "GAC", amino_acid: "Asp", "mass": 115.0886, charge: -1 },
    { codon: "GAA", amino_acid: "Glu", "mass": 129.1155, charge: -1 },
    { codon: "GAG", amino_acid: "Glu", "mass": 129.1155, charge: -1 },
    { codon: "GGU", amino_acid: "Gly", "mass": 57.0519, charge: 0 },
    { codon: "GGC", amino_acid: "Gly", "mass": 57.0519, charge: 0 },
    { codon: "GGA", amino_acid: "Gly", "mass": 57.0519, charge: 0 },
    { codon: "GGG", amino_acid: "Gly", "mass": 57.0519, charge: 0 }
];

function find_all_indexes(str, exp) {
    var resp = []; // List of all indexes of Regex matches
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
            
            protein_strands = [...new Set(protein_strands)]; // Remove Duplicates (JS Sets removes duplicate values)
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
