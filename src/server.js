const cors = require('cors')
const bodyParser = require('body-parser')
const fs = require('fs')
const express = require('express')
const path = require('path')
const UPLOADS_DIR = path.join(process.cwd(),"uploads")
const TEMP_DIR = path.join(process.cwd(),"tmp")
// const Datastore = require('nedb')
const DB_FILE = path.join(process.cwd(),'music.db')
const Database = require('./database')
const db = new Database({filename:DB_FILE, autoload:true})
const PORT = 9872;

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

function initDB() {
    db.insert({
        type:'artist',
        name:'Adele'
    }, (err,artist)=>{
        console.log("inserted",artist)
        db.insert({
            type:'album',
            name:'25',
            artist:artist._id
        }, (err,album)=>{
            console.log('inserted',album)
            db.insert({
                type:'song',
                album:album._id,
                name:'Hello',
                mimeType:'audio/mp3',
                path:'/Users/josh/Music/iTunes/iTunes Media/Music/Adele/25/01 Hello.mp3'
            },(err,song) => {
                console.log("inserted",song)
            })
        })
    })
}

// initDB()

function requestToFile(req,filePath) {
    return new Promise((resolve,reject)=>{
        console.log("uploading to the path",filePath)
        const file = fs.createWriteStream(filePath, {encoding: 'binary'});
        req.on('data', function(chunk) {
            file.write(chunk);
        });
        req.on('end', function() {
            file.end();
            resolve(filePath);
        });
    });
}

app.get('/api/artists/', (req,res) => {
    db.find({type:'artist'}, (err,docs) => {res.json(docs)})
})

app.get('/api/artists/:artistid', (req,res) => {
    db.find({type: 'artist', _id:req.params.artistid}, (err,doc)=>{res.json(doc)})
})

app.get('/api/artists/:artistid/albums', (req,res) => {
    db.find({type: 'album', artist:req.params.artistid}, (err,docs)=>{res.json(docs)})
})

app.get('/api/artists/:artistid/albums/:albumid', (req,res) => {
    db.find({type: 'album', _id:req.params.albumid}, (err,docs)=>{res.json(docs)})
})

app.get('/api/artists/:artistid/albums/:albumid/songs', (req,res) => {
    db.find({type: 'song', album:req.params.albumid}, (err,docs)=>{res.json(docs)})
})

app.post('/api/songs/upload/:originalFilename', function(req,res) {
    console.log("getting an upload",req.params.originalFilename)
    const filePath = path.join(TEMP_DIR,`${Math.random()}.mp3`)
    requestToFile(req,filePath)
        .then((fpath)=>{
            console.log("uploaded to path. now need to process")
            return db.insertSong(fpath)
        }).then((song)=>{
            res.json({status:'success', song:song})
        }).catch((e)=>{
            console.log("problem" + e);
            res.json({status:'failure', message: e.toString()});
        });
});

app.get("/api/songs/getfile/:id",(req,res)=> {
    db.find({type:'song', _id:req.params.id},(err,docs)=>{
        if(err) {
            console.log("sending failure")
            res.json({status:'failure', message: err.toString()});
            return console.log(err)
        }
        if(docs.length <= 0) {
            console.log("sending failure")
            return res.json({status:'failure', message: "could not find the song"});
        }
        const song = docs[0]
        res.type(song.mimeType);
        res.sendFile(song.path)
    })
});

app.post('/api/songs/update/:id', function(req,res) {
    console.log("updating",req.params.id,'with',req.body);
    r.table(c.SONGS_TABLE).get(req.params.id).update(req.body).run(c.connection).then((status)=>{
        console.log("successfully updated",status);
        res.json({status: 'success', result:status});
    }).catch((e)=>{
        console.log("problem" + e);
        res.json({status:'failure', message: e.toString()});
    });
});

app.post('/api/songs/delete/:id', (req,res) => {
    console.log("deleting",req.params.id);
    r.table(c.SONGS_TABLE).get(req.params.id).delete().run(c.connection).then((status)=>{
        console.log("successfully deleted",status);
        res.json({status: 'success', result:status});
    }).catch((e)=>{
        console.log("problem" + e);
        res.json({status:'failure', message: e.toString()});
    });
});


app.listen(PORT, function() {
    console.log(`music server starting with port ${PORT} and uploads dir ${UPLOADS_DIR} and database ${DB_FILE}`)
});

