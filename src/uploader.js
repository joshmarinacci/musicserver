const fs = require('fs')
const path = require('path')
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest
const crypto = require('crypto')
const scanner = require('./scanner')

function calculateOptions(){
    let args = process.argv.slice(2)
    let opts = args.filter(arg => arg.indexOf('--')===0)
    let rest = args.filter(arg => arg.indexOf('--')===-1)

    let options = {
        force:false,
        server:'https://music.josh.earth/'
    }

    opts.forEach(opt=>{
        // console.log("processing",opt)
        const parts = opt.split('=')
        if(parts.length !== 2) {
            console.log("invalid option",opt)
            process.exit(-1)
        }
        options[parts[0].substring(2)] = parts[1]
        // console.log("setting",parts[0],parts[1])
    })

    if(typeof options.force === 'string') {
        options.force = options.force.toLowerCase() === 'true'
    }

    options.dirs = rest
    return options
}

const options = calculateOptions()


console.log(`scanning dirs = ${options.dirs}`)
console.log("using options",options)

if(options.info) return printServerInfo(options.server).then((info)=>console.log("info",info))
if(options.dirs.length < 1) return printUsage()

const files = generateFileList(options.dirs)
const failed = []
const duplicates = []
const uploaded = []
console.log(`uploading ${files.length} files`)

uploadFiles(files).then(()=>{
    console.log("=========")
    console.log(`uploaded   ${uploaded.length}`)
    console.log(`duplicates ${duplicates.length}`)
    if(failed.length > 0) {
        console.log(`failed to upload ${failed.length}`)
        console.log(failed.join("\n"))
    }
}).catch((e)=>{
    console.log('error',e)
})

function generateFileList(dirs) {
    let finalFiles = []
    dirs.forEach((dir) => {
        if (skip(dir)) return
        if (onlyMP3Files(dir)) finalFiles.push(dir)
        if(fs.statSync(dir).isDirectory()) {
            const files = fs.readdirSync(dir).map((file) => path.join(dir,file))
            finalFiles = finalFiles.concat(generateFileList(files))
        }
    })
    return finalFiles
}

function printUsage() {
    console.log(`
Uploader: uploads a directory of files to the specified server
Usage:
   node src/uploader <dirname>
Example:
   node src/uploader ~/Music/iTunes/iTunes\\ Media/Music/Adele/25
`)
}

function onlyMP3Files(name) {
    return (name.toLowerCase().indexOf(".mp3")>0)
}

function skip(name) {
    if(name.indexOf('.DS_Store') >=0) return true
    if(name.indexOf('.AppleDouble')>=0) return true
    return false
}

function uploadFiles(files) {
    let prom = Promise.resolve()
    files.forEach((filename)=> prom = prom.then(() => uploadFile(filename)))
    return prom
}

function checkFilesize(path) {
    return function(hash) {
        return new Promise((res,rej)=>{
            fs.stat(path,(err,info)=>{
                // console.log("the file info is",info)
                if(err) return rej(hash)
                if(info.size === 0) return rej(new Error(`the file ${path} is zero bytes`))
                return res(hash)
            })
        })
    }
}

function uploadFile(filepath) {
    return generateHash(filepath)
        .then(checkFilesize(filepath))
        .then((hash) => verifyNotDuplicate(filepath, hash))
        .then((resp) => {
            if(resp.duplicate === true) {
                console.log(`skipping  ${filepath}`)
                duplicates.push(filepath)
                return
            }
            return scanner.scanFile(filepath,null)
                .then(checkArtwork)
                .then(go => {
                    if (!go) return
                    return reallyUploadFile(filepath).then((result) => {
                        if (result.status === 'failure') {
                            console.log(`FAILURE uploading ${filepath}`, result)
                            failed.push(filepath)
                        } else {
                            if (!result.song.picture) console.log('WARNING: no picture for song', result.song)
                            uploaded.push(filepath)
                        }
                    })
            })
        }).catch((err)=>{
            console.log("error happened",err)
        })
}

function checkArtwork(song) {
    console.log("song is",song)
    if(!song.picture) {
        console.log(`artwork is missing. skipping ${song.path}`)
        if(options.force) {
            console.log("uploading anyway")
            return true
        } else {
            return false
        }
    }
}

function reallyUploadFile(filepath) {
    return new Promise((res,rej)=>{
        console.log("uploading",filepath)
        const url = `${options.server}api/songs/upload/some-file`
        const xhr = new XMLHttpRequest();
        xhr.addEventListener('load', ()  => res(JSON.parse(xhr.responseText)))
        xhr.addEventListener('error',(e) => rej(xhr.responseText))
        xhr.open('POST',url)
        xhr.send(fs.readFileSync(filepath))
    })
}

function verifyNotDuplicate(filepath, hash) {
    return new Promise((res,rej)=>{
        const url = `${options.server}api/songs/checkhash/`
        const xhr = new XMLHttpRequest();
        xhr.addEventListener('load',() => {
            if(xhr.status === 400 || xhr.status === 404) return rej(xhr.responseText)
            res(JSON.parse(xhr.responseText))
        })
        xhr.addEventListener('error',(e)=>rej(xhr.responseText))
        xhr.open('POST',url)
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify({hash:hash}))
    })
}

function generateHash(filepath) {
    return new Promise((res,rej)=> {
        const hash = crypto.createHash('md5')
        const stream = fs.createReadStream(filepath);
        stream.on('data', (data) => hash.update(data, 'utf8'))
        stream.on('end',  () => res(hash.digest('hex')))
    })
}

function printServerInfo(server) {
    return new Promise((res,rej)=>{
        const url = `${server}api/info`
        console.log("url = ", url)
        const xhr = new XMLHttpRequest();
        xhr.addEventListener('load',() => {
            if(xhr.status === 400 || xhr.status === 404) return rej(xhr.responseText)
            res(JSON.parse(xhr.responseText))
        })
        xhr.addEventListener('error',(e)=>rej(xhr.responseText))
        xhr.open('GET',url)
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send()
    })
}