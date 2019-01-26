/**
 * Created by josh on 1/15/17.
 */
const fs = require('fs');
const paths = require('path')
const id3 = require('jsmediatags')
const crypto = require('crypto')
const ARTWORK_DIR = paths.join(process.cwd(),'artwork2')
if(!fs.existsSync(ARTWORK_DIR)) fs.mkdirSync(ARTWORK_DIR)

module.exports = {
    scanFile: function(file,db) {
        console.log("scanning",file,db)
        return new Promise((resolve,reject) => {
            id3.read(file, {
                onSuccess: function (info) {
                    // console.log("success", info)
                    resolve(info)
                },
                onError: function (e) {
                    //console.log("error on song",file,e)
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
            if(info.ftyp.trim() === 'M4A') {
                song.mimeType = 'audio/mp4'
            }
            if (!song.artist || !song.album || !song.title) {
                throw new Error("could not parse metadata for song " + file + JSON.stringify(info))
            }
            return generateHash(file).then((hash)=>{
                song.hash = hash
                return song
            }).then((song)=>{
                if(info.tags.picture) {
                    if(!db) {
                        song.picture = true
                        return song
                    }
                    return db.createArtwork(info.tags.picture)
                        .then(artwork => {
                            song.artwork = artwork._id
                            return song
                        })
                }
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
