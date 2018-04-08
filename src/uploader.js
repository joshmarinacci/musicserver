const fs = require('fs')
const path = require('path')
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest
const crypto = require('crypto')

    if(process.argv.length !== 4) return printUsage()

const server = process.argv[2]
const dirname = process.argv[3]

const files = generateFileList(dirname)
console.log("file list is",files)
uploadFiles(files).then(()=>{
    console.log("totally done")
}).catch((e)=>{
    console.log('error',e)
})

function generateFileList(dir) {
    let finalFiles = []
    fs.readdirSync(dir).forEach((fname)=>{
        const fpath = path.join(dir,fname)
        if(onlyMP3Files(fpath)) finalFiles.push(fpath)
        if(fs.statSync(fpath).isDirectory())  finalFiles = finalFiles.concat(generateFileList(fpath))
    })
    return finalFiles
}

function printUsage() {
    console.log(`
Uploader: uploads a directory of files to the specified server
Usage:
   node src/uploader <serveraddress> <dirname>
Example:
   node src/uploader http://localhost:9872/ ~/Music/iTunes/iTunes\\ Media/Music/Adele/25
`)
}

function onlyMP3Files(name) {
    return (name.indexOf(".mp3")>0)
}

function uploadFiles(files) {
    let prom = Promise.resolve()
    files.forEach((filename)=> prom = prom.then(() => uploadFile(filename)))
    return prom
}

function uploadFile(filepath) {
    return generateHash(filepath)
        .then((hash) => {
            return verifyNotDuplicate(filepath, hash)
                .then((resp) => {
                    // console.log("got the response",resp)
                    if (resp.duplicate === false) {
                        console.log("not a duplicate. really uploading",filepath)
                        return reallyUploadFile(filepath).then((result)=>{
                            // console.log("result",result)
                            if(result.status === 'failure') {
                                console.log(`uploading ${filepath} failed`)
                                console.log("upload got the result",result)
                            }
                        })
                    } else {
                        // console.log("it's a duplicate. skipping")
                    }
                })
        }).catch((err)=>{
            console.log("error happened",err)
        })
}

function reallyUploadFile(filepath) {
    return new Promise((res,rej)=>{
        const url = `${server}api/songs/upload/some-file`
        const xhr = new XMLHttpRequest();
        xhr.addEventListener('load', ()  => res(JSON.parse(xhr.responseText)))
        xhr.addEventListener('error',(e) => rej(xhr.responseText))
        xhr.open('POST',url)
        xhr.send(fs.readFileSync(filepath))
    })
}

function verifyNotDuplicate(filepath, hash) {
    return new Promise((res,rej)=>{
        const url = `${server}api/songs/checkhash/`
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


