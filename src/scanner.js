/**
 * Created by josh on 1/15/17.
 */
const fs = require('fs');
const id3 = require('id3js')

module.exports = {
    scanFile: function(file,realFile) {
        return new Promise((resolve,reject) => {
            id3({file:file, type:id3.OPEN_LOCAL},function(err,tags) {
                if(err) return reject(err)
                const song = {
                    path:file,
                    mimeType:'audio/mp3',
                    fileSizeBytes: fs.statSync(file).size
                }

                function fillIn(song, tags, prop) {
                    if(tags.v1[prop]) song[prop] = tags.v1[prop].trim().replace(/\0/g,'')
                    if(tags.v2[prop]) song[prop] = tags.v2[prop].trim().replace(/\0/g,'')
                }
                fillIn(song,tags,'title')
                fillIn(song,tags,'artist')
                fillIn(song,tags,'album')
                resolve(song)
            })

        })
    }
};