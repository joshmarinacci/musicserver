// const Player = require('player')
// const player = new Player()
// player.add('http://localhost:9872/api/songs/getfile/doxdC2Q6EEiPOmbY?blah.mp3')

const inquirer = require('inquirer')
const Speaker = require('speaker')
const lame = require('lame')
const url = 'http://localhost:9872/api/songs/getfile/doxdC2Q6EEiPOmbY'
const http = require('http')
const request = require('request-promise')

const BASE_URL = "http://localhost:9872/api"
request.get({url:BASE_URL+"/artists", json:true})
    .then((res)=>{
        const artists = res.map((a)=>{ return {name:a.name, value:a._id} })
        return inquirer
            .prompt([{name:'artist', type:'list',message:'choose artist',choices:artists}])
            .then((obj)=> {
                console.log("loading albums", obj)
                return fetchAlbums(obj.artist)
                    .then((res) => {
                        const albums = res.map((al) => {
                            return {name: al.name, value: al._id}
                        })
                        return inquirer.prompt([{name: 'album', type: 'list', message: 'choose album', choices: albums}])
                    })
                    .then((res) => {
                        console.log("final result", res.album,obj.artist)
                        return fetchSongs(obj.artist,res.album)
                            .then((osongs)=>{
                                console.log("got hte osongs",osongs)
                                const songs = osongs.map((song)=>{
                                    return {name:song.title, value:song._id}
                                })
                                return inquirer.prompt([{name: 'song', type: 'list', message: 'choose song', choices: songs}])
                            })
                    })
            })

    })
    .then((final)=>{
        console.log("final answer is",final)
        return playSong(final.song)
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
    const url = `${BASE_URL}/songs/getfile/${song_id}`
    request.get(url)
        .pipe(new lame.Decoder())
        .on('format', console.log)
        .pipe(new Speaker())
}

