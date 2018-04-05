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
                                return this.insertPromise(song)
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
    findPromise(query) {
        return new Promise((res,rej)=>{
            this.db.find(query, (err,docs)=>{
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

    isDuplicate(song) {
        return this.findPromise({fileSizeBytes:song.fileSizeBytes}).then((docs)=>(docs.length!==0))
    }
}
module.exports = Database
