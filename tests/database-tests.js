const test = require('tape')
const fs = require('fs')
const path = require('path')

const DB = require('../src/database')

function onlyMP3Files(name) {
    return (name.indexOf(".mp3")>0)
}


test('two songs, one artist',(t)=> {
    const DIR = `/Users/josh/Music/iTunes/iTunes Media/Music/John Mayer/Paradise Valley/`
    const db = new DB()
    const files = fs.readdirSync(DIR)
        .filter(onlyMP3Files)
    let prom = Promise.resolve()
    files.forEach((file)=>{
        prom = prom.then(()=>db.insertSong(path.join(DIR,file)))
    })
    prom.then(()=>{
        console.log("done with upload. total song count should be. total artist count should be 1. total album count should be 1")
        return db.getAllSongs()
    }).then((songs)=>{
        console.log("song count is",songs.length)
    }).then(()=>{
        return db.getAllAlbums()
    }).then((albums)=>{
        console.log("album count is",albums.length)
        t.equals(albums.length,1)
    }).then(()=>{
        return db.getAllArtists()
    }).then((albums)=>{
        console.log("artist count is",albums.length)
    }).then(() =>{
        t.end()
    }).catch((e)=>{
        console.log("error happened",e)
        t.fail()
    })
})


test('same song twice', (t) => {
    const SONG = '/Users/josh/Music/iTunes/iTunes Media/Music/John Mayer/Paradise Valley/01 Wildfire.mp3'
    const db = new DB()
    Promise.resolve()
        .then(()=>{
            console.log("inserting the song",SONG)
            return db.insertSong(SONG)
        })
        .then((song)=>{
            console.log("result of previous song",song)
            t.equal(song.isDuplicate,undefined)
            return db.insertSong(SONG)
        })
        .then((song)=>{
            console.log("result of previous song",song)
            t.equal(song.isDuplicate,true)
            t.end()
        }).catch((e)=>{
            console.log("error happened",e)
            t.fail()
        })
})

function runFunctionPromisesSequentially(proms) {
    console.log("running promises sequentially")
    return new Promise((res,rej)=>{
        proms.reduce(function(cur,next) {
            if(cur.then) return cur.then(next)
            return cur().then(next)
        }).then(()=>{
            console.log("done with all promises")
        })
    })
}
