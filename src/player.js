// const Player = require('player')
// const player = new Player()
// player.add('http://localhost:9872/api/songs/getfile/doxdC2Q6EEiPOmbY?blah.mp3')

const inquirer = require('inquirer')
const Speaker = require('speaker')
const lame = require('lame')
const url = 'http://localhost:9872/api/songs/getfile/doxdC2Q6EEiPOmbY'
const http = require('http')
const fs = require('fs')
const request = require('request-promise')
const Player = require('player')

const BASE_URL = "http://localhost:9872/api"
// const BASE_URL = "http://joshy.org:19872/api"

const playlist = {

}

let player = null

request.get({url:BASE_URL+"/artists", json:true})
    .then((res)=>{
        const artists = res.map((a)=>{ return {name:a.name, value:a._id} })
        return inquirer
            .prompt([{name:'artist', type:'list',message:'choose artist',choices:artists}])
            .then((obj)=> {
                // console.log("loading albums", obj)
                return fetchAlbums(obj.artist)
                    .then((res) => {
                        const albums = res.map((al) => {
                            return {name: al.name, value: al._id}
                        })
                        return inquirer.prompt([{name: 'album', type: 'list', message: 'choose album', choices: albums}])
                    })
                    .then((res) => {
                        // console.log("final result", res.album,obj.artist)
                        playlist.album = res.album
                        playlist.artist = obj.artist
                        return fetchSongs(obj.artist,res.album)
                            .then((osongs)=>{
                                playlist.songs = osongs
                                // console.log("got hte osongs",osongs)
                                const songs = osongs.map((song)=>{
                                    return {name:song.title, value:song._id}
                                })
                                return inquirer.prompt([{name: 'song', type: 'list', message: 'choose song', choices: songs}])
                            })
                    })
            })

    })
    .then((final)=>{
        playlist.song = final.song
        console.log("final playlist is",playlist)
        const ids = playlist.songs.map((song)=>song._id)
        const n = ids.indexOf(final.song)
        const songs = playlist.songs.map((song)=>`${BASE_URL}/songs/getfile/${song._id}`)
        player = new Player(songs)
        player.on('playing',(item)=>{
            console.log("playing",item)
        })
        player.on('playend',(item) =>{
            console.log("done with playing",item)
        })
        player.on('error', function(err){
            console.log('error playing',err);
        });
        player.play()
    })
    .catch((e)=>{
        console.log("error",e)
    })

function fetchAlbums(artist) {
    const url = BASE_URL+"/artists/"+artist+"/albums/"
    console.log("getting",url)
    return request.get({url:url,json:true})
}

function fetchSongs(artist, album) {
    const url = BASE_URL+"/artists/"+artist+"/albums/"+album+"/songs"
    console.log("getting",url)
    return request.get({url:url,json:true})
}

function playSong(song_id) {
    return new Promise((res,rej)=>{
        const url = `${BASE_URL}/songs/getfile/${song_id}`
        const decoder = new lame.Decoder()
        decoder.on('finish',(f)=>{
            console.log("finished",f)
            res()
        })
        decoder.on('format',(f)=>console.log("format",f))
        decoder.on('end',(f)=>console.log("end",f))
        decoder.on('error',(f)=>console.log("decoder error"))
        const speaker = new Speaker()
        speaker.on('open',()=>console.log('opened'))
        speaker.on('flush',()=>console.log('flushed'))
        speaker.on('close',()=>console.log('closed'))
        request.get(url)
            .pipe(decoder)
            .pipe(speaker)

        // setTimeout(()=>{
        //     console.log("killing it")
        //     decoder.end()
        //     console.log("done")
        //     res(true)
        // },5000)
    })
}

