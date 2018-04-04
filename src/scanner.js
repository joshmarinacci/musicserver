/**
 * Created by josh on 1/15/17.
 */
// var fs = require('fs');
var id3 = require('id3js')

module.exports = {
    scanFile: function(file,realFile) {
        return new Promise((resolve,reject) => {
            id3({file:file, type:id3.OPEN_LOCAL},function(err,tags) {
                console.log(err,tags)
                console.log('title',tags.v2.title)
                console.log("artist",tags.v2.artist)
                console.log("album",tags.v2.album)
                var song = {
                    title: tags.v2.title,
                    path: file,
                    artist: tags.v2.artist,
                    album: tags.v2.album,
                    mimeType: 'audio/mp3'
                };
                resolve(song)

            })

        })
    }
};