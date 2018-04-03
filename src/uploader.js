const fs = require('fs')
const path = require('path')
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

if(process.argv.length !== 4) return printUsage()

const server = process.argv[2]
const dirname = process.argv[3]
uploadFiles(dirname)

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

function uploadFiles(dirname) {
    fs.readdirSync(dirname)
        .filter(onlyMP3Files)
        .map((filename)=>uploadFile(path.join(dirname,filename)))
}

function uploadFile(filepath) {
    console.log("uploading the file",filepath)
    const url = `${server}api/songs/upload/some-file`
    console.log(`uploading ${url}`)
    const xhr = new XMLHttpRequest();
    xhr.addEventListener('load',() => {
        console.log("loaded",xhr.responseText)
    })
    xhr.addEventListener('error',()=>{
        console.log("error")
    })
    xhr.open('POST',url)
    xhr.send(fs.readFileSync(filepath))
}

