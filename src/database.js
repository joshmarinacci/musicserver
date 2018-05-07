const path = require('path')
const Datastore = require('nedb')
const scanner = require('./scanner')
class Database {
    constructor(opts) {
        if(!opts) opts = {}
        this.db = new Datastore(opts);//{filename: DB_FILE, autoload: true})
        this.TEMP_DIR = path.join(process.cwd(),"tmp_test")
    }
    insertSong(srcpath) {
        return scanner.scanFile(srcpath)
            .then((song) => {
                song.type = 'song'
                return this.isDuplicate(song).then(dup=>{
                    if (dup) {
                        song.isDuplicate = true
                        return song
                    } else {
                        return this.findOrCreateArtist(song.artist).then((artist) => {
                            song.artist = artist._id
                            return this.findOrCreateAlbum(song.artist, song.album).then((album) => {
                                song.album = album._id
                                return this.updateAlbumArt(song,album)
                                    .then(()=>this.insertPromise(song))
                            })
                        })
                    }
                })
            });
    }

    getAllSongs() {
        return this.findPromise({type:'song'})
    }
    getAllAlbums() {
        return this.findPromise({type:'album'})
    }
    getAllArtists() {
        return this.findPromise({type:'artist'})
    }
    findPromise(query, sort) {
        return new Promise((res,rej)=>{
            let cursor = this.db.find(query);
            if(sort) cursor = cursor.sort(sort)
            cursor.exec((err,docs)=>{
                if(err) return rej(docs)
                return res(docs)
            })
        })
    }
    insertPromise(obj) {
        return new Promise((res,rej)=>{
            this.db.insert(obj, (err,docs)=>{
                if(err) return rej(docs)
                return res(docs)
            })
        })
    }
    updatePromise(query, fields) {
        return new Promise((res,rej)=>{
            console.log("setting the fields",fields)
            this.db.update(query,{$set:fields},{multi:true,returnUpdatedDocs:true}, (err, numReplaced,docs)=>{
                console.log("done updating",err,numReplaced,docs)
                if(err) return rej(err)
                res(numReplaced)
            })
        })
    }
    findOrCreateArtist(artist) {
        return this.findPromise({type:'artist',name:artist})
            .then((artists)=>{
                if(!artists || artists.length !== 1) {
                    return this.insertPromise({
                        type:'artist',
                        name:artist
                    }).then((a)=>{
                        console.log('created artist',a.name)
                        return a;
                    })
                } else {
                    return artists[0]
                }
            })
    }
    findOrCreateAlbum(artist,album) {
        // console.log(`checking for artist -${artist}-${album}-`)
        return this.findPromise({type:'album',name:album, artist:artist})
            .then((albums)=>{
                if(!albums || albums.length !== 1) {
                    return this.insertPromise({
                        type:'album',
                        name:album,
                        artist:artist
                    }).then((a)=>{
                        console.log('created album',a.name)
                        return a;
                    })
                } else {
                    return albums[0]
                }
            })
    }
    updateAlbumArt (song, album)  {
        if(song.picture && !album.picture) {
            console.log("song has a picture and the album doesnt")
            return this.updatePromise({_id:album._id},{picture:song.picture})
        }
    }

    isDuplicate(song) {
        return this.findPromise({fileSizeBytes:song.fileSizeBytes}).then((docs)=>(docs.length!==0))
    }
}
module.exports = Database
