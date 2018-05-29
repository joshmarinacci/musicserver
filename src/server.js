const cors = require('cors')
const bodyParser = require('body-parser')
const fs = require('fs')
const paths = require('path')
const express = require('express')
const path = require('path')
const UPLOADS_DIR = path.join(process.cwd(),"uploads")
const TEMP_DIR = path.join(process.cwd(),"tmp")
const DB_FILE = path.join(process.cwd(),'music.db')
const ARTWORK_DIR = path.join(process.cwd(),'artwork2')
const Database = require('./database')
const db = new Database({filename:DB_FILE, autoload:true})
const PORT = 19872;

//create app
const app = express();
//make json formatting of REST APIs be pretty
app.set("json spaces",4);
//turn on CORS
app.use(cors({origin:true}));
//assume all bodies will be JSON and parse them automatically
app.use(bodyParser.json());

if(!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR)
if(!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR)
if(!fs.existsSync(ARTWORK_DIR)) fs.mkdirSync(ARTWORK_DIR)

function requestToFile(req,filePath) {
    return new Promise((resolve,reject)=>{
        const file = fs.createWriteStream(filePath, {encoding: 'binary'});
        file.on('finish',()=>{
            resolve(filePath)
        })
        req.on('data', function(chunk) {
            file.write(chunk);
        });
        req.on('end', function() {
            file.end();
        });
    });
}

app.get('/api/artists/', (req,res) =>
    db.findPromise({type:'artist', deleted: { $ne:true}},{name:1}).then(docs=>res.json(docs)))

app.get('/api/artists/:artistid', (req,res) =>
    db.findPromise({type: 'artist', _id:req.params.artistid}).then(doc=>res.json(doc)))

app.get('/api/artists/:artistid/albums', (req,res) =>
    db.findPromise({type: 'album', artist:req.params.artistid, deleted: { $ne:true}},{name:1})
        .then(docs=>res.json(docs)))

app.post('/api/artists/:artistid/delete', (req,res) => {
    console.log("deleting the artist with id",req.params.artistid)
    db.updatePromise({type:'artist', _id:req.params.artistid},{deleted:true}).then(count => {
        return res.json({status:'success',deleted:count})
    })
})

app.get('/api/artists/:artistid/albums/:albumid', (req,res) =>
    db.findPromise({type: 'album', _id:req.params.albumid}).then(docs=>res.json(docs)))

app.get('/api/artists/:artistid/albums/:albumid/songs', (req,res) =>
    db.findPromise({type: 'song', album:req.params.albumid, deleted: { $ne:true}})
        .then(docs => sortTracks(docs))
        .then(docs=>res.json(docs)))

app.get('/api/albums/', (req,res) =>
    db.findPromise({type: 'album', deleted: { $ne:true}}).then(docs=>res.json(docs)))

app.get('/api/albums/:albumid/songs', (req,res) =>
    db.findPromise({type: 'song', album:req.params.albumid, deleted: { $ne:true}})
        .then(docs => sortTracks(docs))
        .then(docs=>res.json(docs)))

app.post('/api/albums/:albumid/delete', (req,res) => {
    console.log("deleting the album with id",req.params.albumid)
    db.updatePromise({type:'album', _id:req.params.albumid},{deleted:true}).then(count => {
        return res.json({status:'success',deleted:count})
    })
})

app.post('/api/albums/:albumid/update', (req,res) =>
    db.updatePromise({type:'album', _id:req.params.albumid},req.body)
        .then((docs)=> res.json({status:'success', song:docs[0]}))
        .catch((err)=> res.json({status:'failure', message: err.toString()})))

app.get('/api/albums/:albumid/info',(req,res) => {
    db.findPromise({type:'album', _id:req.params.albumid}).then(docs=>res.json(docs))
})

app.post('/api/artwork/upload/:ofile', (req,res) => {
    console.log("uploading artwork")
    console.log("the original file name is",req.params.ofile)
    const ofile = req.params.ofile
    const ext = ofile.substring(ofile.lastIndexOf('.')+1)
    const filePath = path.join(ARTWORK_DIR,Math.random()+'.'+ext)
    console.log("the filepath is",filePath)
    requestToFile(req,filePath)
        .then(fpath => db.insertArtwork(fpath))
        .then(artwork => res.json({status:'success', artwork:artwork}))
        .catch(e => res.json({status:'failure', message:""+e}))
})

app.post('/api/songs/upload/:originalFilename', function(req,res) {
    const filePath = path.join(TEMP_DIR,`${Math.random()}.mp3`)
    requestToFile(req,filePath)
        .then((fpath)=>{
            return db.insertSong(fpath)
        }).then((song)=>{
            if(song.isDuplicate) {
                console.log("this song is a duplicate. deleting it",song.path);
                fs.unlinkSync(song.path)
                return res.json({status:'failure', message:'duplicate song', song:song})
            }
            console.log('not duplicate')
            return res.json({status:'success', song:song})
        }).catch((e)=>{
            console.log("problem",e);
            res.json({status:'failure', message: e});
        });
});

app.get("/api/songs/getinfo/:id",(req,res)=> {
    db.findPromise({type:'song', _id:req.params.id})
        .then((docs)=> {
            if (docs.length <= 0)
                return res.json({status: 'failure', message: "could not find the song"});
            const song = docs[0]
            res.json(song)
        })
        .catch((err)=>{
            console.log("sending failure",err)
            res.json({status:'failure', message: err.toString()});
        })
})

app.get('/api/artwork/:id',(req,res)=>{
    db.findPromise({type:'artwork',_id:req.params.id}).then(docs => {
        console.log("got the docs",docs)
        try {
            res.setHeader("Content-Type", docs[0].format)
            res.sendFile(docs[0].path)
        } catch (err) {
            console.log("sending failure",err)
            res.json({status:'failure', message: err.toString()});
        }
    })
})
app.get("/api/songs/getfile/:id",(req,res)=> {
    db.findPromise({type:'song', _id:req.params.id})
        .then(docs =>{
            if(docs.length <= 0) return res.json({status:'failure', message: "could not find the song"});
            const song = docs[0]
            res.type(song.mimeType);
            res.sendFile(song.path)
        })
        .catch((err)=>{
            console.log("sending failure",err)
            res.json({status:'failure', message: err.toString()});
        })
});

app.post('/api/songs/update/:id', function(req,res) {
    console.log("updating",req.params.id,'with',req.body);
    db.updatePromise({type:'song', _id:req.params.id},req.body).then((docs)=>{
        return res.json({status:'success', song:docs[0]})
    }).catch((err)=>{
        console.log("sending failure",err)
        res.json({status:'failure', message: err.toString()});
    })
});

app.post('/api/songs/checkhash', function(req,res) {
    db.findPromise({type:'song',hash:req.body.hash})
        .then(docs=> res.json({duplicate: (docs.length >= 1)}))
})

app.post('/api/songs/delete', (req,res)=>{
    console.log("deleting songs",req.body)
    const query = {
        type:'song',
        _id:{ $in:req.body}
    }
    db.updatePromise(query,{deleted:true}).then(count=>{
        return res.json({status:'success', deleted:count})
    }).catch((err)=>{
        console.log("sending failure",err)
        res.json({status:'failure', message: err.toString()});
    })
})

app.get('/api/songs/', (req,res) => db.findAllSongs()
        .then(docs => sortTracks(docs))
        .then(docs=>res.json(docs)))


app.get('/api/info', (req,res) => {
    db.findPromise({type: 'song'})
        .then( docs => {
            const size = docs.reduce(((a,b)=> a + b.fileSizeBytes),0)
            res.json({songsCount:docs.length, fileSizeBytes:size})
        })
})

app.listen(PORT, () => console.log(`
    music server http://localhost:${PORT}/ 
    music dir ${UPLOADS_DIR} 
    database  ${DB_FILE}`))




function sortTracks(docs) {
    docs = docs.slice()
    docs.sort((A,B)=> trackPrefix(A.track) - trackPrefix(B.track))
    return docs
}

function trackPrefix(str) {
    if(!str.indexOf) return str
    let n = str.indexOf('/')
    return (n>=0)?str.substring(0,n):str
}

db.fixPicturesToArtwork()