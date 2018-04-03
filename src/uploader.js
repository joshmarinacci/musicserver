console.log(process.argv)
const fs = require('fs');

if(process.argv.length !== 4) printUsage()

const server = process.argv[2]
const dirname = process.argv[3]
uploadFiles(dirname)

function printUsage() {
    console.log(`
Uploader: uploads a directory of files to the specified server
Usage:
   node src/uploader <serveraddress> <dirname>
Example:
   node src/uploader http://localhost:6688/ ~/Music/iTunes/iTunes\\ Media/Music/Adele/25
`)
}

function uploadFiles(dirname) { fs.readdirSync(dirname).filter(onlyMP3Files).map(uploadFile) }

function uploadFile(filename) {
    console.log("uploading the file",filename)
}

