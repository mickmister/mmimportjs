import fs from 'node:fs';
import readline from 'node:readline';

export const runChunkPosts = (inputFileName: string) => {
    let beginTimeString = new Date().toISOString();
    beginTimeString = beginTimeString.substring(0, beginTimeString.length - 5);
    const outFolder = `out/${beginTimeString}`;
    fs.mkdirSync(outFolder, {recursive: true});

    let CHUNK_SIZE = 10000;
    const providedChunkSize = process.argv[3];
    if (providedChunkSize) {
        CHUNK_SIZE = parseInt(providedChunkSize);
    }

    const getCurrentFileName = () => {
        const fileNumString = currentFileNum.toString().padStart(6, '0');
        return `${outFolder}/${fileNumString}-${inputFileName}`;
    };

    const makeWriteStream = (): fs.WriteStream => {
        const outputFileName = getCurrentFileName();
        return fs.createWriteStream(outputFileName, {autoClose: true});
    };

    const deleteLastFile = () => {
        const outputFileName = getCurrentFileName();
        fs.rmSync(outputFileName);
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
        if (!line) {
            return;
        }

        currentLineNum++;
        writeStream.write(line + '\n');

        if (currentLineNum !== 0 && currentLineNum % CHUNK_SIZE === 0) {
            console.log(`Created chunk ${currentFileNum}. Processed ${currentLineNum} lines total.`);
            rotateFile();
        }
    });

    rl.on('close', () => {
        if (currentLineNum % CHUNK_SIZE !== 0) {
            console.log(`Created chunk ${currentFileNum}. Processed ${currentLineNum} lines total.`);
        } else {
            deleteLastFile();
        }
        console.log('Finished.');
    });
};
