'use strict';

import { join, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { execSync } from 'node:child_process';
import fs, { copyFile, promises as fsProm} from 'node:fs';


const __dirname = dirname(fileURLToPath(import.meta.url));
const PATH = {
    SOURCE_CONTENT: join(homedir(), "Documents", "piano"),
    ASSETS: join(__dirname, "public", "scores"),
    THUMBNAIL: join(__dirname, "src", "thumbnails"),
    DATA: join(__dirname, "src", "content", "scores"),
    TMP: join(__dirname, "tmp")
};

const sourcePath = file => join(PATH.SOURCE_CONTENT, file);
const assetsPath = file => join(PATH.ASSETS, file);
const thumbnailPath = file => join(PATH.THUMBNAIL, file);
const dataPath = file => join(PATH.DATA, file);

const removeContentOrCreate = async (path) => {
    if (fs.existsSync(path)) {
        await fsProm.rm(path, { recursive: true });
    }
    
    return fsProm.mkdir(path);
};

// Cleaning previous generated content
await Promise.all([
    removeContentOrCreate(PATH.ASSETS),
    removeContentOrCreate(PATH.DATA),
    removeContentOrCreate(PATH.THUMBNAIL),
    removeContentOrCreate(PATH.TMP),
]);

const sourceFiles = fs.readdirSync(PATH.SOURCE_CONTENT);
const msczFiles = sourceFiles.filter(name => name.endsWith('.mscz'));
const pdfFiles = sourceFiles.filter(name => name.endsWith(".pdf"));

// Check every mscz files has a matching pdf file
msczFiles.map(name => {
    if (!pdfFiles.includes(name.replace('.mscz', '.pdf')))
    {
        console.error(`File ${name} as no matching pdf`)
        process.exit(-1);
    }
});

const normalizeName = (/** @type string*/ name) => name.toLowerCase().replaceAll(' ', '_');

// process each file and generate corresponding content
await Promise.all(msczFiles.map(async (name) => {
    const pdfName = name.replace('.mscz', '.pdf');
    await Promise.all([
        fsProm.copyFile(sourcePath(name), assetsPath(normalizeName(name))),
        fsProm.copyFile(sourcePath(pdfName), assetsPath(normalizeName(pdfName))),
    ]);

    const tmpDir = await fsProm.mkdtemp(PATH.TMP + sep);
    execSync(`tar -xf "${sourcePath(name)}" -C "${tmpDir}"`);

    const metadataFile = join(tmpDir, name.replace('.mscz', '.mscx'));
    const metadata = await parseMSCXMetaTag(metadataFile);
    const normalizedName = normalizeName(name.replace('.mscz', ''))
    const data = JSON.stringify({
        title: metadata.get('workTitle'),
        author: metadata.get('composer') ?? metadata.get('lyricist'),
        filename: normalizedName
    })

    await Promise.all([
        fsProm.writeFile(dataPath(`${normalizedName}.json`), data),
        fsProm.copyFile(join(tmpDir, "Thumbnails", "thumbnail.png"), thumbnailPath(`${normalizedName}.png`)),
    ]);
}));



await fsProm.rm(PATH.TMP, { recursive: true, force: true });

async function parseMSCXMetaTag(file) {
    const handle = await fsProm.open(file);
    const metaTags = new Map();
    let seenMetaTag = false;
    for await (let line of handle.readLines()) {
        line = line.trim();
        if (!line.startsWith("<metaTag")) {
            if (seenMetaTag)
            {
                handle.close();
                return metaTags;
            }
            continue;
        }

        seenMetaTag = true;

        const [_, name, value] = /name="(.+)">(.*)</.exec(line);
        metaTags.set(name, value || undefined);
    }

    handle.close();
    return metaTags;
}
