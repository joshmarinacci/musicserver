/**
 * Created by josh on 1/15/17.
 */
var mm = require('musicmetadata');
var fs = require('fs');

module.exports = {
    scanFile: function(file,realFile) {
        return new Promise((resolve,reject) => {
            var stream = fs.createReadStream(file);
            mm(stream, { duration:true }, (err, metadata) => {
                console.log("scanning", file);
                console.log("error is ", err);
                console.log(metadata);
                if(err) {
                    reject(err);
                } else {
                    if(!metadata.artist || metadata.artist.length <= 0) {
                        console.log("missing the artist");
                        metadata.artist = ['Unknown'];
                    }
                    if(!metadata.album || metadata.album.length <= 0) {
                        console.log("missing album");
                        metadata.album = "Unknown";
                    }
                    if(!metadata.title || metadata.title.length <= 0) {
                        console.log("missing title");
                        metadata.title = "Unknown";
                    }
                    var song = {
                        title: metadata.title,
                        path: file,
                        artist: metadata.artist[0],
                        album: metadata.album,
                        duration: metadata.duration,
                        track: metadata.track,
                        mimeType:'audio/mp3'
                    };
                    resolve(song);
                    stream.close();
                }
            });
        });
    }
};