'use strict';

import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import fs, { promises as fsProm} from 'node:fs';


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
const dataPath = file => join(PATH.dataPath, file);

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
    await fsProm.copyFile(sourcePath(pdfName), assetsPath(normalizeName(pdfName)));
    
}));



await fsProm.rm(PATH.TMP, { recursive: true, force: true });