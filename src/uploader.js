const fs = require('fs')
const path = require('path')
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

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
    return new Promise((res,rej)=>{
        const url = `${server}api/songs/upload/some-file`
        const xhr = new XMLHttpRequest();
        xhr.addEventListener('load',() => {
            res(xhr.responseText)
        })
        xhr.addEventListener('error',(e)=>{
            rej(xhr.responseText)
        })
        xhr.open('POST',url)
        xhr.send(fs.readFileSync(filepath))
    })
}

