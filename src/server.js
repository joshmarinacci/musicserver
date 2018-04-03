const cors = require('cors')
const bodyParser = require('body-parser')
const fs = require('fs')
const express = require('express')
const path = require('path')
const UPLOADS_DIR = path.join(process.cwd(),"/uploads")
const Datastore = require('nedb')
const DB_FILE = path.join(process.cwd(),'music.db')
const db = new Datastore({filename:DB_FILE, autoload:true})
const PORT = 9872;

//create app
const app = express();
//make json formatting of REST APIs be pretty
app.set("json spaces",4);
//turn on CORS
app.use(cors({origin:true}));
//assume all bodies will be JSON and parse them automatically
app.use(bodyParser.json());

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

initDB()

function requestToFile(req,filePath) {
    return new Promise((resolve,reject)=>{
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

app.post('/api/songs/upload', function(req,res) {
    const filePath = path.join(UPLOADS_DIR,"sometempfile2"+Math.random());
    requestToFile(req,filePath).then(Scanner.scanFile).then(insertSong).then((status)=>{
        console.log("imported into the database",status);
        res.json({status: 'success', keys:status.generated_keys});
    }).catch((e)=>{
        console.log("problem" + e);
        res.json({status:'failure', message: e.toString()});
    });
});

app.get("/api/songs/getfile/:id",(req,res)=> {
    db.find({type:'song', _id:req.params.id},(err,docs)=>{
        const song = docs[0]
        res.type(song.mimeType)
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

