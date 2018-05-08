/**
 * Created by josh on 1/15/17.
 */
const fs = require('fs');
const paths = require('path')
const id3 = require('jsmediatags')
const crypto = require('crypto')
const ART_DIR = paths.join(process.cwd(),'artwork')
if(!fs.existsSync(ART_DIR)) fs.mkdirSync(ART_DIR)

module.exports = {
    scanFile: function(file,realFile) {
        return new Promise((resolve,reject) => {
            id3.read(file, {
                onSuccess: function (info) {
                    // console.log("success", info)
                    resolve(info)
                },
                onError: function (e) {
                    console.log("error",e)
                    reject(e)
                }
            })
        }).then((info)=> {
            const song = {
                path: file,
                mimeType: 'audio/mpeg',
                fileSizeBytes: fs.statSync(file).size,
                artist: info.tags.artist,
                album: info.tags.album,
                track: info.tags.track,
                title: info.tags.title,
                year: info.tags.year,
                genre: info.tags.genre,
            }
            if(info.tags.picture) {
                // console.log("got a picture",info.tags.picture)
                const format = info.tags.picture.format
                if(format === 'image/jpeg' || format === 'JPG') {
                    const byteArray = new Uint8Array(info.tags.picture.data);
                    const buffer = Buffer.from(byteArray)
                    const artid = Math.floor(Math.random()*10000000)
                    const filename = `${artid}.jpg`
                    const path = paths.join(ART_DIR, filename)
                    console.log('writing to the path', path)
                    fs.writeFileSync(path, buffer)
                    console.log("done writing artwork to ", path)
                    song.picture = {
                        format: info.tags.picture.format,
                        id:artid
                    }
                }
                if(format.toLowerCase() === 'png') {
                    const byteArray = new Uint8Array(info.tags.picture.data);
                    const buffer = Buffer.from(byteArray)
                    const artid = Math.floor(Math.random()*10000000)
                    const filename = `${artid}.png`
                    const path = paths.join(ART_DIR, filename)
                    console.log('writing to the path', path)
                    fs.writeFileSync(path, buffer)
                    console.log("done writing artwork to ", path)
                    song.picture = {
                        format: 'image/png',
                        id:artid
                    }
                    console.log("added the PNG artwork",song)
                }
            }
            if (!song.artist || !song.album || !song.title) {
                throw new Error("could not parse metadata for song " + file + JSON.stringify(info))
            }
            return generateHash(file).then((hash)=>{
                song.hash = hash
                return song
            })
        })
     }
};

function generateHash(filepath) {
    return new Promise((res,rej)=> {
        const hash = crypto.createHash('md5')
        const stream = fs.createReadStream(filepath);
        stream.on('data', (data) => hash.update(data, 'utf8'))
        stream.on('end', () => res(hash.digest('hex')))
    })
}
