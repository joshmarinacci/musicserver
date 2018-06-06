const paths = require('path')
const fs = require('fs');
const Datastore = require('nedb')
const scanner = require('./scanner')
const OLD_ART_DIR = paths.join(process.cwd(),'artwork')
const NEW_ARTWORK_DIR = paths.join(process.cwd(),'artwork2')

class Database {
    constructor(opts) {
        if(!opts) opts = {}
        this.db = new Datastore(opts);//{filename: DB_FILE, autoload: true})
        this.TEMP_DIR = paths.join(process.cwd(),"tmp_test")
    }
    insertSong(srcpath) {
        console.log("this",this)
        return scanner.scanFile(srcpath, this)
            .then((song) => {
                song.type = 'song'
                console.log("scanned in the song",song)
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

    createArtwork(picture) {
        // console.log('creating artwork for the picture',picture)
        let ext = null
        let format = picture.format.toLowerCase()
        if(format === 'image/jpeg' || format === 'jpg') ext = 'jpg'
        if(format === 'image/png'  || format === 'png') ext = 'png'
        if(!ext) throw new Error("cannot determine the format: " + format)

        const byteArray = new Uint8Array(picture.data);
        const buffer = Buffer.from(byteArray)

        const artid = Math.floor(Math.random()*10000000)
        const filename = `${artid}.${ext}`
        const path = paths.join(NEW_ARTWORK_DIR, filename)
        // console.log('writing to the path', path)
        fs.writeFileSync(path, buffer)
        return this.insertArtwork(path)
    }

    insertArtwork(srcpath) {
        console.log("inserting the artwork at",srcpath)
        const ext = srcpath.substring(srcpath.lastIndexOf('.')+1)
        console.log("ext is",ext)
        let format = 'image/unknown'
        if(ext.toLowerCase() === 'jpg') {
            format = 'image/jpeg'
        }
        if(ext.toLowerCase() === 'png') {
            format = 'image/png'
        }
        const artwork = {
            type:'artwork',
            path:srcpath,
            format:format
        }
        return this.insertPromise(artwork)
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
                console.log("done updating",numReplaced)
                if(err) return rej(err)
                res(docs)
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
        console.log("need to update album artwork",song,album)
        if(song.artwork && !album.artwork) return this.updatePromise({_id:album._id},{artwork:song.artwork})
        return Promise.resolve()
    }

    isDuplicate(song) {
        return this.findPromise({fileSizeBytes:song.fileSizeBytes}).then((docs)=>(docs.length!==0))
    }

    fixPicturesToArtwork() {
        //strip all album artwork
        // this.updatePromise({type:'album'},{artwork:null}).then(()=>console.log("done nuking"))
        // return
        this.findAllSongs().then(songs => {
            const toFix = songs.filter(song => song.picture && !song.artwork)
            console.log(`found ${toFix.length} songs to fix`)
            if(toFix.length < 1) return
            return Promise.all(toFix.map((song)=>this.songPictureToArtwork(song)).then(()=>{
                console.log("all done upgrading songs!")
            }))
        })
        this.findAllAlbums().then(albums => {
            const toFix = albums.filter(album => !album.artwork)
            console.log(`found ${toFix.length} albums to fix`)

            return Promise.all(toFix.map(album => this.albumArtworkFromSongs(album)))
                .then(()=> console.log("all done upgrading albums"))
        })
    }

    albumArtworkFromSongs(album) {
        return this.findPromise({type:'song',album:album._id, deleted: { $ne:true}})
            .then(songs => {
                console.log("songs",songs)
                if(songs.length ===  0) return
                if(songs[0].artwork) {
                    console.log('adding artwork', songs[0].artwork)
                    return this.updatePromise({type:'album', _id:album._id},{ artwork:songs[0].artwork})
                } else {
                    return Promise.resolve()
                }
            }).then((doc)=>{
                console.log("updated the album",doc)
            })


    }

    songPictureToArtwork(song) {
        console.log('song is',song)
        let ext = 'png'
        if(song.picture.format === 'image/jpeg') ext = 'jpg'
        if(song.picture.format === 'JPG') ext = 'jpg'
        const oldpath = paths.join(OLD_ART_DIR,song.picture.id+'.'+ext)
        console.log("reading old artwork at path",oldpath)
        //read file to buffer
        const buffer = fs.readFileSync(oldpath)
        //make new artwork from buffer
        const artid = Math.floor(Math.random()*10000000)
        const filename = `${artid}.${ext}`
        const newPath = paths.join(NEW_ARTWORK_DIR, filename)
        console.log('writing to the path', newPath)
        fs.writeFileSync(newPath, buffer)

        //update song
        return this.insertArtwork(newPath).then((artwork)=>{
            console.log("added artwork",artwork)
            return this.updatePromise({type:'song', _id:song._id},{artwork:artwork._id})
                .then((docs)=>{
                    console.log("updated the song",docs)
                    return docs
                })
            }).catch((err)=> {
                console.log(err)
            })
    }

    findAllSongs () {
        return this.findPromise({type: 'song', deleted: { $ne:true}})
    }
    findAllAlbums() {
        return this.findPromise({type:'album', deleted: { $ne:true}})
    }

}
module.exports = Database
