import fs from 'node:fs';
import readline from 'node:readline';

const inputFileName = process.argv[2];

if (!inputFileName) {
    console.log('Please provide the import file as an argument. For example:');
    console.log('chunk-posts myimport.jsonl')
    process.exit(0);
}

if (!inputFileName.endsWith('.jsonl')) {
    console.log('Please provide a valid import file that has extension .jsonl');
    process.exit(0);
}

let beginTimeString = new Date().toISOString();
beginTimeString = beginTimeString.substring(0, beginTimeString.length - 5);
const outFolder = `out/${beginTimeString}`;
fs.mkdirSync(outFolder, {recursive: true});

let CHUNK_SIZE = 10000;
const providedChunkSize = process.argv[3];
if (providedChunkSize) {
    CHUNK_SIZE = parseInt(providedChunkSize);
}

const makeWriteStream = (): fs.WriteStream => {
    const fileNumString = currentFileNum.toString().padStart(6, '0');
    const outputFileName = `${outFolder}/${fileNumString}-${inputFileName}`;
    return fs.createWriteStream(outputFileName, {autoClose: true});
};

const rotateFile = () => {
    writeStream.close();
    currentFileNum++;
    writeStream = makeWriteStream();
    writeStream.write(versionLine + '\n');
};

console.log(`Creating chunks, with ${CHUNK_SIZE} lines per chunk...`);

const versionLine = '{"type":"version","version":1}';

let currentFileNum = 1;
let currentLineNum = -1;

let writeStream = makeWriteStream();

const rl = readline.createInterface({
    input: fs.createReadStream(inputFileName),
    crlfDelay: Infinity,
});

rl.on('line', (line: string) => {
    currentLineNum++;

    writeStream.write(line + '\n');

    if (currentLineNum !== 0 && currentLineNum % CHUNK_SIZE === 0) {
        console.log(`Created chunk ${currentFileNum}. Processed ${currentLineNum} lines total.`);
        rotateFile();
    }
});

rl.on('close', () => {
    if (currentLineNum % CHUNK_SIZE !== 0) {
        writeStream.close();
        console.log(`Created chunk ${currentFileNum}. Processed ${currentLineNum} lines total.`);
        console.log('Finished.');
    }
});
