import fs from 'fs';
import eventStream from 'event-stream';

const MAX_POST_LENGTH = 16383;

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

const editLine = (input: string): string => {
    const entry = JSON.parse(input);
    if (entry.type !== 'post') {
        return input;
    }

    const post = entry.post as Post;
    let allPosts = spreadPost(post);

    for (const reply of post.replies) {
        allPosts = [...allPosts, ...spreadPost(reply)];
    }

    for (const p of allPosts) {
        p.message = p.message.replace(/\u0000/g, '');
    }

    const firstPost = allPosts[0] as Post;
    const newEntry: PostLine = {
        type: 'post',
        post: {
            ...firstPost,
            replies: allPosts.slice(1),
        },
    }

    return JSON.stringify(newEntry);
}

const spreadPost = (post: Post | Reply): (Post | Reply)[] => {
    if (post.message.length <= MAX_POST_LENGTH) {
        return [post];
    }

    const allPosts = [];

    const fullMessage = post.message;
    const numPosts = Math.ceil(post.message.length / MAX_POST_LENGTH);
    for (let i = 0; i < numPosts; i++) {
        const message = fullMessage.substring(i * MAX_POST_LENGTH, (i + 1) * MAX_POST_LENGTH);
        if (i === 0) {
            post.message = message;
            allPosts.push(post);
            continue;
        }

        const newPost: Reply = {
            user: post.user,
            message,
            create_at: post.create_at + i,
        };
        allPosts.push(newPost);
    }

    return allPosts;
};

const fname = process.argv[2];

if (!fname) {
    console.log('Please provide the import file as an argument');
    process.exit(0);
}

const writeStream = fs.createWriteStream('out.jsonl', {autoClose: true});

fs.createReadStream(fname)
    .pipe(eventStream.split())
    .pipe(eventStream
        .mapSync((line: string) => {
            if (!line) {
                return;
            }

            const output = editLine(line);
            writeStream.write(output + '\n');
        }).on('error', err => {
            console.log('Error while reading file.', err);
        })
        .on('end', () => {
            console.log('end');
        }));
