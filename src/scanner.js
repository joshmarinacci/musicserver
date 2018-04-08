/**
 * Created by josh on 1/15/17.
 */
const fs = require('fs');
const id3 = require('id3js')
const crypto = require('crypto')

module.exports = {
    scanFile: function(file,realFile) {
        return new Promise((resolve,reject) => {
            id3({file:file, type:id3.OPEN_LOCAL},function(err,tags) {
                if(err) return reject(err)
                const song = {
                    path:file,
                    mimeType:'audio/mpeg',
                    fileSizeBytes: fs.statSync(file).size
                }

                function fillIn(song, tags, prop) {
                    if(tags.v1[prop]) song[prop] = tags.v1[prop].trim().replace(/\0/g,'')
                    if(tags.v2[prop]) song[prop] = tags.v2[prop].trim().replace(/\0/g,'')
                }
                fillIn(song,tags,'title')
                fillIn(song,tags,'artist')
                fillIn(song,tags,'album')
                if(typeof tags.v1.track !== 'undefined') song.track = tags.v1.track
                if(typeof tags.v2.track !== 'undefined') song.track = tags.v2.track


                generateHash(song.path).then((hash)=>{
                    song.hash = hash
                    resolve(song)
                })
            })
        })
    }
};

function generateHash(filepath) {
    return new Promise((res,rej)=> {
        const hash = crypto.createHash('md5')
        const stream = fs.createReadStream(filepath);

        stream.on('data', function (data) {
            hash.update(data, 'utf8')
        })

        stream.on('end', function () {
            const checksum = hash.digest('hex'); // 34f7a3113803f8ed3b8fd7ce5656ebec
            res(checksum)
        })
    })
}
