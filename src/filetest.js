const id3 = require('jsmediatags')
const file = process.argv[2]
// console.log("processing the file",file);
new id3.Reader(file)
    .setTagsToRead(["title", "artist"])
    .read({
    onSuccess: function (info) {
        console.log("success", info)
        // resolve(info)
    },
    onError: function (e) {
        console.log("error",JSON.stringify(e))
        // reject(e)
    }
})
