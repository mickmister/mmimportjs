import fs from 'node:fs';
import readline from 'node:readline';

const MAX_POST_LENGTH = 16383;

const fname = process.argv[2];

if (!fname) {
    console.log('Please provide the import file as an argument. For example:');
    console.log('node index.js myimport.jsonl')
    process.exit(0);
}

// Types
type Reply = {
    user: string;
    message: string;
    create_at: number;
};

type Attachment = {};

type Post = {
    team: string;
    channel: string;
    user: string;
    type: string | null
    message: string;
    props: {} | null;
    create_at: number;
    edit_at: number | null;
    replies: Reply[];
    attachments: Attachment[];
};

type PostLine = {
    type: 'post';
    post: Post;
};

// editLine takes a line from the import file, and transforms it to satisfy:
// - Spread posts/replies into multiple replies if post message is too long
// - Remove any \u0000 chars from each post
const editLine = (input: string): string => {
    const entry = JSON.parse(input);
    if (entry.type !== 'post') {
        return input;
    }

    const post = entry.post as Post;

    // Spread post into multiple posts if necessary
    let allPosts = spreadPost(post);

    // Do the same for replies
    for (const reply of post.replies) {
        allPosts = [...allPosts, ...spreadPost(reply)];
    }

    // Fix null character in all posts
    for (const p of allPosts) {
        p.message = p.message.replace(/\u0000/g, '');
    }

    // Original post is first in the array
    const firstPost = allPosts[0] as Post;
    const newEntry: PostLine = {
        type: 'post',
        post: {
            ...firstPost,

            // New replies are the rest of the array
            replies: allPosts.slice(1),
        },
    }

    return JSON.stringify(newEntry);
}

// spreadPost takes a Post or Reply, and transforms it into a post and multiple replies if the message is too long
const spreadPost = (post: Post | Reply): (Post | Reply)[] => {
    if (post.message.length <= MAX_POST_LENGTH) {
        return [post];
    }

    const allPosts: (Post | Reply)[] = [];

    const fullMessage = post.message;
    const numPosts = Math.ceil(post.message.length / MAX_POST_LENGTH);
    for (let i = 0; i < numPosts; i++) {
        const message = fullMessage.substring(i * MAX_POST_LENGTH, (i + 1) * MAX_POST_LENGTH);
        if (i === 0) {
            // Original post/reply
            post.message = message;
            allPosts.push(post);
        } else {
            // Generated reply only has the following fields
            const newPost: Reply = {
                user: post.user,
                message,
                create_at: post.create_at + i,
            };

            allPosts.push(newPost);
        }
    }

    return allPosts;
};

const writeStream = fs.createWriteStream('out.jsonl', {autoClose: true});

const rl = readline.createInterface({
    input: fs.createReadStream(fname),
    crlfDelay: Infinity,
});

let currentPostNum = 0;
const STEP_SIZE = 1000;

rl.on('line', line => {
    currentPostNum++;

    if (!line) {
        writeStream.write(line + '\n');
        return;
    }

    if (currentPostNum % STEP_SIZE === 0) {
        if (currentPostNum === STEP_SIZE) {
            console.log('Processed thousands of posts:')
        }

        console.log(currentPostNum);
    }

    const output = editLine(line);
    writeStream.write(output + '\n');
});

rl.on('close', () => {
    console.log('Finished');
});
