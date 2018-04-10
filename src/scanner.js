/**
 * Created by josh on 1/15/17.
 */
const fs = require('fs');
const id3 = require('jsmediatags')
const crypto = require('crypto')

module.exports = {
    scanFile: function(file,realFile) {
        return new Promise((resolve,reject) => {
            console.log('reading')
            id3.read(file, {
                onSuccess: function (info) {
                    // console.log("success", info)
                    resolve(info)
                },
                onError: function (e) {
                    // console.log("error")
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
                title: info.tags.title
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
