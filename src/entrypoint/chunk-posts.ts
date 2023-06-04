import {runChunkPosts} from '../chunk-posts';

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

runChunkPosts(inputFileName);
